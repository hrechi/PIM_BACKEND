from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import numpy as np, joblib, json

app = FastAPI(title="PastureAI V1")

# Chargement des modèles au démarrage
iso_forest = joblib.load("iso_forest.pkl")
xgb_model  = joblib.load("xgb_model.pkl")
le         = joblib.load("label_encoder.pkl")
with open("config.json") as f:
    config = json.load(f)
FEATURES = config["feature_cols"]
PHYSIO   = config.get("physio", {
    "temp_mean": 38.7, "hr_mean": 65, "activity_mean": 45
})

# ── Descriptions des pathologies (issues du notebook) ────────────────────────
DISEASE_INFO = {
    "mammite": {
        "label":       "Mastitis",
        "description": "Mammary gland infection. Characterized by elevated temperature, moderate tachycardia, and reduced activity.",
        "symptoms":    ["Elevated temperature (+0.9°C)", "Tachycardia (+12 bpm)", "Reduced activity (-25%)", "Increased lying time"],
        "urgency":     "Veterinary examination within 24h",
        "color":       "#E74C3C",
    },
    "fievre": {
        "label":       "Fever / Infection",
        "description": "Bacterial or viral fever. Strong temperature rise with significant tachycardia and marked lethargy.",
        "symptoms":    ["High fever (+1.8°C)", "Severe tachycardia (+20 bpm)", "Marked lethargy (-40%)", "Prolonged lying"],
        "urgency":     "Immediate veterinary consultation",
        "color":       "#E67E22",
    },
    "boiterie": {
        "label":       "Lameness",
        "description": "Locomotor pathology (claw disease). Detected by accelerometer asymmetry and reduced movement.",
        "symptoms":    ["Accelerometer asymmetry", "Reduced activity (-35%)", "Increased lying time (+3h)", "Slight temperature rise"],
        "urgency":     "Hoof examination within 48h",
        "color":       "#9B59B6",
    },
    "stress_thermique": {
        "label":       "Heat Stress",
        "description": "Environmental hyperthermia. Moderate temperature rise with increased heart rate.",
        "symptoms":    ["Moderate temperature rise (+1.1°C)", "Tachycardia (+15 bpm)", "Reduced activity (-20%)", "Increased water intake"],
        "urgency":     "Improve ventilation and cooling",
        "color":       "#F39C12",
    },
    "saine": {
        "label":       "Healthy",
        "description": "Animal shows normal physiological parameters.",
        "symptoms":    [],
        "urgency":     "No action required",
        "color":       "#27AE60",
    },
}

# ── Top features SHAP (ordre d'importance issu du notebook) ──────────────────
FEATURE_IMPORTANCE_ORDER = [
    "delta_temp_baseline",
    "temp_trend_6h",
    "delta_hr_baseline",
    "activity_drop_6h",
    "temp_mean_1h",
    "hr_mean_1h",
    "acc_asymmetry",
    "lying_pct_6h",
    "temp_std_6h",
    "activity_mean_1h",
]

FEATURE_LABELS = {
    "delta_temp_baseline":  "Temperature vs baseline",
    "temp_trend_6h":        "Temperature trend (6h)",
    "delta_hr_baseline":    "Heart rate vs baseline",
    "activity_drop_6h":     "Activity drop (6h)",
    "temp_mean_1h":         "Temperature (1h avg)",
    "hr_mean_1h":           "Heart rate (1h avg)",
    "acc_asymmetry":        "Gait asymmetry",
    "lying_pct_6h":         "Lying time (6h)",
    "temp_std_6h":          "Temperature variability",
    "activity_mean_1h":     "Activity score (1h)",
}

FEATURE_UNITS = {
    "delta_temp_baseline":  "°C",
    "temp_trend_6h":        "°C",
    "delta_hr_baseline":    "bpm",
    "activity_drop_6h":     "pts",
    "temp_mean_1h":         "°C",
    "hr_mean_1h":           "bpm",
    "acc_asymmetry":        "",
    "lying_pct_6h":         "%",
    "temp_std_6h":          "°C",
    "activity_mean_1h":     "pts",
}

FEATURE_NORMALS = {
    "delta_temp_baseline":  (0.0,   "< +0.5°C"),
    "temp_trend_6h":        (0.0,   "< +0.3°C"),
    "delta_hr_baseline":    (0.0,   "< +5 bpm"),
    "activity_drop_6h":     (0.0,   "< 5 pts"),
    "temp_mean_1h":         (38.7,  "38.0–39.5°C"),
    "hr_mean_1h":           (65.0,  "50–80 bpm"),
    "acc_asymmetry":        (0.05,  "< 0.15"),
    "lying_pct_6h":         (45.0,  "30–60%"),
    "temp_std_6h":          (0.3,   "< 0.5°C"),
    "activity_mean_1h":     (45.0,  "30–70 pts"),
}


def build_explanation(req_dict: dict, disease: str, confidence: float,
                      anomaly_raw: float, is_anomaly: int) -> dict:
    """
    Génère l'explication complète du diagnostic :
    - Valeurs des capteurs vs baseline
    - Indicateurs déclencheurs (top 5 features anormales)
    - Recommandation vétérinaire
    - Résumé textuel
    """
    info = DISEASE_INFO.get(disease, DISEASE_INFO["saine"])

    # ── Indicateurs capteurs ──────────────────────────────────────────────────
    sensor_readings = {
        "temperature":    round(req_dict.get("temp_mean_1h", PHYSIO["temp_mean"]), 2),
        "heart_rate":     round(req_dict.get("hr_mean_1h", PHYSIO["hr_mean"]), 1),
        "activity_score": round(req_dict.get("activity_mean_1h", PHYSIO["activity_mean"]), 1),
        "delta_temp":     round(req_dict.get("delta_temp_baseline", 0), 2),
        "delta_hr":       round(req_dict.get("delta_hr_baseline", 0), 1),
        "activity_drop":  round(req_dict.get("activity_drop_6h", 0), 1),
        "lying_pct_6h":   round(req_dict.get("lying_pct_6h", 45), 1),
        "acc_asymmetry":  round(req_dict.get("acc_asymmetry", 0.05), 4),
    }

    # ── Top features anormales (triggers) ────────────────────────────────────
    triggers = []
    for feat in FEATURE_IMPORTANCE_ORDER[:8]:
        val = req_dict.get(feat)
        if val is None:
            continue
        normal_val, normal_range = FEATURE_NORMALS[feat]
        deviation = abs(val - normal_val)
        unit  = FEATURE_UNITS[feat]
        label = FEATURE_LABELS[feat]

        # Seuils d'anomalie par feature
        thresholds = {
            "delta_temp_baseline":  0.5,
            "temp_trend_6h":        0.3,
            "delta_hr_baseline":    5.0,
            "activity_drop_6h":     8.0,
            "temp_mean_1h":         0.8,   # écart vs 38.7
            "hr_mean_1h":           10.0,  # écart vs 65
            "acc_asymmetry":        0.1,
            "lying_pct_6h":         15.0,  # écart vs 45%
        }
        threshold = thresholds.get(feat, 0.5)

        if deviation >= threshold:
            direction = "↑" if val > normal_val else "↓"
            triggers.append({
                "feature":      feat,
                "label":        label,
                "value":        round(val, 3),
                "unit":         unit,
                "normal_range": normal_range,
                "deviation":    round(deviation, 3),
                "direction":    direction,
                "severity":     "high" if deviation >= threshold * 2 else "medium",
            })

    # Trier par déviation décroissante
    triggers.sort(key=lambda x: x["deviation"], reverse=True)

    # ── Résumé textuel ────────────────────────────────────────────────────────
    temp  = sensor_readings["temperature"]
    hr    = sensor_readings["heart_rate"]
    act   = sensor_readings["activity_score"]
    dt    = sensor_readings["delta_temp"]
    dhr   = sensor_readings["delta_hr"]

    if disease == "saine" or not is_anomaly:
        summary = (
            f"All physiological parameters are within normal ranges. "
            f"Temperature {temp}°C, heart rate {hr:.0f} bpm, "
            f"activity {act:.0f}/100. No anomaly detected."
        )
    else:
        trigger_text = ", ".join([t["label"].lower() for t in triggers[:3]]) if triggers else "multiple parameters"
        summary = (
            f"{info['label']} suspected with {confidence:.0%} confidence. "
            f"Key indicators: {trigger_text}. "
            f"Temperature {temp}°C ({'+' if dt >= 0 else ''}{dt}°C vs baseline), "
            f"heart rate {hr:.0f} bpm ({'+' if dhr >= 0 else ''}{dhr:.0f} vs baseline), "
            f"activity {act:.0f}/100."
        )

    return {
        "disease_info":    info,
        "sensor_readings": sensor_readings,
        "triggers":        triggers[:5],   # top 5 déclencheurs
        "summary":         summary,
        "recommendation":  info["urgency"],
        "anomaly_score_pct": round(min(100, anomaly_raw * 50), 1),
    }


def _is_bovine(animal_type: Optional[str]) -> bool:
    if not animal_type:
        return True
    t = animal_type.strip().lower()
    return t in (
        "cow",
        "cattle",
        "vache",
        "bovin",
        "bovine",
        "dairy",
    )


def _physio_penalty(req_dict: dict) -> float:
    delta_temp = abs(req_dict.get("delta_temp_baseline", 0))
    delta_hr = abs(req_dict.get("delta_hr_baseline", 0))
    act_drop = max(0, float(req_dict.get("activity_drop_6h", 0)))
    return float(
        min(
            40,
            delta_temp * 12 + delta_hr * 0.8 + act_drop * 0.4,
        )
    )


def predict_non_bovine(req: "PredictRequest", req_dict: dict) -> dict:
    """
    Hors bovins : pas d'IsoForest / XGBoost bovin (domain shift).
    Score et alertes = seuils physiologiques vs baselines déjà calculées côté backend (par espèce).
    """
    physio_penalty = _physio_penalty(req_dict)
    health_score = round(float(np.clip(100 - physio_penalty, 20, 100)), 1)
    anomaly_score_norm = float(np.clip(physio_penalty * 2.5, 0, 100))

    if physio_penalty > 28:
        alert_level = "critical"
    elif physio_penalty > 14:
        alert_level = "medium"
    else:
        alert_level = "low"

    species = (req.animal_type or "unknown").strip()
    info = {
        "label": f"Surveillance — {species}",
        "description": (
            "Le modèle PastureAI (Isolation Forest + XGBoost) est entraîné sur des séries "
            "physiologiques de vaches laitières. Pour cette espèce, aucune étiquette de "
            "pathologie bovine n'est appliquée ; le score reflète uniquement l'écart aux "
            "références espèce (température, fréquence cardiaque, activité)."
        ),
        "symptoms": [],
        "urgency": "En cas de doute, consulter un vétérinaire adapté à l'espèce.",
        "color": "#607D8B",
    }

    sensor_readings = {
        "temperature": round(req_dict.get("temp_mean_1h", PHYSIO["temp_mean"]), 2),
        "heart_rate": round(req_dict.get("hr_mean_1h", PHYSIO["hr_mean"]), 1),
        "activity_score": round(
            req_dict.get("activity_mean_1h", PHYSIO["activity_mean"]), 1
        ),
        "delta_temp": round(req_dict.get("delta_temp_baseline", 0), 2),
        "delta_hr": round(req_dict.get("delta_hr_baseline", 0), 1),
        "activity_drop": round(req_dict.get("activity_drop_6h", 0), 1),
        "lying_pct_6h": round(req_dict.get("lying_pct_6h", 45), 1),
        "acc_asymmetry": round(req_dict.get("acc_asymmetry", 0.05), 4),
    }

    summary = (
        f"Espèce « {species} » : diagnostic par modèle bovin non utilisé. "
        f"Score {health_score}/100 basé sur les écarts aux normes physiologiques de l'espèce. "
        f"Pénalité agrégée {physio_penalty:.1f} pts."
    )

    explanation = {
        "disease_info": info,
        "sensor_readings": sensor_readings,
        "triggers": [],
        "summary": summary,
        "recommendation": info["urgency"],
        "anomaly_score_pct": round(anomaly_score_norm, 1),
    }

    result = {
        "animal_id": req.animal_id,
        "health_score": health_score,
        "alert_level": alert_level,
        "predicted_disease": None,
        "confidence": 0.0,
        "iso_score": 0.0,
        "all_probabilities": {"surveillance_non_bovine": 1.0},
        "explanation": explanation,
        "bovine_model_applied": False,
        "species_note": (
            "Modèle PastureAI bovin non appliqué — surveillance heuristique par espèce."
        ),
        "anomaly_score_norm": round(anomaly_score_norm, 1),
        "estrus": None,
    }

    # Détection œstrus pour femelles vache/mouton
    if req.check_estrus:
        result["estrus"] = detect_estrus(req_dict)

    return result


class PredictRequest(BaseModel):
    animal_id: str
    animal_type: str = "cow"
    temp_mean_1h: float
    temp_max_6h: float = 0
    temp_std_6h: float = 0
    temp_mean_24h: float = 0
    temp_trend_6h: float = 0
    hr_mean_1h: float
    hr_max_6h: float = 0
    hr_std_1h: float = 0
    hr_trend_6h: float = 0
    activity_mean_1h: float
    activity_mean_24h: float = 0
    activity_drop_6h: float = 0
    acc_magnitude: float = 9.8
    acc_asymmetry: float = 0.05
    lying_pct_6h: float = 45
    lying_pct_24h: float = 45
    delta_temp_baseline: float = 0
    delta_hr_baseline: float = 0
    # ── Estrus detection (femelles vache/mouton uniquement) ──────────────────
    check_estrus: bool = False


# ── Estrus detection heuristique (V3 PastureAI_Complet) ──────────────────────
# Signes physiologiques de l'œstrus :
#   - Hausse d'activité nocturne (+30–50% vs baseline)
#   - Légère hausse de température (+0.2–0.5°C)
#   - Légère hausse FC (+5–10 bpm)
#   - Baisse du temps couché (lying_pct_6h < 30%)
# Score composite → probabilité 0–1
def detect_estrus(req_dict: dict) -> dict:
    """
    Détection d'œstrus par score composite basé sur les features capteurs.
    Retourne estrus_probability (0–1) et estrus_window_hours (fenêtre estimée).
    """
    delta_temp   = req_dict.get("delta_temp_baseline", 0)
    delta_hr     = req_dict.get("delta_hr_baseline", 0)
    act_mean_1h  = req_dict.get("activity_mean_1h", 45)
    act_mean_24h = req_dict.get("activity_mean_24h", 45)
    lying_pct    = req_dict.get("lying_pct_6h", 45)
    act_drop     = req_dict.get("activity_drop_6h", 0)  # négatif = hausse d'activité

    # Hausse d'activité récente (signe principal de l'œstrus)
    activity_surge = max(0, act_mean_1h - act_mean_24h)  # positif = plus actif récemment

    # Score composite (0–100)
    score = 0.0

    # Hausse d'activité : poids fort (40 pts max)
    if activity_surge >= 20:
        score += 40
    elif activity_surge >= 10:
        score += 20
    elif activity_surge >= 5:
        score += 10

    # Légère hausse de température (20 pts max)
    if 0.2 <= delta_temp <= 0.8:
        score += 20
    elif 0.1 <= delta_temp < 0.2:
        score += 8

    # Légère hausse FC (20 pts max)
    if 5 <= delta_hr <= 15:
        score += 20
    elif 2 <= delta_hr < 5:
        score += 8

    # Baisse du temps couché (20 pts max)
    if lying_pct < 25:
        score += 20
    elif lying_pct < 35:
        score += 10

    # act_drop négatif = hausse d'activité sur 6h (bonus 10 pts)
    if act_drop < -8:
        score += 10

    probability = round(float(np.clip(score / 100, 0.0, 1.0)), 3)

    # Fenêtre d'œstrus estimée : 12–18h si prob > 0.65, sinon 0
    window_hours = 0
    if probability >= 0.80:
        window_hours = 12
    elif probability >= 0.65:
        window_hours = 18

    return {
        "estrus_probability": probability,
        "estrus_window_hours": window_hours,
        "estrus_detected": probability >= 0.65,
        "estrus_score_detail": {
            "activity_surge": round(activity_surge, 1),
            "delta_temp": round(delta_temp, 2),
            "delta_hr": round(delta_hr, 1),
            "lying_pct_6h": round(lying_pct, 1),
        },
    }


@app.get("/health")
def health():
    return {
        "status":     "ok",
        "classes":    list(le.classes_),
        "n_features": len(FEATURES),
    }


@app.get("/herd-dashboard")
def herd_dashboard():
    """
    Endpoint pour dashboard temps réel du troupeau.
    Retourne statistiques agrégées + alertes actives.
    """
    # TODO: Implémenter avec cache Redis pour performance
    return {
        "total_animals": 0,
        "healthy": 0,
        "warning": 0,
        "critical": 0,
        "avg_health_score": 0,
        "top_alerts": [],
        "disease_distribution": {},
        "last_updated": datetime.now().isoformat(),
    }


@app.get("/animal/{animal_id}/history")
def get_animal_history(animal_id: str, days: int = 7):
    """
    Retourne l'historique de santé d'un animal sur X jours.
    À implémenter côté backend NestJS avec Prisma.
    """
    return {
        "animal_id": animal_id,
        "period_days": days,
        "health_scores": [],  # [{timestamp, score, alert_level}]
        "diseases_detected": [],
        "sensor_trends": {
            "temperature": [],
            "heart_rate": [],
            "activity": [],
        },
        "alerts_count": 0,
    }


@app.post("/debug")
def debug_predict(req: PredictRequest):
    """Retourne les valeurs brutes du modèle sans persistance — utile pour tester."""
    X = np.array([[
        req.temp_mean_1h, req.temp_max_6h, req.temp_std_6h,
        req.temp_mean_24h, req.temp_trend_6h,
        req.hr_mean_1h, req.hr_max_6h, req.hr_std_1h, req.hr_trend_6h,
        req.activity_mean_1h, req.activity_mean_24h, req.activity_drop_6h,
        req.acc_magnitude, req.acc_asymmetry,
        req.lying_pct_6h, req.lying_pct_24h,
        req.delta_temp_baseline, req.delta_hr_baseline,
    ]])
    anomaly_raw  = float(-iso_forest.score_samples(X)[0])
    is_anomaly   = int(iso_forest.predict(X)[0] == -1)
    proba        = xgb_model.predict_proba(X)[0]
    disease_idx  = int(np.argmax(proba))
    disease      = le.classes_[disease_idx]
    confidence   = float(proba[disease_idx])
    return {
        "input_features": req.dict(),
        "iso_forest": {"anomaly_raw": round(anomaly_raw, 4), "is_anomaly": is_anomaly},
        "xgboost": {
            "predicted": disease,
            "confidence": round(confidence, 4),
            "all_proba": {cls: round(float(p), 4) for cls, p in zip(le.classes_, proba)},
        },
    }


@app.post("/predict")
def predict(req: PredictRequest):
    req_dict = req.dict()

    if not _is_bovine(req.animal_type):
        return predict_non_bovine(req, req_dict)

    X = np.array([[
        req.temp_mean_1h, req.temp_max_6h, req.temp_std_6h,
        req.temp_mean_24h, req.temp_trend_6h,
        req.hr_mean_1h, req.hr_max_6h, req.hr_std_1h, req.hr_trend_6h,
        req.activity_mean_1h, req.activity_mean_24h, req.activity_drop_6h,
        req.acc_magnitude, req.acc_asymmetry,
        req.lying_pct_6h, req.lying_pct_24h,
        req.delta_temp_baseline, req.delta_hr_baseline,
    ]])

    # Isolation Forest — détection anomalie (score brut)
    anomaly_raw = float(-iso_forest.score_samples(X)[0])
    is_anomaly = int(iso_forest.predict(X)[0] == -1)
    # Normalisation type notebook / alerte temps réel (une seule observation)
    offset = float(getattr(iso_forest, "offset_", 0.0) or 0.0)
    anomaly_score_norm = float(
        np.clip((anomaly_raw - offset) * 50.0 + 50.0, 0.0, 100.0)
    )

    # XGBoost — classification maladie (classes bovines uniquement)
    proba = xgb_model.predict_proba(X)[0]
    disease_idx = int(np.argmax(proba))
    disease = le.classes_[disease_idx]
    confidence = float(proba[disease_idx])

    physio_penalty = _physio_penalty(req_dict)

    # ── Niveau d'alerte (scénario notebook : anomalie + confiance maladie) ──
    if disease == "saine" and anomaly_score_norm < 60 and not is_anomaly:
        alert_level = "low"
    elif anomaly_score_norm > 70 or (disease != "saine" and confidence > 0.6):
        alert_level = "critical"
    elif (
        anomaly_score_norm > 55
        or is_anomaly
        or (disease != "saine" and confidence > 0.4)
    ):
        alert_level = "medium"
    else:
        alert_level = "low"

    # ── Score de santé 0–100 (100 = meilleure santé) ─────────────────────────
    # Bug 2 fix — zones sans chevauchement :
    #   sain   : [65, 100]
    #   malade : [0,  55]
    #   zone 55-65 → "Surveillance recommandée" (géré côté NestJS/Flutter)
    if disease == "saine":
        health_score = float(
            np.clip(
                100.0
                - anomaly_score_norm * 0.82
                - physio_penalty * 0.35,
                65.0,   # minimum sain = 65
                100.0,
            )
        )
    else:
        health_score = float(
            np.clip(
                100.0
                - anomaly_score_norm * 0.55
                - confidence * 38.0
                - physio_penalty * 0.3,
                0.0,
                55.0,   # maximum malade = 55
            )
        )

    health_score = round(health_score, 1)

    explanation = build_explanation(
        req_dict, disease, confidence, anomaly_raw, is_anomaly
    )
    explanation["anomaly_score_pct"] = round(anomaly_score_norm, 1)

    result = {
        "animal_id": req.animal_id,
        "health_score": health_score,
        "alert_level": alert_level,
        "predicted_disease": disease if disease != "saine" else None,
        "confidence": round(confidence, 3),
        "iso_score": round(anomaly_raw, 3),
        "all_probabilities": {
            cls: round(float(p), 3)
            for cls, p in zip(le.classes_, proba)
        },
        "explanation": explanation,
        "bovine_model_applied": True,
        "species_note": None,
        "anomaly_score_norm": round(anomaly_score_norm, 1),
        "estrus": None,
    }

    # Détection œstrus pour femelles vache/mouton
    if req.check_estrus:
        result["estrus"] = detect_estrus(req_dict)

    return result

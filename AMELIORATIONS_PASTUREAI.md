# 🐄 Améliorations PastureAI — Feuille de Route

## ✅ Améliorations Implémentées

### 1. **Score de Vitalité Amélioré** ✅
- **Avant** : Formule simpliste `100 - anomaly * 50 - confidence * 30`
- **Après** : Score composite pondéré prenant en compte :
  - Anomalie (40%)
  - Confiance maladie (30%)
  - Écarts physiologiques (30%)
- **Impact** : Score plus précis et interprétable

### 2. **Nouveaux Endpoints Backend** ✅
- `GET /animal-health/history/:animalId` — Historique de santé avec tendances
- `GET /animal-health/herd-dashboard` — Dashboard troupeau temps réel
- **Impact** : Permet visualisations avancées dans le frontend

### 3. **Méthodes Service Ajoutées** ✅
- `getHealthHistory()` — Agrégation des alertes + capteurs par jour
- `getHerdDashboard()` — Statistiques troupeau (sains/warning/critical)
- **Impact** : Données structurées pour dashboards

---

## 🚀 Améliorations Prioritaires à Implémenter

### **PRIORITÉ 1 : Notifications Push en Temps Réel**

#### Problème
Actuellement, les alertes sont stockées en base mais pas envoyées aux utilisateurs.

#### Solution
```typescript
// src/animal-health/notification.service.ts
import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class HealthNotificationService {
  async sendAlert(userId: string, alert: {
    animalName: string;
    disease: string;
    level: 'medium' | 'critical';
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) return;

    const message = {
      notification: {
        title: `🚨 Alerte Santé — ${alert.animalName}`,
        body: `${alert.disease} détecté (${alert.level})`,
      },
      data: {
        type: 'HEALTH_ALERT',
        animalId: alert.animalName,
        disease: alert.disease,
      },
      token: user.fcmToken,
    };

    await admin.messaging().send(message);
  }
}
```

**Intégration** : Appeler dans `diagnose()` après création de `HealthAlert`.

---

### **PRIORITÉ 2 : Cache Redis pour Performance**

#### Problème
Chaque appel à `/herd-dashboard` fait des requêtes lourdes en base.

#### Solution
```typescript
// src/animal-health/animal-health.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

async getHerdDashboard(farmerId: string) {
  const cacheKey = `herd_dashboard:${farmerId}`;
  
  // Vérifier le cache (TTL 5 minutes)
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  // Calculer les stats
  const stats = await this.computeHerdStats(farmerId);
  
  // Mettre en cache
  await this.cacheManager.set(cacheKey, stats, 300_000); // 5 min
  
  return stats;
}
```

**Installation** :
```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-store
```

---

### **PRIORITÉ 3 : Détection Précoce Améliorée**

#### Problème
Le modèle détecte les maladies mais pas assez tôt (24-48h avant).

#### Solution
Ajouter un système d'alerte à 3 niveaux :

```python
# pastureai-ai/main.py
def calculate_early_warning_score(features: dict) -> dict:
    """
    Détecte les signaux précoces AVANT que la maladie soit confirmée.
    """
    # Calculer les vélocités (taux de changement)
    temp_velocity = features.get("temp_trend_6h", 0)
    hr_velocity = features.get("hr_trend_6h", 0)
    activity_velocity = features.get("activity_drop_6h", 0)
    
    # Score de risque précoce
    early_risk = (
        abs(temp_velocity) * 0.4 +
        abs(hr_velocity) / 10 * 0.3 +
        abs(activity_velocity) / 10 * 0.3
    )
    
    if early_risk > 0.7:
        return {"level": "WATCH", "risk": early_risk, "message": "Surveillance renforcée recommandée"}
    elif early_risk > 0.4:
        return {"level": "MONITOR", "risk": early_risk, "message": "Tendance à surveiller"}
    else:
        return {"level": "NORMAL", "risk": early_risk, "message": "Aucun signal précoce"}
```

**Intégration** : Ajouter `early_warning` dans la réponse `/predict`.

---

### **PRIORITÉ 4 : Baseline Adaptative par Animal**

#### Problème
Baseline fixe (38.7°C, 65 bpm) ne reflète pas la variabilité individuelle.

#### Solution
```typescript
// src/animal-health/baseline.service.ts
async updateBaseline(animalId: string) {
  // Récupérer les 30 derniers jours de données SAINES
  const healthyReadings = await this.prisma.sensorReading.findMany({
    where: {
      animalId,
      timestamp: { gte: new Date(Date.now() - 30 * 24 * 3600_000) },
    },
  });

  // Calculer les percentiles (5%, 50%, 95%)
  const temps = healthyReadings.map(r => r.temperature).filter(Boolean);
  const hrs = healthyReadings.map(r => r.heartRate).filter(Boolean);

  const baseline = {
    temp_p5: this.percentile(temps, 0.05),
    temp_median: this.percentile(temps, 0.5),
    temp_p95: this.percentile(temps, 0.95),
    hr_p5: this.percentile(hrs, 0.05),
    hr_median: this.percentile(hrs, 0.5),
    hr_p95: this.percentile(hrs, 0.95),
  };

  // Stocker dans une nouvelle table AnimalBaseline
  await this.prisma.animalBaseline.upsert({
    where: { animalId },
    create: { animalId, ...baseline },
    update: baseline,
  });

  return baseline;
}
```

**Migration Prisma** :
```prisma
model AnimalBaseline {
  id         String   @id @default(uuid())
  animalId   String   @unique
  animal     Animal   @relation(fields: [animalId], references: [id])
  temp_p5    Float
  temp_median Float
  temp_p95   Float
  hr_p5      Float
  hr_median  Float
  hr_p95     Float
  updatedAt  DateTime @updatedAt
}
```

---

### **PRIORITÉ 5 : Rapports Vétérinaires Automatiques**

#### Problème
Pas de rapport structuré pour le vétérinaire.

#### Solution
```typescript
// src/animal-health/report.service.ts
async generateVetReport(animalId: string, alertId: string) {
  const alert = await this.prisma.healthAlert.findUnique({
    where: { id: alertId },
    include: { animal: true },
  });

  const history = await this.getHealthHistory(animalId, '__cron__', 7);

  const report = {
    animal: {
      name: alert.animal.name,
      age: alert.animal.age,
      breed: alert.animal.breed,
      tag: alert.animal.tagNumber,
    },
    alert: {
      date: alert.alertTime,
      disease: alert.predictedDisease,
      confidence: `${(alert.confidence * 100).toFixed(1)}%`,
      anomaly_score: alert.anomalyScore,
    },
    recent_trends: history.sensor_trends.slice(-7),
    recommendations: this.getRecommendations(alert.predictedDisease),
  };

  // Générer PDF avec puppeteer ou envoyer par email
  return report;
}

private getRecommendations(disease: string): string[] {
  const recommendations = {
    mammite: [
      'Isoler l\'animal',
      'Prélèvement bactériologique',
      'Traitement antibiotique selon antibiogramme',
      'Surveillance température 2x/jour',
    ],
    fievre: [
      'Examen clinique complet',
      'Prise de sang (NFS, CRP)',
      'Antipyrétique si T > 40°C',
      'Réhydratation si nécessaire',
    ],
    boiterie: [
      'Examen podologique',
      'Parage si nécessaire',
      'Anti-inflammatoire',
      'Repos sur litière propre',
    ],
  };
  return recommendations[disease] || ['Consulter vétérinaire'];
}
```

---

### **PRIORITÉ 6 : Intégration Météo**

#### Problème
Stress thermique non détecté car pas de données météo.

#### Solution
```typescript
// src/weather/weather.service.ts
import axios from 'axios';

async getWeatherData(lat: number, lng: number) {
  const { data } = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather`,
    {
      params: {
        lat,
        lon: lng,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
    },
  );

  // Calculer l'index THI (Temperature-Humidity Index)
  const temp = data.main.temp;
  const humidity = data.main.humidity;
  const thi = (1.8 * temp + 32) - ((0.55 - 0.0055 * humidity) * (1.8 * temp - 26));

  return {
    temperature: temp,
    humidity,
    thi,
    stress_level: thi > 72 ? 'HIGH' : thi > 68 ? 'MODERATE' : 'LOW',
  };
}
```

**Intégration** : Ajouter `weather_thi` comme feature dans le modèle.

---

### **PRIORITÉ 7 : Dashboard Frontend (Flutter/Dart)**

#### Écrans à Créer

1. **Écran Troupeau** (`/herd-dashboard`)
   - Carte avec statut de chaque animal (vert/jaune/rouge)
   - Statistiques : X sains, Y en alerte, Z critiques
   - Graphique distribution des maladies

2. **Écran Détail Animal** (`/animal/:id`)
   - Score de vitalité (jauge circulaire)
   - Graphiques température, FC, activité (7 jours)
   - Historique des alertes
   - Bouton "Générer rapport vétérinaire"

3. **Écran Alertes** (`/alerts`)
   - Liste des alertes récentes
   - Filtres par niveau (critique/warning)
   - Bouton "Marquer comme traité"

#### Exemple Widget Flutter
```dart
// lib/widgets/health_score_gauge.dart
import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_gauges/gauges.dart';

class HealthScoreGauge extends StatelessWidget {
  final double score;

  const HealthScoreGauge({required this.score});

  @override
  Widget build(BuildContext context) {
    return SfRadialGauge(
      axes: [
        RadialAxis(
          minimum: 0,
          maximum: 100,
          ranges: [
            GaugeRange(startValue: 0, endValue: 40, color: Colors.red),
            GaugeRange(startValue: 40, endValue: 70, color: Colors.orange),
            GaugeRange(startValue: 70, endValue: 100, color: Colors.green),
          ],
          pointers: [
            NeedlePointer(value: score),
          ],
          annotations: [
            GaugeAnnotation(
              widget: Text(
                '${score.toStringAsFixed(1)}',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              angle: 90,
              positionFactor: 0.5,
            ),
          ],
        ),
      ],
    );
  }
}
```

---

## 📊 Métriques de Succès

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Recall (détection maladies) | 75% | 85% |
| Précision (alertes fondées) | 70% | 80% |
| Détection précoce (24-48h avant) | 40% | 70% |
| Temps de réponse API | 500ms | 200ms |
| Faux positifs / jour | 5 | 2 |

---

## 🛠️ Stack Technique Recommandée

### Backend
- **Cache** : Redis (via `@nestjs/cache-manager`)
- **Queue** : Bull (pour diagnostics asynchrones)
- **Monitoring** : Sentry + Prometheus

### Frontend
- **Charts** : `fl_chart` ou `syncfusion_flutter_charts`
- **State Management** : Riverpod ou Bloc
- **Notifications** : `firebase_messaging`

### IA
- **Monitoring** : MLflow pour tracking des modèles
- **Versioning** : DVC (Data Version Control)
- **Retraining** : Pipeline automatique mensuel

---

## 📅 Planning d'Implémentation

| Semaine | Tâche |
|---------|-------|
| S1 | Notifications push + Cache Redis |
| S2 | Baseline adaptative + Migration Prisma |
| S3 | Détection précoce améliorée |
| S4 | Dashboard frontend (écrans 1-3) |
| S5 | Rapports vétérinaires + Intégration météo |
| S6 | Tests + Optimisation + Documentation |

---

## 🎯 Résumé des Gains Attendus

1. **Détection précoce** : +30% de maladies détectées 24-48h avant
2. **Réduction faux positifs** : -60% grâce à baseline adaptative
3. **Engagement utilisateur** : +80% grâce aux notifications push
4. **Performance** : -60% temps de réponse grâce au cache
5. **Adoption vétérinaire** : +50% grâce aux rapports automatiques

---

**Auteur** : Équipe PastureAI  
**Date** : 2026-05-04  
**Version** : 1.0

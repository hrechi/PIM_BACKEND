import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fieldly';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


// ─── Pays ──────────────────────────────────────────────────────────────────
const COUNTRIES = [
    // Maghreb
    { code: 'TN', nameEn: 'Tunisia', nameFr: 'Tunisie', nameAr: 'تونس', vetAuthority: 'DGSV / OEP', oieRegion: 'AFRICA_NORTH', fmdZoneStatus: 'ENDEMIC_WITH_VAX', timezone: 'Africa/Tunis' },
    { code: 'MA', nameEn: 'Morocco', nameFr: 'Maroc', nameAr: 'المغرب', vetAuthority: 'ONSSA', oieRegion: 'AFRICA_NORTH', fmdZoneStatus: 'ENDEMIC_WITH_VAX', timezone: 'Africa/Casablanca' },
    { code: 'DZ', nameEn: 'Algeria', nameFr: 'Algérie', nameAr: 'الجزائر', vetAuthority: 'MATVET', oieRegion: 'AFRICA_NORTH', fmdZoneStatus: 'ENDEMIC_WITH_VAX', timezone: 'Africa/Algiers' },
    // Europe
    { code: 'FR', nameEn: 'France', nameFr: 'France', vetAuthority: 'DGAL / GDS France', oieRegion: 'EUROPE_WEST', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'Europe/Paris' },
    { code: 'BE', nameEn: 'Belgium', nameFr: 'Belgique', vetAuthority: 'SPF Santé / ARSIA', oieRegion: 'EUROPE_WEST', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'Europe/Brussels' },
    { code: 'DE', nameEn: 'Germany', nameFr: 'Allemagne', vetAuthority: 'BVL / Länder Vets', oieRegion: 'EUROPE_WEST', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'Europe/Berlin' },
    { code: 'NL', nameEn: 'Netherlands', nameFr: 'Pays-Bas', vetAuthority: 'NVWA', oieRegion: 'EUROPE_WEST', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'Europe/Amsterdam' },
    { code: 'ES', nameEn: 'Spain', nameFr: 'Espagne', vetAuthority: 'MAPA / CCAA', oieRegion: 'EUROPE_WEST', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'Europe/Madrid' },
    { code: 'IT', nameEn: 'Italy', nameFr: 'Italie', vetAuthority: 'Ministero della Salute', oieRegion: 'EUROPE_WEST', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'Europe/Rome' },
    // Amériques
    { code: 'US', nameEn: 'USA', nameFr: 'États-Unis', vetAuthority: 'USDA-APHIS', oieRegion: 'AMERICAS_NORTH', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'America/New_York' },
    { code: 'CA', nameEn: 'Canada', nameFr: 'Canada', vetAuthority: 'CFIA / ACIA', oieRegion: 'AMERICAS_NORTH', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'America/Toronto' },
    { code: 'BR', nameEn: 'Brazil', nameFr: 'Brésil', vetAuthority: 'MAPA / SDA', oieRegion: 'AMERICAS_SOUTH', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'America/Sao_Paulo' },
    { code: 'AR', nameEn: 'Argentina', nameFr: 'Argentine', vetAuthority: 'SENASA', oieRegion: 'AMERICAS_SOUTH', fmdZoneStatus: 'FREE_WITH_VAX', timezone: 'America/Argentina/Buenos_Aires' },
    { code: 'MX', nameEn: 'Mexico', nameFr: 'Mexique', vetAuthority: 'SENASICA / SADER', oieRegion: 'AMERICAS_CENTRAL', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'America/Mexico_City' },
    // Asie-Pacifique
    { code: 'AU', nameEn: 'Australia', nameFr: 'Australie', vetAuthority: 'DAFF / APVMA', oieRegion: 'ASIA_PACIFIC', fmdZoneStatus: 'FREE_WITHOUT_VAX', timezone: 'Australia/Sydney' },
    { code: 'IN', nameEn: 'India', nameFr: 'Inde', vetAuthority: 'DAHD / DADF', oieRegion: 'ASIA_PACIFIC', fmdZoneStatus: 'ENDEMIC_WITH_VAX', timezone: 'Asia/Kolkata' },
    { code: 'CN', nameEn: 'China', nameFr: 'Chine', vetAuthority: 'CADC / MOA', oieRegion: 'ASIA_PACIFIC', fmdZoneStatus: 'ENDEMIC_WITH_VAX', timezone: 'Asia/Shanghai' },
    { code: 'TR', nameEn: 'Turkey', nameFr: 'Turquie', vetAuthority: 'GKGM', oieRegion: 'MIDDLE_EAST', fmdZoneStatus: 'ENDEMIC_WITH_VAX', timezone: 'Europe/Istanbul' },
] as const;

// ─── Régions Argentine ───────────────────────────────────────────────────
const AR_REGIONS = [
    { code: 'AR-CENTRE-NORTH', name: 'Zone Centre-Nord + Cordón Fronterizo', fmdZoneStatus: 'FREE_WITH_VAX' as const, notes: 'FA OBLIGATOIRE — Plan SENASA — Zone libre avec vaccination reconnue WOAH' },
    { code: 'AR-PATAGONIA', name: 'Patagonie (Neuquén, Río Negro, Chubut, Santa Cruz, TdF)', fmdZoneStatus: 'FREE_WITHOUT_VAX' as const, notes: 'FA INTERDITE — Zone libre sans vaccination reconnue WOAH depuis 2002' },
];

// ─── Catalogue vaccins ───────────────────────────────────────────────────
const VACCINES = [
    // Multi-espèces majeures
    { code: 'FMD', nameFr: 'Fièvre Aphteuse', nameEn: 'Foot-and-Mouth Disease', targetSpecies: ['cow', 'sheep'], defaultIntervalDays: 180, isCoreVaccine: true },
    { code: 'LSD', nameFr: 'Dermatose Nodulaire', nameEn: 'Lumpy Skin Disease', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'PPR', nameFr: 'Peste Petits Ruminants', nameEn: 'PPR', targetSpecies: ['sheep'], defaultIntervalDays: 1095 },
    { code: 'BRUCELLA_AB', nameFr: 'Brucellose B.abortus (S19/RB51)', nameEn: 'Brucellosis Abortus', targetSpecies: ['cow'], defaultIntervalDays: 365, isCoreVaccine: true },
    { code: 'BRUCELLA_ML', nameFr: 'Brucellose B.melitensis (Rev-1)', nameEn: 'Brucellosis Melitensis', targetSpecies: ['sheep'], defaultIntervalDays: 365, isCoreVaccine: true },
    { code: 'ANTHRAX', nameFr: 'Charbon bactéridien', nameEn: 'Anthrax', targetSpecies: ['cow', 'sheep'], defaultIntervalDays: 365 },
    { code: 'CLAVELÉE', nameFr: 'Clavelée / Variole Ovine', nameEn: 'Sheep Pox', targetSpecies: ['sheep'], defaultIntervalDays: 365 },
    { code: 'RAGE', nameFr: 'Rage', nameEn: 'Rabies', targetSpecies: ['dog', 'horse', 'cow'], defaultIntervalDays: 365, isCoreVaccine: true },
    // Bovins spécialisés
    { code: 'FCO_3', nameFr: 'Bluetongue BTV-3', nameEn: 'Bluetongue serotype 3', targetSpecies: ['cow', 'sheep'], defaultIntervalDays: 365 },
    { code: 'FCO_8', nameFr: 'Bluetongue BTV-8', nameEn: 'Bluetongue serotype 8', targetSpecies: ['cow', 'sheep'], defaultIntervalDays: 365 },
    { code: 'MHE', nameFr: 'MHE / EHDV', nameEn: 'Epizootic Hemorrhagic Disease', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'IBR', nameFr: 'IBR / BHV-1', nameEn: 'Infectious Bovine Rhinotracheitis', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'BVD', nameFr: 'BVD / Diarrhée Virale Bovine', nameEn: 'Bovine Viral Diarrhea', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'IBR_BVD_4', nameFr: 'IBR+BVD+BRSV+PI3 (MLV 4-way)', nameEn: '4-way Modified Live Vaccine', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'CLOSTRI_7', nameFr: 'Clostridies 7-way', nameEn: '7-way Clostridial', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'LEPTO_5', nameFr: 'Leptospirose 5 sérovars', nameEn: 'Leptospirosis 5-way', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'LEPTO', nameFr: 'Leptospirose (L4)', nameEn: 'Leptospirosis L4', targetSpecies: ['dog', 'cow'], defaultIntervalDays: 365 },
    { code: 'PASTEU_BOV', nameFr: 'Pasteurellose bovine', nameEn: 'Bovine Pasteurellosis', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'PASTEU_OV', nameFr: 'Pasteurellose ovine', nameEn: 'Ovine Pasteurellosis', targetSpecies: ['sheep'], defaultIntervalDays: 365 },
    { code: 'ENTERO', nameFr: 'Entérotoxémie CD-T', nameEn: 'Enterotoxemia CD-T', targetSpecies: ['cow', 'sheep'], defaultIntervalDays: 365, isCoreVaccine: true },
    { code: 'FIEVRE_Q', nameFr: 'Fièvre Q (Coxiella)', nameEn: 'Q Fever', targetSpecies: ['sheep'], defaultIntervalDays: 365 },
    { code: 'DIARRHEE_NEO', nameFr: 'Diarrhée néonatale veau', nameEn: 'Neonatal Calf Diarrhea', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'BOTULISME', nameFr: 'Botulisme bovin', nameEn: 'Bovine Botulism', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    { code: 'RAGE_BOV', nameFr: 'Rage bovine (vampires)', nameEn: 'Bovine Rabies (Desmodus)', targetSpecies: ['cow', 'horse'], defaultIntervalDays: 365 },
    { code: 'BABESIOSE', nameFr: 'Babesiose / Fièvre Texas', nameEn: 'Babesiosis', targetSpecies: ['cow'], defaultIntervalDays: 365 },
    // Ovins
    { code: 'CASEOUS_LY', nameFr: 'Lymphadénite caséeuse', nameEn: 'Caseous Lymphadenitis', targetSpecies: ['sheep'], defaultIntervalDays: 365 },
    { code: 'OJD', nameFr: 'Paratuberculose ovine (OJD)', nameEn: 'Ovine Johnes Disease (Gudair)', targetSpecies: ['sheep'], defaultIntervalDays: 3650 },
    { code: 'BRUCELLA_OV', nameFr: 'Brucellose ovine (B.ovis)', nameEn: 'Ovine Brucellosis', targetSpecies: ['sheep'], defaultIntervalDays: 365 },
    { code: 'CAMPY_CHLAM', nameFr: 'Campylobacter + Chlamydia', nameEn: 'Campylobacter + Chlamydial Abortion', targetSpecies: ['sheep'], defaultIntervalDays: 365 },
    // Équidés
    { code: 'EQ_FLU', nameFr: 'Grippe équine', nameEn: 'Equine Influenza', targetSpecies: ['horse'], defaultIntervalDays: 180, isCoreVaccine: true },
    { code: 'EHV', nameFr: 'Rhinopneumonie EHV-1/4', nameEn: 'Equine Herpesvirus', targetSpecies: ['horse'], defaultIntervalDays: 180 },
    { code: 'TETANOS_EQ', nameFr: 'Tétanos équin', nameEn: 'Equine Tetanus', targetSpecies: ['horse'], defaultIntervalDays: 1095 },
    { code: 'WNV', nameFr: 'West Nile Virus', nameEn: 'West Nile Virus', targetSpecies: ['horse'], defaultIntervalDays: 365 },
    { code: 'EEE_WEE', nameFr: 'Encéphalomyélites EEE/WEE', nameEn: 'Eastern/Western Encephalomyelitis', targetSpecies: ['horse'], defaultIntervalDays: 365 },
    { code: 'HENDRA', nameFr: 'Virus Hendra', nameEn: 'Hendra Virus (EquiVac HeV)', targetSpecies: ['horse'], defaultIntervalDays: 365 },
    { code: 'MORVE', nameFr: 'Morve (dépistage)', nameEn: 'Glanders (screening)', targetSpecies: ['horse'], defaultIntervalDays: 365 },
    { code: 'ENC_JPN', nameFr: 'Encéphalite japonaise', nameEn: 'Japanese Encephalitis', targetSpecies: ['horse'], defaultIntervalDays: 365 },
    // Chiens
    { code: 'DHPP', nameFr: 'Carré + Parvo + Hépatite', nameEn: 'DHPP Core Vaccine (WSAVA)', targetSpecies: ['dog'], defaultIntervalDays: 1095 },
    { code: 'LEISH', nameFr: 'Leishmaniose canine', nameEn: 'Canine Leishmaniasis', targetSpecies: ['dog'], defaultIntervalDays: 365 },
    { code: 'BORDET', nameFr: 'Toux du chenil (Bordetella)', nameEn: 'Kennel Cough', targetSpecies: ['dog'], defaultIntervalDays: 365 },
    { code: 'OTHER', nameFr: 'Autre vaccin', nameEn: 'Other vaccine', targetSpecies: ['cow', 'sheep', 'horse', 'dog'], defaultIntervalDays: 365 },
];

// ─── Règlements par pays ─────────────────────────────────────────────────
// [cc, vc, species, status, frequency, intervalDays, notes, seasonStart?, seasonEnd?, isFreeNational?]
type RegRow = [string, string, string, string, string | null, number, string, number | null, number | null, boolean?];
const REGULATIONS: RegRow[] = [
    // ── TUNISIE ──
    ['TN', 'FMD', 'cow', 'MANDATORY', 'BIANNUAL', 180, 'Campagne DGSV gratuite Fév-Juin', 2, 6, true],
    ['TN', 'FMD', 'sheep', 'MANDATORY', 'BIANNUAL', 180, 'Même calendrier ovins/caprins', 2, 6, true],
    ['TN', 'LSD', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Programme urgence 2024', 2, 6, true],
    ['TN', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Génisses 3-8 mois — vaccin S19/RB51', 2, 6, true],
    ['TN', 'BRUCELLA_ML', 'sheep', 'MANDATORY', 'ONCE', 365, 'Brebis & chèvres — vaccin Rev-1', 2, 6, true],
    ['TN', 'ANTHRAX', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Zones à risque — campagne nationale', null, null, true],
    ['TN', 'CLAVELÉE', 'sheep', 'MANDATORY', 'ANNUAL', 365, 'Campagne nationale Fév-Avril', 2, 4, true],
    ['TN', 'PPR', 'sheep', 'MANDATORY', 'ONCE', 1095, 'Souche IV — vaccin à vie', null, null, true],
    ['TN', 'ENTERO', 'sheep', 'RECOMMENDED', 'ANNUAL', 365, 'Avant agnelage', null, null],
    ['TN', 'EQ_FLU', 'horse', 'RECOMMENDED', 'ANNUAL', 365, 'Obligatoire manifestations équestres', null, null],
    ['TN', 'EHV', 'horse', 'RECOMMENDED', 'BIANNUAL', 180, 'Juments gestantes priorité', null, null],
    ['TN', 'TETANOS_EQ', 'horse', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Primovac 2 doses J0+J28', null, null],
    ['TN', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Obligatoire légal — passeport animal', null, null, true],
    ['TN', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Chiot 60j + rappel 90j — WSAVA 2024', null, null],

    // ── MAROC ──
    ['MA', 'FMD', 'cow', 'MANDATORY', 'BIANNUAL', 180, 'Programme ONSSA gratuit', 2, 6, true],
    ['MA', 'FMD', 'sheep', 'MANDATORY', 'BIANNUAL', 180, 'Idem bovins', 2, 6, true],
    ['MA', 'PPR', 'sheep', 'MANDATORY', 'ONCE', 1095, 'Programme national', null, null, true],
    ['MA', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Génisses 3-8 mois', null, null, true],
    ['MA', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Programme municipal', null, null, true],
    ['MA', 'ENTERO', 'sheep', 'RECOMMENDED', 'ANNUAL', 365, 'Avant mise-bas', null, null],

    // ── ALGÉRIE ──
    ['DZ', 'FMD', 'cow', 'MANDATORY', 'BIANNUAL', 180, 'Programme MATVET', 2, 6, true],
    ['DZ', 'FMD', 'sheep', 'MANDATORY', 'BIANNUAL', 180, 'Idem bovins', 2, 6, true],
    ['DZ', 'PPR', 'sheep', 'MANDATORY', 'ONCE', 1095, 'Programme national', null, null, true],
    ['DZ', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Programme national', null, null, true],
    ['DZ', 'ANTHRAX', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Zones à risque', null, null, true],

    // ── FRANCE ──
    ['FR', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'INTERDIT — Directive UE 2003/85/CE — statut OIE indemne sans vaccination', null, null],
    ['FR', 'FMD', 'sheep', 'FORBIDDEN', null, 0, 'INTERDIT — idem bovins', null, null],
    ['FR', 'FCO_3', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Avant mise à l\'herbe — stock État gratuit', 2, 4, true],
    ['FR', 'FCO_3', 'sheep', 'MANDATORY', 'ANNUAL', 365, 'Campagne 2025 État', 2, 4, true],
    ['FR', 'FCO_8', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Combiné BTV3/8', 2, 4, true],
    ['FR', 'FCO_8', 'sheep', 'MANDATORY', 'ANNUAL', 365, 'Combiné BTV3/8', 2, 4, true],
    ['FR', 'MHE', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Hépizovac® — stock État', 2, 5, true],
    ['FR', 'IBR', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Plan éradication — vaccin marqueur gE-minus', null, null],
    ['FR', 'BVD', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Plan éradication depuis 2020', null, null],
    ['FR', 'EQ_FLU', 'horse', 'MANDATORY_CONDITIONAL', 'BIANNUAL', 180, 'Obligatoire concours FFE/SHF', null, null],
    ['FR', 'EHV', 'horse', 'RECOMMENDED', 'BIANNUAL', 180, 'Juments gestantes — mois 5, 7, 9', null, null],
    ['FR', 'WNV', 'horse', 'RECOMMENDED', 'ANNUAL', 365, 'Camargue, Corse, PACA', null, null],
    ['FR', 'RAGE', 'dog', 'MANDATORY_CONDITIONAL', 'ANNUAL', 365, 'Obligatoire passeport sortie France', null, null],
    ['FR', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine WSAVA 2024', null, null],
    ['FR', 'LEPTO', 'dog', 'RECOMMENDED', 'ANNUAL', 365, 'Chiens de ferme — risque élevé', null, null],

    // ── BELGIQUE ──
    ['BE', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'INTERDIT — Zone indemne UE', null, null],
    ['BE', 'FMD', 'sheep', 'FORBIDDEN', null, 0, 'INTERDIT — Zone indemne UE', null, null],
    ['BE', 'FCO_3', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne fédérale', 2, 5, true],
    ['BE', 'FCO_8', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne combinée BTV3/8', 2, 5, true],
    ['BE', 'RAGE', 'dog', 'MANDATORY_CONDITIONAL', 'ANNUAL', 365, 'Obligatoire passeport export', null, null],
    ['BE', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine WSAVA', null, null],

    // ── ALLEMAGNE ──
    ['DE', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'INTERDIT — Statut indemne UE', null, null],
    ['DE', 'BVD', 'cow', 'UNDER_ERADICATION', 'ANNUAL', 365, 'Programme test+abattage PI obligatoire. NE PAS VACCINER.', null, null],
    ['DE', 'FCO_3', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne fédérale BVL', null, null],
    ['DE', 'FCO_8', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne combinée', null, null],
    ['DE', 'IBR', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Plan éradication national', null, null],
    ['DE', 'RAGE', 'dog', 'MANDATORY_CONDITIONAL', 'ANNUAL', 365, 'Obligatoire passeport export', null, null],
    ['DE', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine WSAVA', null, null],

    // ── PAYS-BAS ──
    ['NL', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'INTERDIT — Zone indemne UE', null, null],
    ['NL', 'FCO_3', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne RVO', 2, 5, true],
    ['NL', 'FCO_8', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne RVO', 2, 5, true],
    ['NL', 'IBR', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Plan I-BRL éradication', null, null],
    ['NL', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine WSAVA', null, null],

    // ── ESPAGNE ──
    ['ES', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'INTERDIT — Zone indemne UE', null, null],
    ['ES', 'FCO_3', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne MAPA', 2, 5, true],
    ['ES', 'FCO_8', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne MAPA', 2, 5, true],
    ['ES', 'RAGE', 'dog', 'MANDATORY_CONDITIONAL', 'ANNUAL', 365, 'Obligatoire passeport sortie UE', null, null],
    ['ES', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine WSAVA', null, null],

    // ── ITALIE ──
    ['IT', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'INTERDIT — Zone indemne UE', null, null],
    ['IT', 'FCO_3', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne ministérielle', 2, 5, true],
    ['IT', 'FCO_8', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Campagne combinée', 2, 5, true],
    ['IT', 'RAGE', 'dog', 'MANDATORY_CONDITIONAL', 'ANNUAL', 365, 'Obligatoire passeport export UE', null, null],
    ['IT', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine ENCI', null, null],

    // ── ARGENTINE ──
    ['AR', 'FMD', 'cow', 'MANDATORY_ZONES', 'BIANNUAL', 180, 'Zone Centre-Nord UNIQUEMENT. Interdit Patagonie.', null, null],
    ['AR', 'FMD', 'sheep', 'MANDATORY_ZONES', 'BIANNUAL', 180, 'Zone Centre-Nord uniquement', null, null],
    ['AR', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Terneras 3-8 mois — campagne SENASA', null, null, true],
    ['AR', 'EEE_WEE', 'horse', 'MANDATORY', 'ANNUAL', 365, 'Encéphalomyélite équine — campagne SENASA', null, null],
    ['AR', 'MORVE', 'horse', 'MANDATORY', 'ANNUAL', 365, 'Test CFT annuel — abattage si positif', null, null],
    ['AR', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Programme national', null, null, true],

    // ── BRÉSIL ──
    ['BR', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'INTERDIT depuis mai 2025 — WOAH FMD-free sans vaccination', null, null],
    ['BR', 'FMD', 'sheep', 'FORBIDDEN', null, 0, 'Idem bovins', null, null],
    ['BR', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Terneiras 3-8 mois — gratuit MAPA', null, null, true],
    ['BR', 'RAGE_BOV', 'cow', 'MANDATORY_ZONES', 'ANNUAL', 365, 'Zones chauves-souris vampires Desmodus', null, null],
    ['BR', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Programme national', null, null, true],
    ['BR', 'PASTEU_BOV', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Pasteurellose tropicale', null, null],

    // ── USA ──
    ['US', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'FMD-free USDA — zero tolerance', null, null],
    ['US', 'IBR_BVD_4', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine AABP — MLV 4-way', null, null],
    ['US', 'CLOSTRI_7', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine — avant vêlage', null, null],
    ['US', 'LEPTO_5', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine bovins USA', null, null],
    ['US', 'EEE_WEE', 'horse', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine AAEP', null, null],
    ['US', 'WNV', 'horse', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine AAEP', null, null],
    ['US', 'TETANOS_EQ', 'horse', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine AAEP', null, null],
    ['US', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'OBLIGATOIRE dans tous les États', null, null],
    ['US', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine WSAVA 2024', null, null],
    ['US', 'LEPTO', 'dog', 'RECOMMENDED', 'ANNUAL', 365, 'Chiens de ferme', null, null],

    // ── CANADA ──
    ['CA', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'FMD-free — plan confinement strict', null, null],
    ['CA', 'IBR_BVD_4', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine BCVA', null, null],
    ['CA', 'CLOSTRI_7', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine', null, null],
    ['CA', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Obligatoire la plupart des provinces', null, null],
    ['CA', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine CAHA', null, null],

    // ── MEXIQUE ──
    ['MX', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'FMD-free SENASICA', null, null],
    ['MX', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Programme national SENASICA', null, null, true],
    ['MX', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Programme national', null, null, true],
    ['MX', 'DHPP', 'dog', 'RECOMMENDED', 'TRIENNIAL', 1095, 'Core vaccine WSAVA', null, null],

    // ── AUSTRALIE ──
    ['AU', 'FMD', 'cow', 'FORBIDDEN', null, 0, 'FMD-free — plan urgence mRNA en stockpile', null, null],
    ['AU', 'FMD', 'sheep', 'FORBIDDEN', null, 0, 'FMD-free', null, null],
    ['AU', 'HENDRA', 'horse', 'RECOMMENDED', 'ANNUAL', 365, 'UNIQUE AU MONDE — EquiVac® HeV — zoonotique mortel QLD/NSW', null, null],
    ['AU', 'OJD', 'sheep', 'RECOMMENDED', 'ONCE', 3650, 'Gudair® — paratuberculose ovine', null, null],
    ['AU', 'CASEOUS_LY', 'sheep', 'RECOMMENDED', 'ANNUAL', 365, 'Glanvac® 6 — campylobacter + clostridies', null, null],
    ['AU', 'CAMPY_CHLAM', 'sheep', 'RECOMMENDED', 'ANNUAL', 365, 'Avant mise-bas', null, null],
    ['AU', 'RAGE', 'dog', 'NOT_APPLICABLE', null, 0, 'Australie indemne de rage', null, null],
    ['AU', 'IBR_BVD_4', 'cow', 'RECOMMENDED', 'ANNUAL', 365, 'Core vaccine AVSA', null, null],

    // ── INDE ──
    ['IN', 'FMD', 'cow', 'MANDATORY', 'BIANNUAL', 180, 'Programme NADCP — 500M doses/an', 1, 6, true],
    ['IN', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Génisses 4-8 mois — NADCP gratuit', null, null, true],
    ['IN', 'PPR', 'sheep', 'MANDATORY', 'ANNUAL', 365, 'Programme national', null, null, true],
    ['IN', 'LSD', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Expansion 2024 — programme national', null, null, true],
    ['IN', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Mission Rabies — priorité absolue', null, null, true],
    ['IN', 'ANTHRAX', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Zones à risque — Kerala, Karnataka', null, null, true],
    ['IN', 'ENTERO', 'sheep', 'RECOMMENDED', 'ANNUAL', 365, 'Avant agnelage', null, null],

    // ── CHINE ──
    ['CN', 'FMD', 'cow', 'MANDATORY', 'BIANNUAL', 180, 'Programme CADC — 84.5M bovins 2023', 1, 6, true],
    ['CN', 'FMD', 'sheep', 'MANDATORY', 'BIANNUAL', 180, '194M moutons — campagne nationale', 1, 6, true],
    ['CN', 'PPR', 'sheep', 'MANDATORY', 'ANNUAL', 365, 'Frontières Asie Centrale — Xinjiang', null, null, true],
    ['CN', 'LSD', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Programme national depuis 2020', null, null, true],
    ['CN', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Programme national', null, null, true],
    ['CN', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Programme national — santé publique', null, null, true],
    ['CN', 'ENC_JPN', 'horse', 'RECOMMENDED', 'ANNUAL', 365, 'Risque zone Asie', null, null],

    // ── TURQUIE ──
    ['TR', 'FMD', 'cow', 'MANDATORY', 'BIANNUAL', 180, 'Programme national GKGM', 2, 6, true],
    ['TR', 'FMD', 'sheep', 'MANDATORY', 'BIANNUAL', 180, 'Idem bovins', 2, 6, true],
    ['TR', 'PPR', 'sheep', 'MANDATORY', 'ANNUAL', 365, 'Frontières Syrie/Iran — campagne nationale', null, null, true],
    ['TR', 'LSD', 'cow', 'MANDATORY', 'ANNUAL', 365, 'Présente et en expansion 2024', null, null, true],
    ['TR', 'BRUCELLA_AB', 'cow', 'MANDATORY', 'ONCE', 365, 'Programme national', null, null, true],
    ['TR', 'RAGE', 'dog', 'MANDATORY', 'ANNUAL', 365, 'Programme municipal', null, null, true],
    ['TR', 'ENTERO', 'sheep', 'RECOMMENDED', 'ANNUAL', 365, 'Avant agnelage', null, null],
];

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
    console.log('🌱 Seeding vaccine global data...');

    // 1. Pays
    for (const c of COUNTRIES) {
        await prisma.country.upsert({
            where: { code: c.code },
            update: c as any,
            create: c as any,
        });
    }
    console.log(`✅ ${COUNTRIES.length} pays créés`);

    // 2. Régions Argentine
    const ar = await prisma.country.findUnique({ where: { code: 'AR' } });
    if (ar) {
        for (const r of AR_REGIONS) {
            await prisma.fieldRegion.upsert({
                where: { countryId_code: { countryId: ar.id, code: r.code } },
                update: r as any,
                create: { ...r, countryId: ar.id } as any,
            });
        }
        console.log('✅ 2 régions Argentine créées');
    }

    // 3. Vaccins
    for (const v of VACCINES) {
        await prisma.vaccine.upsert({
            where: { code: v.code },
            update: v as any,
            create: v as any,
        });
    }
    console.log(`✅ ${VACCINES.length} vaccins créés`);

    // 4. Règlements
    let regCount = 0;
    for (const [cc, vc, sp, st, freq, intv, notes, ss, se, free] of REGULATIONS) {
        const country = await prisma.country.findUnique({ where: { code: cc } });
        const vaccine = await prisma.vaccine.findUnique({ where: { code: vc } });
        if (!country || !vaccine) {
            console.warn(`⚠️ Skip: ${cc}/${vc} — pays ou vaccin introuvable`);
            continue;
        }

        const data = {
            countryId: country.id,
            vaccineId: vaccine.id,
            species: sp,
            regionId: undefined,
            status: st as any,
            frequency: freq ?? null,
            intervalDays: intv,
            notes: notes ?? null,
            seasonalMonthStart: ss ?? null,
            seasonalMonthEnd: se ?? null,
            isFreeNational: free ?? false,
        };

        // Upsert manually: find by composite key (handling null regionId)
        const existing = await prisma.vaccineRegulation.findFirst({
            where: {
                countryId: country.id,
                vaccineId: vaccine.id,
                species: sp,
                regionId: null,
            },
        });

        if (existing) {
            await prisma.vaccineRegulation.update({
                where: { id: existing.id },
                data,
            });
        } else {
            await prisma.vaccineRegulation.create({ data });
        }
        regCount++;
    }
    console.log(`✅ ${regCount} règlements créés`);
    console.log('🎉 Seed global vaccins terminé');
}

main().catch(console.error).finally(() => prisma.$disconnect());

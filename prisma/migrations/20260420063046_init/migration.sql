-- CreateEnum
CREATE TYPE "AnimalType" AS ENUM ('cow', 'horse', 'sheep', 'dog');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('active', 'sold', 'deceased');

-- CreateEnum
CREATE TYPE "RaceCategory" AS ENUM ('course', 'loisir', 'sport');

-- CreateEnum
CREATE TYPE "TrainingLevel" AS ENUM ('debutant', 'intermediaire', 'avance', 'confirme', 'elite');

-- CreateEnum
CREATE TYPE "MeatGrade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "DogRole" AS ENUM ('garde', 'berger', 'compagnie');

-- CreateEnum
CREATE TYPE "MedicalEventType" AS ENUM ('visit', 'disease', 'surgery', 'treatment', 'checkup', 'other');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "RegulationStatus" AS ENUM ('MANDATORY', 'MANDATORY_ZONES', 'MANDATORY_CONDITIONAL', 'RECOMMENDED', 'VOLUNTARY', 'FORBIDDEN', 'FORBIDDEN_ZONES', 'NOT_APPLICABLE', 'UNDER_ERADICATION');

-- CreateEnum
CREATE TYPE "FMDZoneStatus" AS ENUM ('ENDEMIC_WITH_VAX', 'FREE_WITH_VAX', 'FREE_WITHOUT_VAX', 'SURVEILLANCE');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'NOTIFIED', 'DONE', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VaccineRoute" AS ENUM ('SUBCUTANEOUS', 'INTRAMUSCULAR', 'INTRANASAL', 'ORAL');

-- CreateEnum
CREATE TYPE "VaccinePriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "OIERegion" AS ENUM ('AFRICA_NORTH', 'AFRICA_SUB_SAHARAN', 'EUROPE_WEST', 'EUROPE_EAST', 'AMERICAS_NORTH', 'AMERICAS_SOUTH', 'AMERICAS_CENTRAL', 'ASIA_PACIFIC', 'MIDDLE_EAST');

-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('STANDARD', 'VOTE');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CatalogueStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "farmName" TEXT NOT NULL,
    "profilePicture" TEXT,
    "refreshToken" TEXT,
    "fcmToken" TEXT,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "currencySymbol" TEXT NOT NULL DEFAULT '$',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "parcelId" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "source" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cropType" TEXT,
    "areaCoordinates" JSONB NOT NULL,
    "areaSize" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT,
    "regionCode" TEXT,
    "fmdFreeZone" BOOLEAN NOT NULL DEFAULT false,
    "countryId" TEXT,
    "regionId" TEXT,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "missionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "actualDuration" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whitelist_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WORKER',
    "email" TEXT,
    "phone" TEXT,
    "fcmToken" TEXT,
    "imagePath" TEXT NOT NULL,
    "assigned_field_id" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whitelist_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "modelYear" INTEGER,
    "mileage" DOUBLE PRECISION,
    "operatingHours" DOUBLE PRECISION,
    "category" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "image_url" TEXT,
    "serial_number" TEXT NOT NULL,
    "last_service_date" TIMESTAMP(3),
    "field_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "start_mileage" DOUBLE PRECISION NOT NULL,
    "start_operating_hours" DOUBLE PRECISION,
    "end_mileage" DOUBLE PRECISION,
    "end_operating_hours" DOUBLE PRECISION,
    "task_type" TEXT,
    "fuel_level" DOUBLE PRECISION,
    "condition_note" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "totalIncidents" INTEGER NOT NULL,
    "criticalAlerts" INTEGER NOT NULL,
    "peakActivityHour" INTEGER NOT NULL,
    "averageThreatLevel" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soil_measurements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ph" DOUBLE PRECISION NOT NULL,
    "soil_moisture" DOUBLE PRECISION NOT NULL,
    "sunlight" DOUBLE PRECISION NOT NULL,
    "nutrients" JSONB NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "field_id" UUID,
    "parcel_id" TEXT,
    "image_path" VARCHAR,
    "soil_type" VARCHAR,
    "detection_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_26b4f52c4005e567602987343a6" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ndvi_records" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgNDVI" DOUBLE PRECISION NOT NULL,
    "gridData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ndvi_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "animalType" "AnimalType" NOT NULL,
    "breed" TEXT,
    "sex" "Sex" NOT NULL,
    "tagNumber" TEXT,
    "profileImage" TEXT,
    "notes" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'purchased',
    "age" INTEGER NOT NULL,
    "ageYears" INTEGER NOT NULL DEFAULT 0,
    "isPregnant" BOOLEAN,
    "lastInseminationDate" TIMESTAMP(3),
    "lastBirthDate" TIMESTAMP(3),
    "expectedBirthDate" TIMESTAMP(3),
    "birthCount" INTEGER NOT NULL DEFAULT 0,
    "motherId" TEXT,
    "fatherId" TEXT,
    "birthWeightKg" DOUBLE PRECISION,
    "birthCost" DOUBLE PRECISION,
    "status" "AnimalStatus" NOT NULL DEFAULT 'active',
    "healthStatus" TEXT NOT NULL DEFAULT 'OPTIMAL',
    "vitalityScore" INTEGER NOT NULL DEFAULT 100,
    "bodyTemp" DOUBLE PRECISION,
    "activityLevel" TEXT NOT NULL DEFAULT 'MODERATE',
    "lastVetCheck" TIMESTAMP(3),
    "vaccination" BOOLEAN NOT NULL DEFAULT false,
    "isFattening" BOOLEAN NOT NULL DEFAULT false,
    "fatteningStartDate" TIMESTAMP(3),
    "targetSaleDate" TIMESTAMP(3),
    "buyerName" TEXT,
    "saleWeightKg" DOUBLE PRECISION,
    "healthRiskScore" DOUBLE PRECISION,
    "diseaseHistoryCount" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION,
    "milkYield" DOUBLE PRECISION,
    "woolYield" DOUBLE PRECISION,
    "fatContent" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "productionHabit" TEXT,
    "feedIntakeRecorded" TIMESTAMP(3),
    "dewormingScheduled" TIMESTAMP(3),
    "birthHistory" JSONB,
    "dailyMilkAvgL" DECIMAL(5,2),
    "milkPeakDate" TIMESTAMP(3),
    "lactationNumber" INTEGER,
    "raceCategory" "RaceCategory",
    "bestRaceTime" DECIMAL(8,3),
    "trainingLevel" "TrainingLevel",
    "woolLastShearDate" TIMESTAMP(3),
    "meatGrade" "MeatGrade",
    "dogRole" "DogRole",
    "purchasePrice" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3),
    "estimatedValue" DECIMAL(10,2),
    "salePrice" DECIMAL(10,2),
    "saleDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleCatalogue" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3),
    "location" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "showPrices" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL,
    "shareToken" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "shareViewCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogueStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueAnimal" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceOverride" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "CatalogueAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameAr" TEXT,
    "vetAuthority" TEXT NOT NULL,
    "vetAuthorityUrl" TEXT,
    "oieRegion" "OIERegion" NOT NULL,
    "fmdZoneStatus" "FMDZoneStatus" NOT NULL DEFAULT 'ENDEMIC_WITH_VAX',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_regions" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fmdZoneStatus" "FMDZoneStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "field_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "targetSpecies" JSONB NOT NULL,
    "manufacturer" TEXT,
    "doseUnit" TEXT NOT NULL DEFAULT 'ml',
    "defaultIntervalDays" INTEGER NOT NULL DEFAULT 365,
    "isCoreVaccine" BOOLEAN NOT NULL DEFAULT false,
    "intervalDaysOverride" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_regulations" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "regionId" TEXT,
    "vaccineId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "status" "RegulationStatus" NOT NULL,
    "frequency" TEXT,
    "intervalDays" INTEGER NOT NULL,
    "ageMinDays" INTEGER,
    "ageMaxDays" INTEGER,
    "mandatoryFor" TEXT,
    "legalBasis" TEXT,
    "isFreeNational" BOOLEAN NOT NULL DEFAULT false,
    "isSubsidized" BOOLEAN NOT NULL DEFAULT false,
    "subsidyAmount" DOUBLE PRECISION,
    "seasonalMonthStart" INTEGER,
    "seasonalMonthEnd" INTEGER,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccine_regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_campaign_periods" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "vaccineCode" TEXT NOT NULL,
    "species" JSONB NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isSubsidized" BOOLEAN NOT NULL DEFAULT false,
    "subsidyAmount" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "vaccine_campaign_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_schedules" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "regulationId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceDays" INTEGER,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "priority" "VaccinePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccine_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_notification_logs" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vaccine_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccine_records" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "animalId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "administeredBy" TEXT NOT NULL,
    "administeredAt" TIMESTAMP(3) NOT NULL,
    "vaccineName" TEXT,
    "vaccineDate" TIMESTAMP(3),
    "vetName" TEXT,
    "lotNumber" TEXT,
    "doseGiven" DOUBLE PRECISION NOT NULL,
    "doseUnit" TEXT NOT NULL DEFAULT 'ml',
    "route" "VaccineRoute" NOT NULL DEFAULT 'SUBCUTANEOUS',
    "bodyWeight" DOUBLE PRECISION,
    "nextDueDate" TIMESTAMP(3),
    "dateEstimated" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccine_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_events" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" "MedicalEventType" NOT NULL,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "vetName" TEXT,
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "collarId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "temperature" DOUBLE PRECISION,
    "heartRate" DOUBLE PRECISION,
    "accX" DOUBLE PRECISION,
    "accY" DOUBLE PRECISION,
    "accZ" DOUBLE PRECISION,
    "activityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_alerts" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "alertTime" TIMESTAMP(3) NOT NULL,
    "alertLevel" "AlertLevel" NOT NULL,
    "predictedDisease" TEXT,
    "confidence" DOUBLE PRECISION,
    "anomalyScore" DOUBLE PRECISION,
    "vetConfirmed" BOOLEAN,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milk_productions" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "morningL" DECIMAL(6,2),
    "eveningL" DECIMAL(6,2),
    "totalL" DECIMAL(6,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milk_productions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_performances" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "raceName" TEXT,
    "position" INTEGER,
    "timeSeconds" DECIMAL(8,3),
    "distanceM" INTEGER,
    "trackCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "race_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "measuredDate" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(7,2) NOT NULL,
    "measuredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "animalId" TEXT,
    "farmId" TEXT,
    "fieldId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "areaSize" DOUBLE PRECISION NOT NULL,
    "polygon" JSONB,
    "boundariesDescription" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "soilPh" DOUBLE PRECISION,
    "nitrogenLevel" DOUBLE PRECISION,
    "phosphorusLevel" DOUBLE PRECISION,
    "potassiumLevel" DOUBLE PRECISION,
    "waterSource" TEXT NOT NULL,
    "irrigationMethod" TEXT NOT NULL,
    "irrigationFrequency" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "plantingDate" TIMESTAMP(3) NOT NULL,
    "expectedHarvestDate" TIMESTAMP(3) NOT NULL,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fertilizations" (
    "id" TEXT NOT NULL,
    "fertilizerType" TEXT NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fertilizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pest_diseases" (
    "id" TEXT NOT NULL,
    "issueType" TEXT,
    "treatmentUsed" TEXT,
    "treatmentDate" TIMESTAMP(3),
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pest_diseases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" TEXT NOT NULL,
    "harvestDate" TIMESTAMP(3),
    "totalYield" DOUBLE PRECISION,
    "yieldPerHectare" DOUBLE PRECISION,
    "parcelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_requirements" (
    "id" TEXT NOT NULL,
    "crop_name" TEXT NOT NULL,
    "min_ph" DOUBLE PRECISION NOT NULL,
    "max_ph" DOUBLE PRECISION NOT NULL,
    "min_moisture" DOUBLE PRECISION NOT NULL,
    "max_moisture" DOUBLE PRECISION NOT NULL,
    "nitrogen_required" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "crop_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_regions" (
    "id" TEXT NOT NULL,
    "crop_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "crop_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "CommunityPostType" NOT NULL DEFAULT 'STANDARD',
    "content" TEXT NOT NULL,
    "imagePath" TEXT,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "dislikesCount" INTEGER NOT NULL DEFAULT 0,
    "pollQuestion" TEXT,
    "pollEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_reactions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommunityReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "dislikesCount" INTEGER NOT NULL DEFAULT 0,
    "repliesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comment_reactions" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommunityReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_poll_options" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_poll_votes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "quiz_results_userId_idx" ON "quiz_results"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_userId_type_key" ON "badges"("userId", "type");

-- CreateIndex
CREATE INDEX "saved_articles_farmerId_idx" ON "saved_articles"("farmerId");

-- CreateIndex
CREATE INDEX "fields_userId_idx" ON "fields"("userId");

-- CreateIndex
CREATE INDEX "missions_userId_idx" ON "missions"("userId");

-- CreateIndex
CREATE INDEX "missions_fieldId_idx" ON "missions"("fieldId");

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_idx" ON "chat_messages"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "whitelist_staff_username_key" ON "whitelist_staff"("username");

-- CreateIndex
CREATE UNIQUE INDEX "whitelist_staff_email_key" ON "whitelist_staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "whitelist_staff_phone_key" ON "whitelist_staff"("phone");

-- CreateIndex
CREATE INDEX "assets_user_id_idx" ON "assets"("user_id");

-- CreateIndex
CREATE INDEX "assets_field_id_idx" ON "assets"("field_id");

-- CreateIndex
CREATE INDEX "assets_assigned_to_id_idx" ON "assets"("assigned_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_user_id_serial_number_key" ON "assets"("user_id", "serial_number");

-- CreateIndex
CREATE INDEX "usage_logs_asset_id_idx" ON "usage_logs"("asset_id");

-- CreateIndex
CREATE INDEX "usage_logs_farmer_id_idx" ON "usage_logs"("farmer_id");

-- CreateIndex
CREATE INDEX "usage_logs_start_time_idx" ON "usage_logs"("start_time");

-- CreateIndex
CREATE INDEX "daily_reports_userId_idx" ON "daily_reports"("userId");

-- CreateIndex
CREATE INDEX "daily_reports_createdAt_idx" ON "daily_reports"("createdAt");

-- CreateIndex
CREATE INDEX "IDX_1b5048dedf4b0c67b0e3d69028" ON "soil_measurements"("created_at");

-- CreateIndex
CREATE INDEX "IDX_b1d30f7933303444ba94550db7" ON "soil_measurements"("field_id");

-- CreateIndex
CREATE INDEX "IDX_db34dddb4edfd4e726c70f52b0" ON "soil_measurements"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "IDX_0a742379a0b58d214968308ae8" ON "soil_measurements"("soil_type");

-- CreateIndex
CREATE INDEX "soil_measurements_parcel_id_idx" ON "soil_measurements"("parcel_id");

-- CreateIndex
CREATE INDEX "ndvi_records_fieldId_idx" ON "ndvi_records"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "animals_nodeId_key" ON "animals"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleCatalogue_shareToken_key" ON "SaleCatalogue"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueAnimal_catalogueId_animalId_key" ON "CatalogueAnimal"("catalogueId", "animalId");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "field_regions_countryId_code_key" ON "field_regions"("countryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_code_key" ON "vaccines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_regulations_countryId_regionId_vaccineId_species_key" ON "vaccine_regulations"("countryId", "regionId", "vaccineId", "species");

-- CreateIndex
CREATE INDEX "sensor_readings_animalId_timestamp_idx" ON "sensor_readings"("animalId", "timestamp");

-- CreateIndex
CREATE INDEX "crop_requirements_crop_name_idx" ON "crop_requirements"("crop_name");

-- CreateIndex
CREATE INDEX "crop_regions_crop_name_idx" ON "crop_regions"("crop_name");

-- CreateIndex
CREATE INDEX "crop_regions_country_idx" ON "crop_regions"("country");

-- CreateIndex
CREATE INDEX "community_posts_authorId_idx" ON "community_posts"("authorId");

-- CreateIndex
CREATE INDEX "community_posts_createdAt_idx" ON "community_posts"("createdAt");

-- CreateIndex
CREATE INDEX "community_post_reactions_userId_idx" ON "community_post_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_reactions_postId_userId_key" ON "community_post_reactions"("postId", "userId");

-- CreateIndex
CREATE INDEX "community_comments_postId_idx" ON "community_comments"("postId");

-- CreateIndex
CREATE INDEX "community_comments_authorId_idx" ON "community_comments"("authorId");

-- CreateIndex
CREATE INDEX "community_comments_parentCommentId_idx" ON "community_comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "community_comments_createdAt_idx" ON "community_comments"("createdAt");

-- CreateIndex
CREATE INDEX "community_comment_reactions_userId_idx" ON "community_comment_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_comment_reactions_commentId_userId_key" ON "community_comment_reactions"("commentId", "userId");

-- CreateIndex
CREATE INDEX "community_poll_options_postId_idx" ON "community_poll_options"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "community_poll_options_postId_position_key" ON "community_poll_options"("postId", "position");

-- CreateIndex
CREATE INDEX "community_poll_votes_optionId_idx" ON "community_poll_votes"("optionId");

-- CreateIndex
CREATE INDEX "community_poll_votes_userId_idx" ON "community_poll_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_poll_votes_postId_userId_key" ON "community_poll_votes"("postId", "userId");

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "field_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whitelist_staff" ADD CONSTRAINT "whitelist_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whitelist_staff" ADD CONSTRAINT "whitelist_staff_assigned_field_id_fkey" FOREIGN KEY ("assigned_field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "whitelist_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "whitelist_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_measurements" ADD CONSTRAINT "soil_measurements_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_measurements" ADD CONSTRAINT "soil_measurements_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "parcels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ndvi_records" ADD CONSTRAINT "ndvi_records_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleCatalogue" ADD CONSTRAINT "SaleCatalogue_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueAnimal" ADD CONSTRAINT "CatalogueAnimal_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "SaleCatalogue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueAnimal" ADD CONSTRAINT "CatalogueAnimal_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_regions" ADD CONSTRAINT "field_regions_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_regulations" ADD CONSTRAINT "vaccine_regulations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_regulations" ADD CONSTRAINT "vaccine_regulations_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "field_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_regulations" ADD CONSTRAINT "vaccine_regulations_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_campaign_periods" ADD CONSTRAINT "vaccine_campaign_periods_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_schedules" ADD CONSTRAINT "vaccine_schedules_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_schedules" ADD CONSTRAINT "vaccine_schedules_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_notification_logs" ADD CONSTRAINT "vaccine_notification_logs_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "vaccine_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "vaccine_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccine_records" ADD CONSTRAINT "vaccine_records_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_events" ADD CONSTRAINT "medical_events_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_alerts" ADD CONSTRAINT "health_alerts_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milk_productions" ADD CONSTRAINT "milk_productions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_performances" ADD CONSTRAINT "race_performances_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crops" ADD CONSTRAINT "crops_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fertilizations" ADD CONSTRAINT "fertilizations_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pest_diseases" ADD CONSTRAINT "pest_diseases_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reactions" ADD CONSTRAINT "community_post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_reactions" ADD CONSTRAINT "community_post_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_reactions" ADD CONSTRAINT "community_comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_reactions" ADD CONSTRAINT "community_comment_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_options" ADD CONSTRAINT "community_poll_options_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "community_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

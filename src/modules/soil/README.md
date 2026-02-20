# Soil & Environment Monitoring Module

Production-ready NestJS module for Agri-Tech monitoring platform.

## Overview

This module provides advanced CRUD operations for soil measurements with PostgreSQL 17 and TypeORM, following clean architecture principles.

## Features

- ✅ Full CRUD operations with RESTful endpoints
- ✅ Advanced pagination, filtering, and sorting
- ✅ Comprehensive DTO validation using class-validator
- ✅ UUID-based primary keys
- ✅ Business logic with computed status fields
- ✅ Proper error handling with HTTP exceptions
- ✅ Complete Swagger/OpenAPI documentation
- ✅ Database indexes for performance optimization

## Database Schema

### SoilMeasurement Entity

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | Primary Key | Auto-generated UUID |
| ph | float | 0-14 | Soil pH level |
| soilMoisture | float | 0-100 | Soil moisture percentage |
| sunlight | float | >= 0 | Sunlight intensity |
| nutrients | JSONB | - | Soil nutrients (JSON object) |
| temperature | float | - | Temperature in Celsius |
| latitude | float | -90 to 90 | GPS latitude |
| longitude | float | -180 to 180 | GPS longitude |
| createdAt | timestamp | Auto | Creation timestamp |
| updatedAt | timestamp | Auto | Last update timestamp |

### Indexes

- `createdAt` - For time-based queries
- `(latitude, longitude)` - For geospatial queries

## API Endpoints

### Create Soil Measurement
```
POST /api/soil
```

**Request Body:**
```json
{
  "ph": 6.5,
  "soilMoisture": 45.5,
  "sunlight": 850.5,
  "nutrients": {
    "nitrogen": 20,
    "phosphorus": 15,
    "potassium": 25
  },
  "temperature": 22.5,
  "latitude": 40.7128,
  "longitude": -74.006
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ph": 6.5,
  "soilMoisture": 45.5,
  "sunlight": 850.5,
  "nutrients": {
    "nitrogen": 20,
    "phosphorus": 15,
    "potassium": 25
  },
  "temperature": 22.5,
  "latitude": 40.7128,
  "longitude": -74.006,
  "createdAt": "2026-02-14T12:00:00.000Z",
  "updatedAt": "2026-02-14T12:00:00.000Z",
  "phStatus": "Neutral",
  "moistureStatus": "Optimal"
}
```

### Get All Soil Measurements (with filtering)
```
GET /api/soil?page=1&limit=10&minPh=6&maxPh=7&sortBy=createdAt&order=DESC
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `minPh` (optional) - Minimum pH value
- `maxPh` (optional) - Maximum pH value
- `minMoisture` (optional) - Minimum soil moisture
- `maxMoisture` (optional) - Maximum soil moisture
- `minTemperature` (optional) - Minimum temperature
- `maxTemperature` (optional) - Maximum temperature
- `sortBy` (optional, default: 'createdAt') - Sort field: createdAt | ph | soilMoisture | temperature
- `order` (optional, default: 'DESC') - Sort order: ASC | DESC

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ph": 6.5,
      "soilMoisture": 45.5,
      "sunlight": 850.5,
      "nutrients": {
        "nitrogen": 20,
        "phosphorus": 15,
        "potassium": 25
      },
      "temperature": 22.5,
      "latitude": 40.7128,
      "longitude": -74.006,
      "createdAt": "2026-02-14T12:00:00.000Z",
      "updatedAt": "2026-02-14T12:00:00.000Z",
      "phStatus": "Neutral",
      "moistureStatus": "Optimal"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Get Single Soil Measurement
```
GET /api/soil/:id
```

**Response:** `200 OK` or `404 Not Found`

### Update Soil Measurement
```
PATCH /api/soil/:id
```

**Request Body:** (all fields optional)
```json
{
  "ph": 7.0,
  "soilMoisture": 50.0
}
```

**Response:** `200 OK` or `404 Not Found`

### Delete Soil Measurement
```
DELETE /api/soil/:id
```

**Response:** `204 No Content` or `404 Not Found`

## Business Logic

### Computed Status Fields

The service automatically computes status fields:

#### pH Status
- **Acidic**: pH < 6.5
- **Neutral**: pH 6.5 - 7.5
- **Alkaline**: pH > 7.5

#### Moisture Status
- **Dry**: < 30%
- **Optimal**: 30% - 60%
- **Wet**: > 60%

## Validation Rules

All validation is enforced at the DTO level using `class-validator`:

- **ph**: Must be between 0 and 14
- **soilMoisture**: Must be between 0 and 100
- **latitude**: Must be between -90 and 90
- **longitude**: Must be between -180 and 180
- **sunlight**: Must be >= 0
- **nutrients**: Must be a valid JSON object
- **temperature**: Must be a number

## Error Handling

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `204` - No Content (Delete)
- `400` - Bad Request (validation errors, invalid UUID)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Module Structure

```
src/modules/soil/
├── soil.module.ts           # Module definition
├── soil.controller.ts       # RESTful controller
├── soil.service.ts          # Business logic
├── soil.entity.ts           # TypeORM entity
├── dto/
│   ├── create-soil.dto.ts   # Create DTO
│   ├── update-soil.dto.ts   # Update DTO
│   └── query-soil.dto.ts    # Query/filter DTO
├── interfaces/
│   └── index.ts             # TypeScript interfaces
└── enums/
    └── index.ts             # Status enums
```

## Testing with Swagger

Access interactive API documentation at:
```
http://localhost:3000/api/docs
```

## Production Considerations

- ✅ Database indexes on frequently queried fields
- ✅ TypeORM synchronize disabled in production
- ✅ Proper error handling and logging
- ✅ Input validation on all endpoints
- ✅ UUID validation
- ✅ Transaction support ready
- ✅ Pagination for large datasets

## Example Usage

### Create a measurement
```bash
curl -X POST http://localhost:3000/api/soil \
  -H "Content-Type: application/json" \
  -d '{
    "ph": 6.8,
    "soilMoisture": 42.0,
    "sunlight": 920.0,
    "nutrients": {"N": 25, "P": 18, "K": 30},
    "temperature": 24.5,
    "latitude": 37.7749,
    "longitude": -122.4194
  }'
```

### Query with filters
```bash
curl "http://localhost:3000/api/soil?minPh=6&maxPh=7&minMoisture=30&maxMoisture=60&page=1&limit=20&sortBy=createdAt&order=DESC"
```

## Dependencies

- `@nestjs/typeorm` - NestJS TypeORM integration
- `typeorm` - ORM for TypeScript/JavaScript
- `pg` - PostgreSQL client
- `uuid` - UUID generation
- `class-validator` - DTO validation
- `class-transformer` - Object transformation

---

Built with ❤️ for Agri-Tech monitoring

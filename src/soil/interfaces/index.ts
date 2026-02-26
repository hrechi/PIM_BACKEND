import { PhStatus, MoistureStatus } from '../enums';

export interface SoilMeasurementWithStatus {
  id: string;
  ph: number;
  soilMoisture: number;
  sunlight: number;
  nutrients: Record<string, any>;
  temperature: number;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
  phStatus: PhStatus;
  moistureStatus: MoistureStatus;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface FilterQuery {
  minPh?: number;
  maxPh?: number;
  minMoisture?: number;
  maxMoisture?: number;
  minTemperature?: number;
  maxTemperature?: number;
}

export interface SortQuery {
  sortBy?: 'createdAt' | 'ph' | 'soilMoisture' | 'temperature';
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

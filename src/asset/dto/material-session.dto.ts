// Material Session DTO - for creating material usage sessions
export class CreateMaterialSessionDto {
  assetId: string;
  farmerId: string;
  startTime: Date;
  startMileage?: number;
  startOperatingHours?: number;
  taskType: string;
  notes?: string;
  customFieldsUsed?: Record<string, any>;
}

// Material Session Check-in DTO
export class MaterialSessionCheckInDto {
  sessionId: string;
  endTime: Date;
  endMileage?: number;
  endOperatingHours?: number;
  conditionNotes?: string;
  observationsAboutMaterial?: string;
  completionStatus: 'COMPLETED' | 'PARTIAL' | 'INCOMPLETE';
  nextStepsRequired?: string[];
  returnPhotos?: string[];
}

// Material Session Response
export class MaterialSessionResponseDto {
  id: string;
  assetId: string;
  assetDetails?: {
    name: string;
    brand: string;
    model?: string;
  };
  farmerId: string;
  farmerName?: string;
  startTime: Date;
  endTime?: Date;
  duration?: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  startMileage?: number;
  endMileage?: number;
  mileageUsed?: number;
  startOperatingHours?: number;
  endOperatingHours?: number;
  hoursUsed?: number;
  taskType: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  conditionNotes?: string;
  observationsAboutMaterial?: string;
  completionStatus?: string;
  aiInsights?: {
    maintenanceRequired: boolean;
    nextServiceDue?: Date;
    recommendations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Material History Summary
export class MaterialHistoryDto {
  materialId: string;
  totalSessionsCount: number;
  totalHoursUsed: number;
  totalMileageUsed: number;
  lastUsedAt?: Date;
  averageSessionDuration: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDue?: Date;
  recentSessions: MaterialSessionResponseDto[];
  maintenanceLog?: {
    date: Date;
    description: string;
    performedBy: string;
  }[];
}

// Material Usage Analytics
export class MaterialUsageAnalyticsDto {
  assetId: string;
  assetName: string;
  totalUsageHours: number;
  totalUsageMileage?: number;
  utilisationRate: number; // percentage
  averageSessionDuration: number;
  mostCommonTaskType: string;
  upcomingMaintenanceTasks: {
    taskName: string;
    dueDate: Date;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  healthScore: number; // 0-100
  lastDiagnostics: {
    riskPercentage: number;
    failureProbability: number;
    criticalComponent: string;
    recommendations: string[];
  };
}

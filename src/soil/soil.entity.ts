import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('soil_measurements')
@Index(['createdAt'])
@Index(['latitude', 'longitude'])
export class SoilMeasurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'float', nullable: false })
  ph: number;

  @Column({ type: 'float', name: 'soil_moisture', nullable: false })
  soilMoisture: number;

  @Column({ type: 'float', nullable: false })
  sunlight: number;

  @Column({ type: 'jsonb', nullable: false })
  nutrients: Record<string, any>;

  @Column({ type: 'float', nullable: false })
  temperature: number;

  @Column({ type: 'float', nullable: false })
  latitude: number;

  @Column({ type: 'float', nullable: false })
  longitude: number;

  @Column({ type: 'uuid', name: 'field_id', nullable: true })
  @Index()
  fieldId: string;

  @Column({ type: 'text', name: 'parcel_id', nullable: true })
  @Index()
  parcelId: string;

  @Column({ type: 'varchar', name: 'legacy_code', length: 20, nullable: true })
  legacyCode: string;

  @Column({ type: 'varchar', name: 'image_path', nullable: true })
  imagePath: string;

  @Column({ type: 'varchar', name: 'soil_type', nullable: true })
  @Index()
  soilType: string;

  @Column({ type: 'float', name: 'detection_confidence', nullable: true })
  detectionConfidence: number;

  @Column({ type: 'varchar', name: 'parcel_location', length: 100, nullable: true })
  parcelLocation: string;

  @Column({ type: 'varchar', name: 'region', length: 100, default: 'Tunisia' })
  region: string;

  @Column({ type: 'text', name: 'recovery_action', nullable: true })
  recoveryAction: string;

  @Column({ type: 'int', name: 'recovery_duration_weeks', nullable: true })
  recoveryDurationWeeks: number;

  @Column({ type: 'varchar', name: 'outcome', length: 50, nullable: true })
  outcome: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

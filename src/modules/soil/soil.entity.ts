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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

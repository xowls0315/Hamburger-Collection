import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';

@Entity('ingest_logs')
export class IngestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'brand_id' })
  brandId: string;

  @Column({ length: 20 })
  status: string; // 'success' | 'error'

  @Column({ name: 'changed_count', type: 'int', default: 0 })
  changedCount: number;

  @Column('text', { nullable: true })
  error: string;

  @CreateDateColumn({ name: 'fetched_at' })
  fetchedAt: Date;
}

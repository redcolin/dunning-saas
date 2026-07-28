import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chargebee_accounts')
export class ChargebeeAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text', name: 'chargebee_api_key' })
  chargebeeApiKey: string;

  @Column({ name: 'chargebee_site_url' })
  chargebeeSiteUrl: string;

  @Column({ default: 'connected', name: 'status' })
  status: 'connected' | 'disconnected' | 'error';

  @Column({ type: 'timestamp', nullable: true, name: 'connected_at' })
  connectedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'last_sync_at' })
  lastSyncAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'sync_error' })
  syncError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
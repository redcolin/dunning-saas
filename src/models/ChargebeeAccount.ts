import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { Customer } from './Customer';

@Entity('chargebee_accounts')
@Index(['userId'], { unique: true })
export class ChargebeeAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'text' })
  chargebeeApiKey: string;

  @Column()
  chargebeeSiteUrl: string;

  @Column({ default: 'connected' })
  status: 'connected' | 'disconnected' | 'error';

  @Column({ type: 'timestamp', nullable: true })
  connectedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  @Column({ type: 'text', nullable: true })
  syncError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Customer, customer => customer.chargebeeAccount)
  customers: Customer[];
}
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
import { Customer } from './Customer';
import { RetryAttempt } from './RetryAttempt';

@Entity('failed_payments')
@Index(['chargebeeAccountId', 'status'])
@Index(['customerId', 'createdAt'])
export class FailedPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, customer => customer.failedPayments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column()
  chargebeeAccountId: string;

  @Column()
  chargebeeInvoiceId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column()
  declineCode: string;

  @Column({ type: 'text', nullable: true })
  declineReasonUser: string | null;

  @Column()
  failureType: 'soft_decline' | 'hard_decline' | 'data_quality' | 'unknown';

  @Column()
  firstAttemptAt: Date;

  @Column({ default: 'pending_retry' })
  status: 'pending_retry' | 'recovered' | 'unrecovered' | 'suspended';

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  recoveredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RetryAttempt, attempt => attempt.failedPayment)
  retryAttempts: RetryAttempt[];
}
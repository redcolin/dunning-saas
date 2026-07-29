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

  @Column({ name: 'chargebee_account_id' })
  chargebeeAccountId: string;

  @Column({ name: 'chargebee_invoice_id' })
  chargebeeInvoiceId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: 'decline_code' })
  declineCode: string;

  @Column({ type: 'text', nullable: true, name: 'decline_reason_user' })
  declineReasonUser: string | null;

  @Column({ name: 'failure_type' })
  failureType: 'soft_decline' | 'hard_decline' | 'data_quality' | 'unknown';

  @Column({ name: 'first_attempt_at' })
  firstAttemptAt: Date;

  @Column({ default: 'pending_retry' })
  status: 'pending_retry' | 'recovered' | 'unrecovered' | 'suspended';

  @Column({ default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_retry_at' })
  lastRetryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'recovered_at' })
  recoveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RetryAttempt, attempt => attempt.failedPayment)
  retryAttempts: RetryAttempt[];
}
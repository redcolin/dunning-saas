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
import { ChargebeeAccount } from './ChargebeeAccount';
import { FailedPayment } from './FailedPayment';

@Entity('customers')
@Index(['chargebeeAccountId', 'chargebeeCustomerId'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChargebeeAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chargebee_account_id' })
  chargebeeAccount: ChargebeeAccount;

  @Column({ name: 'chargebee_account_id' })
  chargebeeAccountId: string;

  @Column({ name: 'chargebee_customer_id' })
  chargebeeCustomerId: string;

  @Column({ type: 'varchar', nullable: true, name: 'customer_name' })
  customerName: string | null;

  @Column({ name: 'customer_email' })
  customerEmail: string;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'annual_value' })
  annualValue: number;

  @Column({ default: 'SMB', name: 'segment' })
  segment: 'VIP' | 'Mid-Market' | 'SMB' | 'At-Risk';

  @Column({ type: 'timestamp', nullable: true, name: 'last_payment_attempt_at' })
  lastPaymentAttemptAt: Date | null;

  @Column({ default: 0, name: 'failed_payment_count' })
  failedPaymentCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => FailedPayment, payment => payment.customer)
  failedPayments: FailedPayment[];

  @Column({ default: false })
  unsubscribed: boolean;

  @Column({ type: 'text', nullable: true, name: 'unsubscribe_reason' })
  unsubscribeReason: string | null;
}
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

  @ManyToOne(() => ChargebeeAccount, account => account.customers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chargebee_account_id' })
  chargebeeAccount: ChargebeeAccount;

  @Column({ name: 'chargebee_account_id' })
  chargebeeAccountId: string;

  @Column()
  chargebeeCustomerId: string;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column()
  customerEmail: string;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  annualValue: number;

  @Column({ default: 'SMB' })
  segment: 'VIP' | 'Mid-Market' | 'SMB' | 'At-Risk';

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentAttemptAt: Date | null;

  @Column({ default: 0 })
  failedPaymentCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => FailedPayment, payment => payment.customer)
  failedPayments: FailedPayment[];
}
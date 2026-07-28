import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FailedPayment } from './FailedPayment';

@Entity('retry_attempts')
export class RetryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FailedPayment, payment => payment.retryAttempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'failed_payment_id' })
  failedPayment: FailedPayment;

  @Column({ name: 'failed_payment_id' })
  failedPaymentId: string;

  @Column()
  attemptNumber: number;

  @Column()
  attemptTime: Date;

  @Column()
  result: 'success' | 'soft_decline' | 'hard_decline' | 'gateway_error';

  @Column({ type: 'varchar', nullable: true })
  declineCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  declineReason: string | null;

  @Column()
  gatewayUsed: string;

  @Column({ type: 'text', nullable: true })
  rawResponse: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
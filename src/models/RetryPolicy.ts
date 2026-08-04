import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChargebeeAccount } from './ChargebeeAccount';

@Entity('retry_policies')
@Index(['chargebeeAccountId'])
export class RetryPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChargebeeAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chargebee_account_id' })
  chargebeeAccount: ChargebeeAccount;

  @Column({ name: 'chargebee_account_id' })
  chargebeeAccountId: string;

  @Column({ default: 'standard' })
  strategy: 'standard' | 'exponential' | 'aggressive' | 'conservative';

  @Column({ default: 24, name: 'first_retry_hours' })
  firstRetryHours: number;

  @Column({ default: 48, name: 'second_retry_hours' })
  secondRetryHours: number;

  @Column({ default: 72, name: 'third_retry_hours' })
  thirdRetryHours: number;

  @Column({ default: 3, name: 'max_retries' })
  maxRetries: number;

  @Column({ default: false, name: 'enable_exponential_backoff' })
  enableExponentialBackoff: boolean;

  @Column({ default: 1.5, name: 'exponential_multiplier' })
  exponentialMultiplier: number;

  @Column({ default: true, name: 'enable_circuit_breaker' })
  enableCircuitBreaker: boolean;

  @Column({ default: 5, name: 'circuit_breaker_threshold' })
  circuitBreakerThreshold: number;

  @Column({ default: 60, name: 'circuit_breaker_cooldown_minutes' })
  circuitBreakerCooldownMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
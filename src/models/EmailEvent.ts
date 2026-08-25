import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './Customer';

@Entity('email_events')
@Index(['customerId', 'eventType'])
@Index(['email', 'eventType'])
export class EmailEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({
    type: 'varchar',
    enum: ['bounce', 'complaint', 'unsubscribe', 'delivered', 'open', 'click'],
    name: 'event_type',
  })
  eventType: 'bounce' | 'complaint' | 'unsubscribe' | 'delivered' | 'open' | 'click';

  @Column({
    type: 'varchar',
    enum: ['permanent', 'transient', 'undetermined'],
    nullable: true,
    name: 'bounce_type',
  })
  bounceType: 'permanent' | 'transient' | 'undetermined' | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'send_grid_event_id' })
  sendGridEventId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
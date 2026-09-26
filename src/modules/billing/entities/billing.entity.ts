import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PlanCode { FREE = 'FREE', PRO = 'PRO', ENTERPRISE = 'ENTERPRISE' }
export enum BillingInterval { MONTHLY = 'MONTHLY', YEARLY = 'YEARLY' }

@Entity('billing_customers')
@Index('UQ_billing_customer_business', ['businessId'], { unique: true })
@Index('UQ_billing_customer_stripe', ['stripeCustomerId'], { unique: true })
export class BillingCustomer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') businessId: string;
  @Column() stripeCustomerId: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('billing_subscriptions')
@Index('UQ_billing_subscription_stripe', ['stripeSubscriptionId'], { unique: true })
@Index('IDX_billing_subscription_business', ['businessId'])
export class BillingSubscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') businessId: string;
  @Column('uuid', { nullable: true }) planId: string;
  @Column('uuid', { nullable: true }) pendingPlanId: string;
  @Column({ nullable: true }) pendingStripePriceId: string;
  @Column({ type: 'enum', enum: BillingInterval, nullable: true }) pendingBillingInterval: BillingInterval;
  @Column({ type: 'timestamptz', nullable: true }) pendingChangeAt: Date;
  @Column({ type: 'bigint', nullable: true }) lastStripeEventCreated: string;
  @Column({ nullable: true }) stripeSubscriptionId: string;
  @Column({ default: PlanCode.FREE }) plan: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'enum', enum: BillingInterval, nullable: true }) billingInterval: BillingInterval;
  @Column({ nullable: true }) stripePriceId: string;
  @Column({ type: 'timestamptz', nullable: true }) startedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) currentPeriodStart: Date;
  @Column({ type: 'timestamptz', nullable: true }) currentPeriodEnd: Date;
  @Column({ default: false }) cancelAtPeriodEnd: boolean;
  @Column({ type: 'timestamptz', nullable: true }) trialEnd: Date;
  @Column({ type: 'timestamptz', nullable: true }) gracePeriodEnd: Date;
  @Column({ type: 'jsonb', nullable: true }) enterpriseOverrides: Record<string, boolean | number>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('subscription_events')
@Index('UQ_subscription_event_stripe', ['stripeEventId'], { unique: true })
export class SubscriptionEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() stripeEventId: string;
  @Column() eventType: string;
  @Column({ default: 'received' }) status: string;
  @Column('uuid', { nullable: true }) businessId: string;
  @Column({ nullable: true }) stripeCustomerId: string;
  @Column({ nullable: true }) stripeSubscriptionId: string;
  @Column({ type: 'jsonb', nullable: true }) error: Record<string, unknown>;
  @CreateDateColumn() receivedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) processedAt: Date;
}

@Entity('usage_ledger')
@Index('UQ_usage_idempotency', ['businessId', 'metric', 'idempotencyKey'], { unique: true })
@Index('IDX_usage_period', ['businessId', 'periodStart', 'periodEnd'])
export class UsageLedger {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') businessId: string;
  @Column('uuid', { nullable: true }) userId: string;
  @Column() metric: string;
  @Column('int') quantity: number;
  @Column() source: string;
  @Column() idempotencyKey: string;
  @Column({ type: 'timestamptz' }) periodStart: Date;
  @Column({ type: 'timestamptz' }) periodEnd: Date;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity('payment_attempts')
@Index('UQ_payment_attempt_key', ['businessId', 'idempotencyKey'], { unique: true })
export class PaymentAttempt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') businessId: string;
  @Column() idempotencyKey: string;
  @Column() outcome: string;
  @Column({ nullable: true }) stripePaymentIntentId: string;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, ManyToOne, JoinColumn, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { BillingInterval } from './billing.entity';

export enum PlanStatus { DRAFT='DRAFT', ACTIVE='ACTIVE', INACTIVE='INACTIVE', ARCHIVED='ARCHIVED' }
export enum StripeSyncStatus { PENDING='PENDING', SYNCED='SYNCED', FAILED='FAILED', OUT_OF_SYNC='OUT_OF_SYNC', NOT_REQUIRED='NOT_REQUIRED' }
export enum PriceChangePolicy { GRANDFATHER='GRANDFATHER', NEXT_RENEWAL='NEXT_RENEWAL' }

@Entity('subscription_plans')
@Index('UQ_subscription_plan_code', ['code'], { unique: true })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid') id:string;
  @Column({ length: 64 }) code:string;
  @Column({ length: 120 }) name:string;
  @Column({ type:'text', nullable:true }) description:string;
  @Column({ type:'enum', enum:PlanStatus, default:PlanStatus.DRAFT }) status:PlanStatus;
  @Column({ length:3, default:'GBP' }) currency:string;
  @Column({ default:true }) isPublic:boolean;
  @Column({ default:false }) isActive:boolean;
  @Column({ type:'int', default:0 }) sortOrder:number;
  @Column({ type:'int', default:0 }) trialDays:number;
  @Column({ type:'int', default:3 }) gracePeriodDays:number;
  @Column({ type:'jsonb', nullable:true }) metadata:Record<string,unknown>;
  @Column({ nullable:true }) stripeProductId:string;
  @Column({ type:'enum', enum:StripeSyncStatus, default:StripeSyncStatus.PENDING }) stripeSyncStatus:StripeSyncStatus;
  @Column({ type:'text', nullable:true }) stripeSyncError:string;
  @Column({ type:'timestamptz', nullable:true }) stripeSyncedAt:Date;
  @VersionColumn() version:number;
  @CreateDateColumn() createdAt:Date;
  @UpdateDateColumn() updatedAt:Date;
  @Column({ type:'timestamptz', nullable:true }) archivedAt:Date;
}

@Entity('plan_prices')
@Index('IDX_plan_price_active', ['planId','billingInterval','active'])
@Index('UQ_plan_price_stripe', ['stripePriceId'], { unique:true, where:'"stripePriceId" IS NOT NULL' })
export class PlanPrice {
  @PrimaryGeneratedColumn('uuid') id:string;
  @Column('uuid') planId:string;
  @ManyToOne(()=>SubscriptionPlan,{onDelete:'CASCADE'}) @JoinColumn({name:'planId'}) plan:SubscriptionPlan;
  @Column({ type:'enum', enum:BillingInterval, nullable:true }) billingInterval:BillingInterval;
  @Column({ type:'int' }) amount:number;
  @Column({ length:3 }) currency:string;
  @Column({ nullable:true }) stripeProductId:string;
  @Column({ nullable:true }) stripePriceId:string;
  @Column({ default:true }) active:boolean;
  @Column({ type:'timestamptz', default:()=> 'CURRENT_TIMESTAMP' }) effectiveFrom:Date;
  @Column({ type:'timestamptz', nullable:true }) effectiveUntil:Date;
  @Column({ type:'enum', enum:PriceChangePolicy, default:PriceChangePolicy.GRANDFATHER }) changePolicy:PriceChangePolicy;
  @CreateDateColumn() createdAt:Date;
  @Column({ type:'timestamptz', nullable:true }) archivedAt:Date;
}

@Entity('entitlements')
@Index('UQ_entitlement_key', ['key'], { unique:true })
export class EntitlementDefinition {
  @PrimaryGeneratedColumn('uuid') id:string;
  @Column({ length:100 }) key:string;
  @Column({ length:160 }) name:string;
  @Column({ type:'text', nullable:true }) description:string;
  @Column({ default:true }) active:boolean;
  @CreateDateColumn() createdAt:Date;
}

@Entity('plan_entitlements')
@Index('UQ_plan_entitlement', ['planId','entitlementId'], { unique:true })
export class PlanEntitlement {
  @PrimaryGeneratedColumn('uuid') id:string;
  @Column('uuid') planId:string;
  @Column('uuid') entitlementId:string;
  @ManyToOne(()=>SubscriptionPlan,{onDelete:'CASCADE'}) @JoinColumn({name:'planId'}) plan:SubscriptionPlan;
  @ManyToOne(()=>EntitlementDefinition,{onDelete:'CASCADE'}) @JoinColumn({name:'entitlementId'}) entitlement:EntitlementDefinition;
  @Column({ type:'jsonb', default:()=>"'true'::jsonb" }) value:boolean|number|string;
  @CreateDateColumn() createdAt:Date;
}

@Entity('plan_usage_limits')
@Index('UQ_plan_usage_metric', ['planId','metric'], { unique:true })
export class PlanUsageLimit {
  @PrimaryGeneratedColumn('uuid') id:string;
  @Column('uuid') planId:string;
  @ManyToOne(()=>SubscriptionPlan,{onDelete:'CASCADE'}) @JoinColumn({name:'planId'}) plan:SubscriptionPlan;
  @Column({ length:100 }) metric:string;
  @Column({ type:'bigint', nullable:true }) includedQuantity:string;
  @Column({ type:'bigint', nullable:true }) softLimit:string;
  @Column({ type:'bigint', nullable:true }) hardLimit:string;
  @Column({ default:false }) overageAllowed:boolean;
  @Column({ type:'bigint', nullable:true }) overageUnitAmount:string;
  @Column({ default:true }) active:boolean;
  @CreateDateColumn() createdAt:Date;
  @UpdateDateColumn() updatedAt:Date;
}

import { Injectable } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingSubscription, PlanCode } from './entities/billing.entity';
import { PlanEntitlement } from './entities/plan.entity';

export const PLAN_ENTITLEMENTS: Record<PlanCode, Record<string, boolean | number>> = {
  FREE: { 'analytics.advanced': false, 'recommendations.smart': false, 'predictions.crowd': false, 'notifications.smart_timing': false, 'usage.ai_predictions': 25, 'usage.notifications': 100 },
  PRO: { 'analytics.advanced': true, 'recommendations.smart': true, 'predictions.crowd': true, 'notifications.smart_timing': true, 'usage.ai_predictions': 1000, 'usage.notifications': 10000 },
  ENTERPRISE: { 'analytics.advanced': true, 'recommendations.smart': true, 'predictions.crowd': true, 'notifications.smart_timing': true, 'usage.ai_predictions': -1, 'usage.notifications': -1 },
};

@Injectable()
export class EntitlementService {
  constructor(@InjectRepository(PlanEntitlement) private readonly stored?: Repository<PlanEntitlement>) {}
  effective(subscription?: BillingSubscription | null): Record<string, boolean | number> {
    const plan = this.isPremiumState(subscription) ? subscription.plan : PlanCode.FREE;
    return { ...(PLAN_ENTITLEMENTS[plan as PlanCode] || PLAN_ENTITLEMENTS.FREE), ...(subscription?.enterpriseOverrides || {}) };
  }
  async forSubscription(subscription?: BillingSubscription|null) {
    if (subscription?.planId && this.stored && this.isPremiumState(subscription)) {
      const rows=await this.stored.find({where:{planId:subscription.planId},relations:{entitlement:true}});
      return Object.fromEntries(rows.filter(x=>x.entitlement.active).map(x=>[x.entitlement.key,x.value]));
    }
    return this.effective(subscription);
  }
  async hasEntitlement(subscription:BillingSubscription|null|undefined,key:string){return Boolean((await this.forSubscription(subscription))[key]);}
  async requireEntitlement(subscription:BillingSubscription|null|undefined,key:string){if(!await this.hasEntitlement(subscription,key))throw new ForbiddenException({code:'ENTITLEMENT_REQUIRED',entitlement:key});}
  private isPremiumState(subscription?:BillingSubscription|null){if(!subscription)return false;if(subscription.status==='active'||subscription.status==='trialing')return true;if(subscription.status==='past_due')return Boolean(subscription.gracePeriodEnd&&new Date(subscription.gracePeriodEnd).getTime()>Date.now());return false;}
}

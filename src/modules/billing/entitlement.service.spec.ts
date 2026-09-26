import { EntitlementService } from './entitlement.service';
import { BillingSubscription, PlanCode } from './entities/billing.entity';

describe('EntitlementService', () => {
  const service = new EntitlementService();
  it('defaults untrusted or absent state to FREE', () => {
    expect(service.effective(null)['analytics.advanced']).toBe(false);
    expect(service.effective({ plan: PlanCode.PRO, status: 'incomplete' } as BillingSubscription)['analytics.advanced']).toBe(false);
  });
  it('grants active plans and applies enterprise overrides', () => {
    const sub = { plan: PlanCode.ENTERPRISE, status: 'active', enterpriseOverrides: { 'usage.notifications': 50000 } } as unknown as BillingSubscription;
    expect(service.effective(sub)['recommendations.smart']).toBe(true);
    expect(service.effective(sub)['usage.notifications']).toBe(50000);
  });
  it.each(['canceled','unpaid','incomplete','incomplete_expired'])('denies premium state %s',async(status)=>{const sub={plan:PlanCode.PRO,status,planId:'plan-id'} as BillingSubscription;expect((await service.forSubscription(sub))['analytics.advanced']).toBe(false);});
  it('only grants past_due access inside the configured grace window',async()=>{const valid={plan:PlanCode.PRO,status:'past_due',gracePeriodEnd:new Date(Date.now()+60_000)} as BillingSubscription;const expired={...valid,gracePeriodEnd:new Date(Date.now()-1)} as BillingSubscription;expect((await service.forSubscription(valid))['analytics.advanced']).toBe(true);expect((await service.forSubscription(expired))['analytics.advanced']).toBe(false);});
});

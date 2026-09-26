import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePlanDto } from './plan.dto';

describe('CreatePlanDto',()=>{
  it('accepts integer minor-unit pricing',async()=>{const dto=plainToInstance(CreatePlanDto,{code:'PRO_PLUS',name:'Pro Plus',currency:'GBP',trialDays:14,gracePeriodDays:3,prices:[{billingInterval:'MONTHLY',amount:2499}]});expect(await validate(dto)).toHaveLength(0);});
  it('accepts explicit entitlement values under whitelist validation',async()=>{const dto=plainToInstance(CreatePlanDto,{code:'PRO_PLUS',name:'Pro Plus',currency:'GBP',entitlements:[{key:'analytics.advanced',value:true}]});expect(await validate(dto,{whitelist:true,forbidNonWhitelisted:true})).toHaveLength(0);});
  it('rejects negative or fractional money',async()=>{for(const amount of [-1,19.99]){const dto=plainToInstance(CreatePlanDto,{code:'PRO',name:'Pro',currency:'GBP',prices:[{billingInterval:'MONTHLY',amount}]});expect((await validate(dto)).length).toBeGreaterThan(0);}});
  it('rejects unsafe codes, currencies and unreasonable trials',async()=>{const dto=plainToInstance(CreatePlanDto,{code:'pro plan',name:'Pro',currency:'pounds',trialDays:999});expect((await validate(dto)).length).toBeGreaterThanOrEqual(3);});
});

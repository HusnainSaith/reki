import { ROLES_KEY } from '../../common/decorators'; import { Role } from '../../common/enums'; import { AdminPlanController } from './plan.controller';
import { AdminBillingController } from './admin-billing.controller';
describe('AdminPlanController security',()=>{it('requires the platform admin role at controller level',()=>{expect(Reflect.getMetadata(ROLES_KEY,AdminPlanController)).toEqual([Role.ADMIN]);});});
describe('AdminBillingController security',()=>{it('requires the platform admin role at controller level',()=>{expect(Reflect.getMetadata(ROLES_KEY,AdminBillingController)).toEqual([Role.ADMIN]);});});

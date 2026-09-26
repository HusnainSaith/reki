import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards'; import { RolesGuard } from '../../common/guards'; import { Roles } from '../../common/decorators'; import { Role } from '../../common/enums';
import { PlanCatalogService } from './plan-catalog.service'; import { CreatePlanDto, ReplaceEntitlementsDto, ReplaceUsageLimitsDto, UpdatePlanDto } from './dto/plan.dto';

@ApiTags('Subscription Plans') @Controller('subscription-plans')
export class PlanController { constructor(private plans:PlanCatalogService){} @Get() @ApiOperation({summary:'List active public subscription plans'}) list(){return this.plans.publicCatalog();} }

@ApiTags('Admin Billing') @ApiBearerAuth() @Controller('admin') @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Role.ADMIN)
export class AdminPlanController { constructor(private plans:PlanCatalogService){}
 @Post('subscription-plans') create(@Req()r:any,@Body()d:CreatePlanDto){return this.plans.create(d,r.user.id)}
 @Get('subscription-plans') all(){return this.plans.all()}
 @Get('subscription-plans/:id') one(@Param('id',ParseUUIDPipe)i:string){return this.plans.one(i)}
 @Patch('subscription-plans/:id') update(@Req()r:any,@Param('id',ParseUUIDPipe)i:string,@Body()d:UpdatePlanDto){return this.plans.update(i,d,r.user.id)}
 @Delete('subscription-plans/:id') archive(@Req()r:any,@Param('id',ParseUUIDPipe)i:string){return this.plans.archive(i,r.user.id)}
 @Post('subscription-plans/:id/activate') activate(@Req()r:any,@Param('id',ParseUUIDPipe)i:string){return this.plans.setActive(i,true,r.user.id)}
 @Post('subscription-plans/:id/deactivate') deactivate(@Req()r:any,@Param('id',ParseUUIDPipe)i:string){return this.plans.setActive(i,false,r.user.id)}
 @Get('subscription-plans/:id/subscribers') subscribers(@Param('id',ParseUUIDPipe)i:string,@Query('page')p?:string,@Query('limit')l?:string){return this.plans.subscribers(i,Number(p)||1,Number(l)||50)}
 @Get('subscription-plans/:id/usage') usage(@Param('id',ParseUUIDPipe)i:string){return this.plans.usage(i)}
 @Get('subscription-plans/:id/stripe-status') status(@Param('id',ParseUUIDPipe)i:string){return this.plans.stripeStatus(i)}
 @Post('subscription-plans/:id/sync-stripe') sync(@Req()r:any,@Param('id',ParseUUIDPipe)i:string){return this.plans.reconcile(i,r.user.id)}
 @Get('entitlements') entitlements(){return this.plans.entitlementDefinitions()}
 @Get('subscription-plans/:id/entitlements') planEntitlements(@Param('id',ParseUUIDPipe)i:string){return this.plans.entitlements(i)}
 @Put('subscription-plans/:id/entitlements') putEntitlements(@Req()r:any,@Param('id',ParseUUIDPipe)i:string,@Body()d:ReplaceEntitlementsDto){return this.plans.replaceEntitlements(i,d.entitlements,r.user.id)}
 @Get('subscription-plans/:id/usage-limits') limits(@Param('id',ParseUUIDPipe)i:string){return this.plans.usageLimits(i)}
 @Put('subscription-plans/:id/usage-limits') putLimits(@Req()r:any,@Param('id',ParseUUIDPipe)i:string,@Body()d:ReplaceUsageLimitsDto){return this.plans.replaceUsageLimits(i,d.usageLimits,r.user.id)}
}

import { Body,Controller,Get,Param,ParseUUIDPipe,Post,Query,Req,UseGuards } from '@nestjs/common';import { ApiBearerAuth,ApiTags } from '@nestjs/swagger';import { JwtAuthGuard } from '../auth/guards';import { RolesGuard } from '../../common/guards';import { Roles } from '../../common/decorators';import { Role } from '../../common/enums';import { BillingService } from './billing.service';import { AdminCancelSubscriptionDto,ExtendGraceDto } from './dto/billing.dto';
@ApiTags('Admin Billing')@ApiBearerAuth()@Controller('admin')@UseGuards(JwtAuthGuard,RolesGuard)@Roles(Role.ADMIN)
export class AdminBillingController{constructor(private billing:BillingService){}
 @Get('subscriptions') list(@Query()q:any){return this.billing.adminSubscriptions(q)}
 @Get('subscriptions/:id') one(@Param('id',ParseUUIDPipe)i:string){return this.billing.adminSubscription(i)}
 @Post('subscriptions/:id/cancel') cancel(@Req()r:any,@Param('id',ParseUUIDPipe)i:string,@Body()b:AdminCancelSubscriptionDto){return this.billing.adminCancel(i,r.user.id,b.atPeriodEnd!==false,b.reason)}
 @Post('subscriptions/:id/reactivate') reactivate(@Req()r:any,@Param('id',ParseUUIDPipe)i:string){return this.billing.adminReactivate(i,r.user.id)}
 @Post('subscriptions/:id/extend-grace-period') grace(@Req()r:any,@Param('id',ParseUUIDPipe)i:string,@Body()b:ExtendGraceDto){return this.billing.adminExtendGrace(i,r.user.id,b.days,b.reason)}
 @Get('billing/kpis/payments') payments(@Query('from')f?:string,@Query('to')t?:string){return this.billing.paymentKpi(f?new Date(f):undefined,t?new Date(t):undefined)}
 @Get('billing/kpis/conversion') conversion(@Query('cohortFrom')f?:string,@Query('cohortTo')t?:string){return this.billing.conversionKpi(f?new Date(f):undefined,t?new Date(t):undefined)}
}

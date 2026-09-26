import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators'; import { JwtAuthGuard } from '../auth/guards'; import { BusinessGuard } from '../../common/guards';
import { BillingService } from './billing.service'; import { CancelSubscriptionDto, ChangeSubscriptionDto, InitSubscriptionDto } from './dto/billing.dto';
@ApiTags('Billing') @Controller() export class BillingController { constructor(private billing:BillingService){}
  @Get('subscriptions/current') @UseGuards(JwtAuthGuard, BusinessGuard) @ApiBearerAuth() current(@CurrentUser() u:any){return this.billing.current(u.id);}
  @Post('payments/subscriptions/init-sheet') @UseGuards(JwtAuthGuard, BusinessGuard) @ApiBearerAuth() init(@CurrentUser()u:any,@Body()d:InitSubscriptionDto){return this.billing.initialize(u.id,d.plan,d.billingPeriod,d.idempotencyKey);}
  @Post('payments/portal-session') @UseGuards(JwtAuthGuard, BusinessGuard) @ApiBearerAuth() portal(@CurrentUser()u:any){return this.billing.portal(u.id);}
  @Get('billing/usage') @UseGuards(JwtAuthGuard, BusinessGuard) @ApiBearerAuth() usage(@CurrentUser()u:any){return this.billing.usageSummary(u.id);}
  @Post('subscriptions/change-plan') @UseGuards(JwtAuthGuard, BusinessGuard) @ApiBearerAuth() change(@CurrentUser()u:any,@Body()d:ChangeSubscriptionDto){return this.billing.changePlan(u.id,d);}
  @Post('subscriptions/cancel') @UseGuards(JwtAuthGuard, BusinessGuard) @ApiBearerAuth() cancel(@CurrentUser()u:any,@Body()d:CancelSubscriptionDto){return this.billing.cancel(u.id,d.atPeriodEnd!==false);}
  @Post('subscriptions/reactivate') @UseGuards(JwtAuthGuard, BusinessGuard) @ApiBearerAuth() reactivate(@CurrentUser()u:any){return this.billing.reactivate(u.id);}
  @Post('payments/webhooks/stripe') @HttpCode(200) @ApiOperation({summary:'Verified Stripe webhook'}) async webhook(@Req() req:RawBodyRequest<Request>,@Headers('stripe-signature')sig:string){if(!req.rawBody||!sig)throw new BadRequestException('Missing raw body or Stripe signature');try{return await this.billing.processEvent(this.billing.constructEvent(req.rawBody,sig));}catch(error:any){if(error?.type==='StripeSignatureVerificationError')throw new BadRequestException('Invalid Stripe webhook signature');throw error;}}
}

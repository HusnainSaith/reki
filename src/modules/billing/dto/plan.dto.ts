import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';
import { BillingInterval } from '../entities/billing.entity';
import { PlanStatus, PriceChangePolicy } from '../entities/plan.entity';

export class PlanPriceDto {
  @ApiProperty({enum:BillingInterval}) @IsEnum(BillingInterval) billingInterval:BillingInterval;
  @ApiProperty({description:'Integer minor currency units; 1999 means GBP 19.99'}) @IsInt() @Min(0) @Max(1_000_000_000) amount:number;
  @ApiPropertyOptional({enum:PriceChangePolicy}) @IsOptional() @IsEnum(PriceChangePolicy) changePolicy?:PriceChangePolicy;
}
export class EntitlementValueDto { @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/) key:string; @IsDefined() value:boolean|number|string; }
export class UsageLimitDto { @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/) metric:string; @IsOptional() @IsInt() @Min(-1) includedQuantity?:number; @IsOptional() @IsInt() @Min(-1) softLimit?:number; @IsOptional() @IsInt() @Min(-1) hardLimit?:number; @IsOptional() @IsBoolean() overageAllowed?:boolean; @IsOptional() @IsInt() @Min(0) overageUnitAmount?:number; }
export class CreatePlanDto {
  @ApiProperty({example:'PRO'}) @Matches(/^[A-Z][A-Z0-9_]{1,63}$/) code:string;
  @IsString() @IsNotEmpty() name:string;
  @IsOptional() @IsString() description?:string;
  @Matches(/^[A-Z]{3}$/) currency:string;
  @IsOptional() @IsBoolean() isPublic?:boolean;
  @IsOptional() @IsBoolean() isActive?:boolean;
  @IsOptional() @IsInt() sortOrder?:number;
  @IsOptional() @IsInt() @Min(0) @Max(365) trialDays?:number;
  @IsOptional() @IsInt() @Min(0) @Max(90) gracePeriodDays?:number;
  @IsOptional() @IsObject() metadata?:Record<string,unknown>;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @ValidateNested({each:true}) @Type(()=>PlanPriceDto) prices?:PlanPriceDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>EntitlementValueDto) entitlements?:EntitlementValueDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>UsageLimitDto) usageLimits?:UsageLimitDto[];
}
export class UpdatePlanDto extends PartialType(CreatePlanDto) { @IsOptional() @IsInt() version?:number; @IsOptional() @IsEnum(PlanStatus) status?:PlanStatus; }
export class ReplaceEntitlementsDto { @IsArray() @ValidateNested({each:true}) @Type(()=>EntitlementValueDto) entitlements:EntitlementValueDto[]; }
export class ReplaceUsageLimitsDto { @IsArray() @ValidateNested({each:true}) @Type(()=>UsageLimitDto) usageLimits:UsageLimitDto[]; }

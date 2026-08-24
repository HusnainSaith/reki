import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(500) text?: string;
  @IsBoolean() vibeAccurate: boolean;
}
export class UpdateReviewDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() @MaxLength(500) text?: string;
  @IsOptional() @IsBoolean() vibeAccurate?: boolean;
}
export class VibeAccuracyVoteDto {
  @IsBoolean() accurate: boolean;
  @IsOptional() @IsString() @MaxLength(50) observedVibe?: string;
  @IsOptional() @IsDateString() votedAt?: string;
}
export class CheckInDto {
  @Type(() => Number) @IsNumber() @IsLatitude() lat: number;
  @Type(() => Number) @IsNumber() @IsLongitude() lng: number;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) accuracy: number;
  @IsOptional() @IsDateString() timestamp?: string;
}
export enum HistorySource { HOME='home', SEARCH='search', MAP='map', FAVORITES='favorites', SHARED_LINK='shared_link' }
export class VenueHistoryDto {
  @IsOptional() @IsDateString() viewedAt?: string;
  @IsOptional() @IsEnum(HistorySource) source?: HistorySource;
}
export enum ShareChannel { NATIVE='native_share_sheet', WHATSAPP='whatsapp', INSTAGRAM='instagram', FACEBOOK='facebook', COPY_LINK='copy_link', OTHER='other' }
export class VenueShareDto {
  @IsEnum(ShareChannel) channel: ShareChannel;
  @IsOptional() @IsDateString() sharedAt?: string;
}

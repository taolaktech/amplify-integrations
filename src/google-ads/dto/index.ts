import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  isURL,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  AmplifyGoogleAdsAccount,
  GoogleAdsCampaignStatus,
} from '../google-ads.enum';
import { Type } from 'class-transformer';

export class CreateTargetRoasBiddingStrategyDto {
  @ApiProperty()
  @IsString()
  @IsEnum(AmplifyGoogleAdsAccount)
  account: AmplifyGoogleAdsAccount;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  biddingStrategyName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Max(1000)
  @Min(0.01)
  targetRoas: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  cpcBidCeiling: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  cpcBidFloor: number;
}

export class CreateBudgetDto {
  @ApiProperty()
  @IsString()
  @IsEnum(AmplifyGoogleAdsAccount)
  account: AmplifyGoogleAdsAccount;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignBudgetName: string;
}

export class CreateSearchCampaignDto {
  @ApiProperty()
  @IsString()
  @IsEnum(AmplifyGoogleAdsAccount)
  account: AmplifyGoogleAdsAccount;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  budgetResourceName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  biddingStrategy: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignName: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endDate: Date;
}

export class CreateAdGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adGroupName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignResourceName: string;
}

export class CreateAdGroupAdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adGroupAdName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adGroupResourceName: string;

  @ApiProperty()
  @IsArray()
  @Type(() => isURL)
  finalUrls: string[];

  @ApiProperty()
  @IsArray()
  @Type(() => String)
  headlines: string[];

  @ApiProperty()
  @IsArray()
  @Type(() => String)
  descriptions: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  path1?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  path2?: string;
}

export class AddKeywordsToAdGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  adGroupResourceName: string;

  @ApiProperty()
  @IsArray()
  @Type(() => String)
  exactMatchKeywords: string[];

  @ApiProperty()
  @IsArray()
  @Type(() => String)
  broadMatchKeywords: string[];

  @ApiProperty()
  @IsArray()
  @Type(() => String)
  phraseMatchKeywords: string[];
}

export class AddGeotargetingToCampaignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignResourceName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  locale: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  countryCode: string;

  @ApiProperty()
  @IsArray()
  @Type(() => String)
  locationNames: string[];
}

export class UpdateCampaignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignResourceName: string;

  @ApiProperty()
  @IsEnum([
    GoogleAdsCampaignStatus.ENABLED,
    GoogleAdsCampaignStatus.PAUSED,
    GoogleAdsCampaignStatus.REMOVED,
  ])
  status: GoogleAdsCampaignStatus;
}

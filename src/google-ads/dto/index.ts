import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  isURL,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoogleAdsAccount, GoogleAdsCampaignStatus } from '../google-ads.enum';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @ApiProperty()
  @IsString()
  @IsEnum(GoogleAdsAccount)
  account: GoogleAdsAccount;

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
  @IsEnum(GoogleAdsAccount)
  account: GoogleAdsAccount;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  budgetResourceName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaignName: string;
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

import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  isURL,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoogleAdsAccount } from '../google-ads.enum';
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
  @MinLength(1)
  @ValidateNested({ each: true })
  @Type(() => isURL)
  finalUrls: string[];

  @ApiProperty()
  @IsArray()
  @MinLength(3)
  @ValidateNested({ each: true })
  @Type(() => String)
  headlines: string[];

  @ApiProperty()
  @IsArray()
  @MinLength(3)
  @ValidateNested({ each: true })
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
  @ValidateNested({ each: true })
  @Type(() => String)
  exactMatchKeywords: string[];

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => String)
  broadMatchKeywords: string[];

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
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
  @ValidateNested({ each: true })
  @Type(() => String)
  locationNames: string[];
}

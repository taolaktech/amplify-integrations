import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoogleAdsAccount } from '../google-ads.enum';

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
  name: string;
}

export class CreateSearchCampaignDto {
  @ApiProperty()
  @IsString()
  @IsEnum(GoogleAdsAccount)
  account: GoogleAdsAccount;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  budget: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateAdGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campaign: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  MinDate,
} from 'class-validator';
import { IsAfter } from 'src/common/validators/date-comparison.validator';
import { CampaignType } from 'src/enums/campaign';

export class UpdateCampaignDto {
  @IsOptional()
  @ApiProperty({
    enum: CampaignType,
    description: 'The type of the campaign.',
    example: CampaignType.PRODUCT_LAUNCH,
  })
  @IsEnum(CampaignType, { message: 'A valid campaign type must be provided.' })
  type?: CampaignType;

  @IsOptional()
  @ApiProperty({
    description: 'The start date and time for the campaign in ISO 8601 format.',
    example: '2024-10-01T09:00:00Z',
  })
  @Type(() => Date)
  @MinDate(new Date(), { message: 'Start date must be in the future.' })
  @IsDateString({}, { message: 'A valid start date must be provided.' })
  startDate?: string;

  @IsOptional()
  @ApiProperty({
    description: 'The end date and time for the campaign in ISO 8601 format.',
    example: '2024-10-31T23:59:59Z',
  })
  @IsDateString({}, { message: 'A valid end date must be provided.' })
  @IsAfter('startDate', {
    message: 'End date must be after the start date.',
  })
  endDate?: string;

  @IsOptional()
  @ApiProperty({
    description: 'The primary color theme for the campaign creative.',
    example: '#3b5998',
  })
  @IsHexColor({
    message: 'color must be in hex format',
  })
  @IsNotEmpty()
  brandColor?: string;

  @IsOptional()
  @ApiProperty({
    description: 'The accent color theme for the campaign creative.',
    example: '#3b5998',
  })
  @IsHexColor({
    message: 'color must be in hex format',
  })
  @IsNotEmpty()
  accentColor?: string;
}

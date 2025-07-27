import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  CampaignStatus,
  CampaignType,
  CampaignPlatform,
} from 'src/enums/campaign';

export class ListCampaignsDto {
  @ApiProperty({
    description: 'The page number to retrieve.',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'The number of items to return per page.',
    default: 10,
    required: false,
    name: 'perPage', // Use 'perPage' as the query parameter name
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 10;

  @ApiProperty({
    description: 'Filter campaigns by status.',
    enum: CampaignStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiProperty({
    description: 'Filter campaigns by type.',
    enum: CampaignType,
    required: false,
  })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @ApiProperty({
    description: 'Filter campaigns by one or more platforms.',
    enum: CampaignPlatform,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(CampaignPlatform, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  platforms?: CampaignPlatform[];

  @ApiProperty({
    description:
      'Sort results by a field and direction (e.g., "createdAt:desc").',
    default: 'createdAt:desc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt:desc';
}

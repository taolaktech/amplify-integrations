import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray } from 'class-validator';

export class CampaignInsightsDto {
  @ApiProperty({
    description: 'An array of campign IDs',
    type: 'array',
    items: {
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'number',
        },
      ],
    },
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Array of campaign IDs must be at least 1 item',
  })
  campaignIds: any[];
}

export class AdsInsightsDto {
  @ApiProperty({
    description: 'An array of ads IDs',
    type: 'array',
    items: {
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'number',
        },
      ],
    },
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Array of ads IDs must be at least 1 item',
  })
  adIds: any[];
}

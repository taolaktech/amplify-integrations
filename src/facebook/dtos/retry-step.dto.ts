import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

// enum for the possible steps to ensure type safety
export enum CampaignCreationStep {
  INITIALIZING = 'INITIALIZING',
  CREATING_ADSETS = 'CREATING_ADSETS',
  CREATING_CREATIVES = 'CREATING_CREATIVES',
  CREATING_ADS = 'CREATING_ADS',
  LAUNCHING = 'LAUNCHING',
}

export class RetryStepDto {
  /**
   * The step in the campaign creation process that previously failed and needs to be retried.
   * This must match one of the steps where a campaign can enter a 'FAILED' state.
   */
  @ApiProperty({
    example: 'CREATING_ADSETS',
    description: 'The step that failed and needs to be retried.',
    enum: CampaignCreationStep,
  })
  @IsNotEmpty()
  @IsEnum(CampaignCreationStep, {
    message: `Step must be one of the following values: ${Object.values(CampaignCreationStep).join(', ')}`,
  })
  step: CampaignCreationStep;
}

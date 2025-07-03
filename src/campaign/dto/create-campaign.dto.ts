import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  platforms: string[]; // Validates that 'platforms' is an array of strings

  @IsString()
  @IsNotEmpty()
  targetAudience: string;

  @IsNumber()
  @Min(1)
  budget: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  adLocation: string;
}

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectPrimaryAdAccountDto {
  @ApiProperty({
    example: 'act_123456789',
    description: 'Facebook Ad Account ID to set as primary',
  })
  @IsString()
  @IsNotEmpty()
  adAccountId: string;

  @IsString()
  pageId: string; // The Facebook Page ID

  @IsOptional()
  @IsString()
  metaPixelId?: string; // user provides this after generating metaPixelId

  @IsString()
  @IsOptional()
  instagramAccountId?: string; // instagram Account ID
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum IntegrationPlatform {
  SHOPIFY = 'SHOPIFY',
  GOOGLE_ADS = 'GOOGLE_ADS',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
}

export class DisconnectIntegrationDto {
  @ApiProperty({
    enum: IntegrationPlatform,
  })
  @IsEnum(IntegrationPlatform)
  @IsNotEmpty()
  platform: IntegrationPlatform;
}

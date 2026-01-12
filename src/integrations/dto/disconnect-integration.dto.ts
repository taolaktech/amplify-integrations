import { IsEnum } from 'class-validator';

export enum IntegrationPlatform {
  SHOPIFY = 'SHOPIFY',
  GOOGLE_ADS = 'GOOGLE_ADS',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
}

export class DisconnectIntegrationDto {
  @IsEnum(IntegrationPlatform)
  platform: IntegrationPlatform;
}

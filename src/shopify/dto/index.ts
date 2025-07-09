import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetShopifyOAuthUrlDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class GetProductsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scope: string;
}

export class GetProductByIdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scope: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  handle?: string;
}

export class GetShopDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scope: string;
}

export class GetShopBrandingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shop: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scope: string;
}

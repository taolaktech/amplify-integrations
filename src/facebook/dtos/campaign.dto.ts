import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  IsUrl,
  ArrayMinSize,
  Min,
  IsHexColor,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CampaignLocationDto {
  @ApiProperty({
    description: 'Country code',
    example: 'US',
  })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class CreativeDto {
  @ApiProperty({
    description: 'Creative ID',
    example: 'creative_123',
  })
  @IsString()
  @IsOptional()
  id: string;

  @ApiProperty({
    description: 'Advertising channel',
    example: 'facebook',
    enum: ['facebook', 'instagram', 'google'],
  })
  @IsString()
  @IsEnum(['facebook', 'instagram', 'google'])
  channel: string;

  @ApiProperty({
    description: 'Creative data URLs',
    example: ['{"url":"http://s3.image.com/fb-ad-1"}'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  data: string[];
}

export class ProductDto {
  @ApiProperty({
    description: 'Shopify product ID',
    example: 'gid://shopify/Product/123456789',
  })
  @IsString()
  @IsNotEmpty()
  shopifyId: string;

  @ApiProperty({
    description: 'Product title',
    example: 'Premium Wireless Headphones',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Product price',
    example: 199.99,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Target audience for this product',
    example: 'Young professionals',
  })
  @IsOptional()
  @IsString()
  audience?: string;

  @ApiPropertyOptional({
    description: 'Occasion for this product',
    example: 'Birthday gift',
  })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiProperty({
    description: 'Product features',
    example: ['Noise cancellation', '30-hour battery', 'Bluetooth 5.0'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({
    description: 'Product category',
    example: 'Electronics',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Product image URLs',
    example: ['https://example.com/images/product-123.jpg'],
  })
  @IsArray()
  @IsUrl({}, { each: true })
  imageLinks: string[];

  @ApiProperty({
    description: 'Product page URL',
    example: 'https://shop.com/products/premium-headphones',
  })
  @IsUrl()
  productLink: string;

  @ApiProperty({
    description: 'Creatives for this product',
    type: [CreativeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreativeDto)
  creatives: CreativeDto[];
}

export class CampaignDataFromLambdaClass {
  @ApiProperty({
    description: 'Name of the Campaign',
    example: 'Black Friday',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'ObjectId of the Shopify Account',
    example: '68df9d74971b4143c38e00f7',
  })
  @IsString()
  @IsNotEmpty()
  shopifyAccountId: string;

  @ApiProperty({
    description: 'MongoDB ObjectId as string',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({
    description: 'MongoDB ObjectId as string',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Facebook Page ID',
    example: '86210912001',
  })
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @ApiProperty({
    description: 'Meta Pixel ID for tracking',
    example: '1234567890',
  })
  @IsOptional()
  @IsNotEmpty()
  metaPixelId?: string;

  @ApiProperty({
    description: 'User ID who created the campaign',
    example: 'user_123456789',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Business ID this campaign belongs to',
    example: 'business_987654321',
  })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({
    description: 'Campaign type',
    example: 'PRODUCT_LAUNCH',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Brand primary color',
    example: '#FF5733',
  })
  @IsHexColor()
  @IsOptional()
  brandColor: string;

  @ApiProperty({
    description: 'Brand accent color',
    example: '#33FF57',
  })
  @IsHexColor()
  @IsOptional()
  accentColor: string;

  @ApiProperty({
    description: 'Tone for ad copy',
    example: 'Professional',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tone: string;

  @ApiProperty({
    description: 'Campaign start date (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Campaign end date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Total budget across all platforms',
    example: 5000.0,
  })
  @IsNumber()
  @Min(0)
  totalBudget: number;

  @ApiProperty({
    description: 'Advertising platforms',
    example: ['FACEBOOK', 'INSTAGRAM', 'GOOGLE'],
    enum: ['FACEBOOK', 'INSTAGRAM', 'GOOGLE'],
    type: [String],
  })
  @IsArray()
  @IsEnum(['FACEBOOK', 'INSTAGRAM', 'GOOGLE'], { each: true })
  @ArrayMinSize(1)
  platforms: string[];

  @ApiProperty({
    description: 'Targeting locations',
    type: [CampaignLocationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignLocationDto)
  @ArrayMinSize(1)
  location: CampaignLocationDto[];

  @ApiProperty({
    description: 'Products to advertise',
    type: [ProductDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDto)
  @ArrayMinSize(1)
  products: ProductDto[];

  @ApiProperty({
    description: 'User Instagram ID',
    example: '17841476275533415',
  })
  @IsString()
  @IsOptional()
  instagramAccountId?: string;
}

export class InitializeCampaignDto {
  @ApiProperty({
    description: 'Campaign data from Amplify-Manager via Lambda',
    // type: object,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CampaignDataFromLambdaClass)
  campaignData: CampaignDataFromLambdaClass;

  @ApiProperty({
    description: 'User Ad Account ID',
    example: 'act_123456789012345',
  })
  @IsString()
  @IsNotEmpty()
  userAdAccountId: string;

  @ApiProperty({
    description: 'User Instagram ID',
    example: '17841476275533415',
  })
  @IsString()
  @IsOptional()
  instagramAccountId?: string;
}

// Keep the original interface for type compatibility if needed
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CampaignDataFromLambda
  extends Omit<
    CampaignDataFromLambdaClass,
    keyof CampaignDataFromLambdaClass
  > {}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEnum,
  IsMongoId,
  IsDateString,
  IsNumber,
  Min,
  ArrayMinSize,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignPlatform, CampaignType } from 'src/enums/campaign';

export class CreativeDto {
  @IsNotEmpty({
    message: 'ID cannot be empty.',
  })
  @IsString({
    message: 'ID must be a string.',
  })
  id: string;

  @ApiProperty({
    description:
      'The advertising channel for this creative (e.g., "facebook", "google").',
    example: 'facebook',
  })
  @IsString({ message: 'Channel must be a string.' })
  @IsNotEmpty({ message: 'Channel cannot be empty.' })
  channel: string;

  @ApiProperty({
    description: 'The budget allocated specifically to this creative.',
    example: 500,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Budget must be a number.' })
  @Min(0, { message: 'Budget cannot be negative.' })
  budget: number;

  @ApiProperty({
    description:
      'An array of data for the creative, such as image URLs or ad copy text.',
    example: ['https://example.com/image1.jpg', 'Summer Sale!'],
  })
  @IsArray({ message: 'Creative data must be an array.' })
  @ArrayMinSize(1, { message: 'Creative data must contain at least one item.' })
  @IsString({
    each: true,
    message: 'Each item in creative data must be a string.',
  })
  data: string[];
}

export class LocationDto {
  @ApiProperty({
    description: 'The city of the target location.',
    example: 'Manhattan',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'The name of the target location.',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'The country of the target location.',
    example: 'USA',
  })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class ProductDto {
  @ApiProperty({ description: 'The title of the product.' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'The price of the product.', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'A detailed description of the product.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'The target audience for the product.' })
  @IsString()
  @IsNotEmpty()
  audience: string;

  @ApiProperty({ description: 'The occasion this product is suitable for.' })
  @IsString()
  @IsNotEmpty()
  occasion: string;

  @ApiProperty({ type: [String], description: 'Key features of the product.' })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'The product category.' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'A URL to the main product image.' })
  @IsUrl({}, { message: 'A valid imageLink URL must be provided.' })
  imageLink: string;

  @ApiProperty({ description: 'A URL to the product page.' })
  @IsUrl({}, { message: 'A valid productLink URL must be provided.' })
  productLink: string;

  @ApiProperty({
    type: [CreativeDto],
    description: 'A list of creatives for this product.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreativeDto)
  creatives: CreativeDto[];
}

export class CreateCampaignDto {
  @ApiProperty({
    description: 'The ID of the business this campaign belongs to.',
    example: '64f5f1e1e6b3c6a7e8e1b3c6',
  })
  @IsMongoId({ message: 'A valid businessId must be provided.' })
  businessId: string;

  @ApiProperty({
    enum: CampaignType,
    description: 'The type of the campaign.',
    example: CampaignType.PRODUCT_LAUNCH,
  })
  @IsEnum(CampaignType, { message: 'A valid campaign type must be provided.' })
  type: CampaignType;

  @ApiProperty({
    enum: CampaignPlatform,
    isArray: true,
    description: 'A list of platforms to target for the campaign.',
    example: [CampaignPlatform.FACEBOOK, CampaignPlatform.GOOGLE],
  })
  @IsArray({ message: 'Platforms must be an array.' })
  @ArrayMinSize(1, { message: 'At least one platform must be selected.' })
  @IsEnum(CampaignPlatform, {
    each: true, // This is crucial for validating each element in the array
    message: `Each platform must be one of the following values: ${Object.values(
      CampaignPlatform,
    ).join(', ')}`,
  })
  platforms: CampaignPlatform[];

  @ApiProperty({
    description: 'The primary color theme for the campaign creative.',
    example: '#3b5998',
  })
  @IsString()
  @IsNotEmpty()
  brandColor: string;

  @ApiProperty({
    description: 'The accent color theme for the campaign creative.',
    example: '#3b5998',
  })
  @IsString()
  @IsNotEmpty()
  accentColor: string;

  @ApiProperty({
    description: 'The desired tone of voice for the campaign ad copy.',
    example: 'Playful and energetic',
  })
  @IsString()
  @IsNotEmpty()
  tone: string;

  @ApiProperty({
    description: 'The start date and time for the campaign in ISO 8601 format.',
    example: '2024-10-01T09:00:00Z',
  })
  @IsDateString({}, { message: 'A valid start date must be provided.' })
  startDate: string;

  @ApiProperty({
    description: 'The end date and time for the campaign in ISO 8601 format.',
    example: '2024-10-31T23:59:59Z',
  })
  @IsDateString({}, { message: 'A valid end date must be provided.' })
  endDate: string;

  @ApiProperty({
    description: 'The total budget for the entire campaign.',
    example: 10000,
    minimum: 1,
  })
  @IsNumber({}, { message: 'Total budget must be a number.' })
  @Min(1, { message: 'Total budget must be at least 1.' })
  totalBudget: number;

  @ApiProperty({
    type: [ProductDto],
    description: 'The list of products included in this campaign.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Campaign must include at least one product.' })
  @Type(() => ProductDto)
  products: ProductDto[];

  @ApiProperty({
    type: [LocationDto],
    description: 'A list of geographical locations to target.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Campaign must target at least one location.' })
  @Type(() => LocationDto)
  location: LocationDto[];
}

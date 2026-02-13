import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { NanobananaImageSize } from 'src/nanobanana/nanobanana-image.client';

export class CreateImageGenerationDto {
  @ApiProperty({ description: 'Business id (MongoDB ObjectId)' })
  @IsMongoId()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ description: 'Prompt for image generation/editing' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ required: false, enum: ['nanobanana'], default: 'nanobanana' })
  @IsOptional()
  @IsIn(['nanobanana'])
  provider?: 'nanobanana';

  @ApiProperty({
    required: false,
    enum: ['TEXTTOIAMGE', 'IMAGETOIAMGE'],
    default: 'TEXTTOIAMGE',
  })
  @IsOptional()
  @IsIn(['TEXTTOIAMGE', 'IMAGETOIAMGE'])
  type?: 'TEXTTOIAMGE' | 'IMAGETOIAMGE';

  @ApiProperty({ required: false, minimum: 1, maximum: 4, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  numImages?: number;

  @ApiProperty({
    required: false,
    description: '1:1, 9:16, 16:9, 3:4, 4:3, 3:2, 2:3, 5:4, 4:5, 21:9',
    enum: [
      '1:1',
      '9:16',
      '16:9',
      '3:4',
      '4:3',
      '3:2',
      '2:3',
      '5:4',
      '4:5',
      '21:9',
    ],
  })
  @IsOptional()
  @IsIn([
    '1:1',
    '9:16',
    '16:9',
    '3:4',
    '4:3',
    '3:2',
    '2:3',
    '5:4',
    '4:5',
    '21:9',
  ])
  imageSize?: NanobananaImageSize;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Input image URLs for IMAGETOIAMGE mode',
  })
  @IsOptional()
  imageUrls?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  waterMark?: string;
}

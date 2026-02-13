import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CreateImageGenerationDto, CreateVideoGenerationDto } from './dto';
import { MediaGenerationService } from './media-generation.service';

@ApiTags('Media Generation (Internal)')
@ApiSecurity('x-api-key')
@Controller('internal/media-generation')
export class MediaGenerationController {
  constructor(
    private readonly mediaGenerationService: MediaGenerationService,
  ) {}

  @Post('/initiate-video-gen')
  @ApiOperation({ summary: 'Create a video generation job (internal)' })
  @ApiResponse({ status: 201 })
  async initiateVideoGeneration(@Body() dto: CreateVideoGenerationDto) {
    const job = await this.mediaGenerationService.initiateVideoGeneration(dto);
    return { success: true, data: job };
  }

  @Post('/initiate-image-gen')
  @ApiOperation({ summary: 'Create an image generation job (internal)' })
  @ApiResponse({ status: 201 })
  async initiateImageGeneration(@Body() dto: CreateImageGenerationDto) {
    const job = await this.mediaGenerationService.initiateImageGeneration(dto);
    return { success: true, data: job };
  }
}

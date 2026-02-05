import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CreateVideoGenerationDto } from './dto/create-video-generation.dto';
import { VideoGenerationService } from './video-generation.service';

@ApiTags('Video Generation (Internal)')
@ApiSecurity('x-api-key')
@Controller('video-generation/internal')
export class VideoGenerationController {
  constructor(
    private readonly videoGenerationService: VideoGenerationService,
  ) {}

  @Post('/videos')
  @ApiOperation({ summary: 'Create a video generation job (internal)' })
  @ApiResponse({ status: 201 })
  async createVideo(@Body() dto: CreateVideoGenerationDto) {
    const job = await this.videoGenerationService.create(dto);
    return { success: true, data: job };
  }
}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenAiModule } from 'src/openai/openai.module';
import { S3UploadService } from 'src/common/services/s3-upload.service';
import { VideoGenerationController } from './video-generation.controller';
import { VideoGenerationService } from './video-generation.service';

@Module({
  imports: [ScheduleModule, OpenAiModule],
  controllers: [VideoGenerationController],
  providers: [VideoGenerationService, S3UploadService],
  exports: [VideoGenerationService],
})
export class VideoGenerationModule {}

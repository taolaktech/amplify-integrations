import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenAiModule } from 'src/openai/openai.module';
import { S3UploadService } from 'src/common/services/s3-upload.service';
import { MediaGenerationController } from './media-generation.controller';
import { MediaGenerationService } from './media-generation.service';
import { NanobananaModule } from 'src/nanobanana/nanobanana.module';

@Module({
  imports: [ScheduleModule, OpenAiModule, NanobananaModule],
  controllers: [MediaGenerationController],
  providers: [MediaGenerationService, S3UploadService],
  exports: [MediaGenerationService],
})
export class MediaGenerationModule {}

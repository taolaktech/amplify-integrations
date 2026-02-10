import { Module } from '@nestjs/common';
import { MediaGenerationModule } from 'src/media-generation/media-generation.module';
import { NanobananaWebhookController } from './nanobanana-webhook.controller';

@Module({
  imports: [MediaGenerationModule],
  controllers: [NanobananaWebhookController],
})
export class NanobananaWebhookModule {}

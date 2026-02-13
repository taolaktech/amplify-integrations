import { Module } from '@nestjs/common';
import { OpenAiVideoProvider } from './openai-video.provider';

@Module({
  providers: [OpenAiVideoProvider],
  exports: [OpenAiVideoProvider],
})
export class OpenAiModule {}

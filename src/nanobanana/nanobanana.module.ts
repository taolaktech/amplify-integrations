import { Module } from '@nestjs/common';
import { NanobananaImageProvider } from './nanobanana-image.provider';

@Module({
  providers: [NanobananaImageProvider],
  exports: [NanobananaImageProvider],
})
export class NanobananaModule {}

import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import {
  NanobananaImageClient,
  NanobananaImageSize,
} from './nanobanana-image.client';

@Injectable()
export class NanobananaImageProvider {
  private readonly client: NanobananaImageClient;

  constructor(private readonly config: AppConfigService) {
    this.client = new NanobananaImageClient({
      apiKey: this.config.get('NANOBANANA_API_KEY'),
      baseUrl: this.config.get('NANOBANANA_BASE_URL'),
    });
  }

  generate(params: {
    prompt: string;
    numImages?: number;
    type: 'TEXTTOIAMGE' | 'IMAGETOIAMGE';
    image_size?: NanobananaImageSize;
    imageUrls?: string[];
    waterMark?: string;
  }) {
    return this.client.generateOrThrow({
      ...params,
      callBackUrl: this.config.get('NANOBANANA_CALLBACK_URL'),
    });
  }

  generatePro(params: {
    prompt: string;
    numImages?: number;
    type: 'TEXTTOIAMGE' | 'IMAGETOIAMGE';
    image_size?: NanobananaImageSize;
    imageUrls?: string[];
    resolution: '2k';
  }) {
    return this.client.generateProOrThrow({
      ...params,
      callBackUrl: this.config.get('NANOBANANA_CALLBACK_URL'),
    });
  }

  getTaskDetails(taskId: string) {
    return this.client.getTaskDetails(taskId);
  }

  downloadImage(url: string) {
    return this.client.downloadImage(url);
  }
}

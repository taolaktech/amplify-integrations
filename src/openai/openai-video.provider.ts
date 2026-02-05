import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { OpenAiVideoClient } from './openai-video.client';

@Injectable()
export class OpenAiVideoProvider {
  private readonly client: OpenAiVideoClient;

  constructor(private readonly config: AppConfigService) {
    this.client = new OpenAiVideoClient({
      apiKey: this.config.get('OPENAI_API_KEY'),
      baseUrl: this.config.get('OPENAI_BASE_URL'),
    });
  }

  create(params: {
    prompt: string;
    model: string;
    seconds?: string;
    size?: string;
    quality?: string;
  }) {
    return this.client.createVideoJob(params);
  }

  retrieve(providerJobId: string) {
    return this.client.retrieveVideoJob(providerJobId);
  }

  downloadContent(providerJobId: string) {
    return this.client.downloadVideoContent({ videoId: providerJobId });
  }
}

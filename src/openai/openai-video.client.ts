import axios, { AxiosInstance } from 'axios';

export type OpenAiVideoJob = {
  id: string;
  object: 'video';
  model: string;
  status: string;
  progress?: number;
  created_at?: number;
  completed_at?: number;
  size?: string;
  seconds?: string;
  quality?: string;
  error?: { code?: string; message?: string };
  prompt?: string;
};

export class OpenAiVideoClient {
  private readonly http: AxiosInstance;

  constructor(params: { apiKey: string; baseUrl: string }) {
    this.http = axios.create({
      baseURL: params.baseUrl,
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
      timeout: 30000,
    });
  }

  async createVideoJob(body: {
    prompt: string;
    model?: string;
    seconds?: string;
    size?: '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
    // quality?: string;
  }): Promise<OpenAiVideoJob> {
    const res = await this.http.post<OpenAiVideoJob>('/videos', body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  }

  async retrieveVideoJob(videoId: string): Promise<OpenAiVideoJob> {
    const res = await this.http.get<OpenAiVideoJob>(`/videos/${videoId}`);
    return res.data;
  }

  async downloadVideoContent(params: {
    videoId: string;
    asset?: string;
  }): Promise<ArrayBuffer> {
    const query = params.asset
      ? `?asset=${encodeURIComponent(params.asset)}`
      : '';
    const res = await this.http.get<ArrayBuffer>(
      `/videos/${params.videoId}/content${query}`,
      { responseType: 'arraybuffer' },
    );
    return res.data;
  }
}

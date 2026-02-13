import axios, { AxiosInstance } from 'axios';

export type NanobananaGenerateResponse = {
  code: number;
  msg: string;
  data?: {
    taskId: string;
  };
};

export type NanobananaTaskDetailsResponse = {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    response?: {
      originImageUrl?: string;
      resultImageUrl?: string;
    };
    successFlag?: number;
    errorCode?: number;
    errorMessage?: string;
  };
};

export type NanobananaImageSize =
  | '1:1'
  | '9:16'
  | '16:9'
  | '3:4'
  | '4:3'
  | '3:2'
  | '2:3'
  | '5:4'
  | '4:5'
  | '21:9';

export class NanobananaImageClient {
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

  async generate(body: {
    prompt: string;
    numImages?: number;
    type: 'TEXTTOIAMGE' | 'IMAGETOIAMGE';
    image_size?: NanobananaImageSize;
    callBackUrl: string;
    imageUrls?: string[];
    waterMark?: string;
  }): Promise<NanobananaGenerateResponse> {
    const res = await this.http.post<NanobananaGenerateResponse>(
      '/nanobanana/generate',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    return res.data;
  }

  async generateOrThrow(body: {
    prompt: string;
    numImages?: number;
    type: 'TEXTTOIAMGE' | 'IMAGETOIAMGE';
    image_size?: NanobananaImageSize;
    callBackUrl: string;
    imageUrls?: string[];
    waterMark?: string;
  }): Promise<{ taskId: string }> {
    const data = await this.generate(body);

    if (data?.code !== 200 || !data?.data?.taskId) {
      throw new Error(data?.msg || 'Failed to create nanobanana image task');
    }

    return { taskId: data.data.taskId };
  }

  async generatePro(body: {
    prompt: string;
    type: 'TEXTTOIAMGE' | 'IMAGETOIAMGE';
    aspectRatio?: NanobananaImageSize;
    callBackUrl: string;
    imageUrls?: string[];
    resolution: '2k' | '4k' | '1k';
  }): Promise<NanobananaGenerateResponse> {
    const res = await this.http.post<NanobananaGenerateResponse>(
      '/nanobanana/generate-pro',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    return res.data;
  }

  async generateProOrThrow(body: {
    prompt: string;
    type: 'TEXTTOIAMGE' | 'IMAGETOIAMGE';
    aspectRatio?: NanobananaImageSize;
    callBackUrl: string;
    imageUrls?: string[];
    resolution: '2k' | '4k' | '1k';
  }): Promise<{ taskId: string }> {
    const data = await this.generatePro(body);

    if (data?.code !== 200 || !data?.data?.taskId) {
      throw new Error(data?.msg || 'Failed to create nanobanana image task');
    }

    return { taskId: data.data.taskId };
  }

  async getTaskDetails(taskId: string): Promise<NanobananaTaskDetailsResponse> {
    const res = await this.http.get<NanobananaTaskDetailsResponse>(
      '/nanobanana/record-info',
      {
        params: { taskId },
      },
    );
    return res.data;
  }

  async downloadImage(
    url: string,
  ): Promise<{ buf: Buffer; contentType?: string }> {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
    });
    const contentType =
      typeof res.headers?.['content-type'] === 'string'
        ? res.headers['content-type']
        : undefined;
    return {
      buf: Buffer.from(res.data),
      contentType,
    };
  }
}

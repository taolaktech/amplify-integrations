import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Interval } from '@nestjs/schedule';
import { S3UploadService } from 'src/common/services/s3-upload.service';
import {
  MediaGenerationJob,
  MediaGenerationJobDoc,
} from '../database/schema/media-generation-job.schema';
import { CreateVideoGenerationDto } from './dto/create-video-generation.dto';
import { OpenAiVideoProvider } from 'src/openai/openai-video.provider';
import { AssetDoc } from 'src/database/schema';
import { CreateImageGenerationDto } from './dto';
import { NanobananaImageProvider } from 'src/nanobanana/nanobanana-image.provider';

@Injectable()
export class MediaGenerationService {
  private readonly logger = new Logger(MediaGenerationService.name);

  constructor(
    @InjectModel('media-generation-jobs')
    private readonly jobModel: Model<MediaGenerationJobDoc>,
    @InjectModel('assets')
    private readonly assetModel: Model<AssetDoc>,
    private readonly openAiVideoProvider: OpenAiVideoProvider,
    private readonly nanobananaImageProvider: NanobananaImageProvider,
    private readonly s3UploadService: S3UploadService,
  ) {}

  async initiateVideoGeneration(dto: CreateVideoGenerationDto) {
    const provider = dto.provider ?? 'openai';
    if (provider !== 'openai') {
      throw new Error('Unsupported provider');
    }

    const job = await this.openAiVideoProvider.create({
      prompt: dto.prompt,
      model: dto.model ?? 'sora-2',
      seconds: dto.seconds ?? '8',
      size: dto.size,
    });

    const asset = await this.assetModel.create({
      businessId: new Types.ObjectId(dto.businessId),
      type: 'video',
      status: 'pending',
      source: 'ai-generated',
      promptUsed: dto.prompt,
      generationJobId: job.id,
      mediaPresetId: dto.videoPresetId,
    });

    await this.jobModel.findOneAndUpdate(
      { provider: 'openai', providerJobId: job.id },
      {
        $setOnInsert: {
          provider: 'openai',
          providerJobId: job.id,
          type: 'video',
        },
        $set: {
          assetId: asset._id,
          prompt: dto.prompt,
          model: job.model ?? dto.model ?? 'sora-2',
          status: this.mapStatus(job.status),
          progress: typeof job.progress === 'number' ? job.progress : 0,
          seconds: job.seconds ?? dto.seconds,
          size: job.size ?? dto.size,
          quality: job.quality ?? dto.quality,
          error: job.error,
        },
      },
      { upsert: true, new: true },
    );

    return { id: job.id, assetId: asset._id };
  }

  async initiateImageGeneration(dto: CreateImageGenerationDto) {
    const provider = dto.provider ?? 'nanobanana';
    if (provider !== 'nanobanana') {
      throw new Error('Unsupported provider');
    }

    const { taskId } = await this.nanobananaImageProvider.generate({
      prompt: dto.prompt,
      numImages: dto.numImages ?? 1,
      type: 'IMAGETOIAMGE',
      image_size: dto.imageSize,
      imageUrls: dto.imageUrls,
      waterMark: dto.waterMark,
    });

    const asset = await this.assetModel.create({
      businessId: new Types.ObjectId(dto.businessId),
      type: 'image',
      status: 'pending',
      source: 'ai-generated',
      promptUsed: dto.prompt,
      generationJobId: taskId,
      mediaPresetId: dto.imagePresetId,
    });

    await this.jobModel.findOneAndUpdate(
      { provider: 'nanobanana', providerJobId: taskId },
      {
        $setOnInsert: {
          provider: 'nanobanana',
          providerJobId: taskId,
          type: 'image',
        },
        $set: {
          assetId: asset._id,
          prompt: dto.prompt,
          status: 'queued',
          progress: 0,
        },
      },
      { upsert: true, new: true },
    );

    return { taskId, assetId: asset._id };
  }

  async handleNanobananaCallback(taskId: string) {
    await this.refreshAndUploadNanobananaImage(taskId);
  }

  private async refreshAndUploadToS3(providerJobId: string) {
    const job = await this.openAiVideoProvider.retrieve(providerJobId);
    const mapped = this.mapStatus(job.status);

    const existing = await this.jobModel.findOne({
      provider: 'openai',
      providerJobId,
    });

    if (!existing) {
      throw new NotFoundException('Video generation job not found');
    }

    existing.status = mapped;
    existing.progress = typeof job.progress === 'number' ? job.progress : 0;
    existing.seconds = job.seconds;
    existing.size = job.size;
    existing.quality = job.quality;
    existing.error = job.error;
    existing.completedAt =
      typeof job.completed_at === 'number'
        ? new Date(job.completed_at * 1000)
        : mapped === 'completed'
          ? new Date()
          : undefined;

    // Only mark creatives as failed immediately.
    // Marking as completed should happen only after the MP4 is uploaded to S3.
    if (mapped === 'failed') {
      await this.assetModel.updateOne(
        { _id: existing.assetId },
        {
          $set: {
            status: 'failed',
          },
        },
      );
    } else {
      await this.assetModel.updateOne(
        { _id: existing.assetId },
        {
          $set: {
            status: 'pending',
          },
        },
      );
    }

    if (mapped === 'completed' && !existing.mediaKey) {
      try {
        const content =
          await this.openAiVideoProvider.downloadContent(providerJobId);
        const buf = Buffer.from(content);

        const key = `assets/videos/${existing.assetId}/${providerJobId}.mp4`;
        const upload = await this.s3UploadService.uploadBuffer({
          key,
          body: buf,
          contentType: 'video/mp4',
        });

        existing.mediaKey = upload.key;
        existing.mediaUrl = upload.url;

        await this.assetModel.updateOne(
          { _id: existing.assetId },
          {
            $set: {
              status: 'completed',
              storageKey: upload.key,
              url: upload.url,
            },
          },
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to upload completed video ${providerJobId} to S3: ${err?.message ?? err}`,
        );
        existing.status = 'failed';
        existing.error = {
          code: existing.error?.code ?? 's3_upload_failed',
          message: err?.message ?? String(err),
        };
        await this.assetModel.updateOne(
          { _id: existing.assetId },
          {
            $set: {
              status: 'failed',
            },
          },
        );
      }
    }

    // If upload already happened (mediaKey present), ensure Creative is marked completed.
    if (mapped === 'completed' && existing.mediaKey && existing.mediaUrl) {
      await this.assetModel.updateOne(
        { _id: existing.assetId },
        {
          $set: {
            status: 'completed',
            storageKey: existing.mediaKey,
            url: existing.mediaUrl,
          },
        },
      );
    }

    await existing.save();

    return job;
  }

  private async refreshAndUploadNanobananaImage(taskId: string) {
    const details = await this.nanobananaImageProvider.getTaskDetails(taskId);
    const data = details?.data;

    const existing = await this.jobModel.findOne({
      provider: 'nanobanana',
      providerJobId: taskId,
    });

    if (!existing) {
      throw new NotFoundException('Image generation job not found');
    }

    const mapped = this.mapNanobananaStatus({
      successFlag: data?.successFlag,
      errorCode: data?.errorCode,
      errorMessage: data?.errorMessage,
    });

    existing.status = mapped.status;
    existing.error = mapped.error;

    if (mapped.status === 'failed') {
      await this.assetModel.updateOne(
        { _id: existing.assetId },
        { $set: { status: 'failed' } },
      );
      await existing.save();
      return details;
    }

    if (mapped.status !== 'completed') {
      await this.assetModel.updateOne(
        { _id: existing.assetId },
        { $set: { status: 'pending' } },
      );
      await existing.save();
      return details;
    }

    const resultImageUrl = data?.response?.resultImageUrl;
    if (!resultImageUrl) {
      existing.status = 'failed';
      existing.error = {
        code: 'missing_result_image_url',
        message: 'Nanobanana task completed but resultImageUrl is missing',
      };
      await this.assetModel.updateOne(
        { _id: existing.assetId },
        { $set: { status: 'failed' } },
      );
      await existing.save();
      return details;
    }

    if (!existing.mediaKey) {
      try {
        const downloaded =
          await this.nanobananaImageProvider.downloadImage(resultImageUrl);

        const contentType =
          downloaded.contentType && downloaded.contentType.includes('image/')
            ? downloaded.contentType
            : 'image/png';

        const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
        const key = `assets/images/${existing.assetId}/${taskId}.${ext}`;

        const upload = await this.s3UploadService.uploadBuffer({
          key,
          body: downloaded.buf,
          contentType,
        });

        existing.mediaKey = upload.key;
        existing.mediaUrl = upload.url;

        await this.assetModel.updateOne(
          { _id: existing.assetId },
          {
            $set: {
              status: 'completed',
              storageKey: upload.key,
              url: upload.url,
            },
          },
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to upload completed image ${taskId} to S3: ${err?.message ?? err}`,
        );
        existing.status = 'failed';
        existing.error = {
          code: existing.error?.code ?? 's3_upload_failed',
          message: err?.message ?? String(err),
        };
        await this.assetModel.updateOne(
          { _id: existing.assetId },
          { $set: { status: 'failed' } },
        );
      }
    }

    await existing.save();
    return details;
  }

  private mapNanobananaStatus(params: {
    successFlag?: number;
    errorCode?: number;
    errorMessage?: string;
  }): {
    status: MediaGenerationJob['status'];
    error?: MediaGenerationJob['error'];
  } {
    if (params.successFlag === 1) {
      return { status: 'completed' };
    }

    if (params.successFlag === 2 || params.successFlag === 3) {
      return {
        status: 'failed',
        error: {
          code:
            typeof params.errorCode === 'number'
              ? String(params.errorCode)
              : 'nanobanana_failed',
          message: params.errorMessage,
        },
      };
    }

    return { status: 'running' };
  }

  private mapStatus(status: string): MediaGenerationJob['status'] {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'queued') return 'queued';
    if (normalized === 'running' || normalized === 'processing')
      return 'running';
    if (normalized === 'completed' || normalized === 'succeeded')
      return 'completed';
    if (normalized === 'failed' || normalized === 'error') return 'failed';
    return 'running';
  }

  @Interval(15000)
  async pollActiveJobs() {
    const activeJobs = await this.jobModel
      .find({
        $or: [
          { status: { $in: ['queued', 'running'] } },
          { status: 'completed', mediaKey: { $exists: false } },
          { status: 'completed', mediaKey: null },
        ],
      })
      .limit(25)
      .lean<MediaGenerationJob[]>();

    if (activeJobs.length === 0) {
      return;
    }
    // this.logger.log(`Found ${activeJobs.length} active media generation jobs`);
    await Promise.all(
      activeJobs.map(async (j) => {
        try {
          if (j.provider === 'openai') {
            await this.refreshAndUploadToS3(j.providerJobId);
            return;
          }
          if (j.provider === 'nanobanana') {
            await this.refreshAndUploadNanobananaImage(j.providerJobId);
            return;
          }
        } catch (err: any) {
          this.logger.warn(
            `Failed to refresh job ${j.providerJobId}: ${err?.message ?? err}`,
          );
        }
      }),
    );
  }
}

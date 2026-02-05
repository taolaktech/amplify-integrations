import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Interval } from '@nestjs/schedule';
import { S3UploadService } from 'src/common/services/s3-upload.service';
import { CreativeDoc } from 'src/database/schema/creative.schema';
import {
  VideoGenerationJob,
  VideoGenerationJobDoc,
} from '../database/schema/video-generation-job.schema';
import { CreateVideoGenerationDto } from './dto/create-video-generation.dto';
import { OpenAiVideoProvider } from 'src/openai/openai-video.provider';
import { randomUUID } from 'node:crypto';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);

  constructor(
    @InjectModel('video-generation-jobs')
    private readonly jobModel: Model<VideoGenerationJobDoc>,
    @InjectModel('creatives')
    private readonly creativeModel: Model<CreativeDoc>,
    private readonly openAiVideoProvider: OpenAiVideoProvider,
    private readonly s3UploadService: S3UploadService,
  ) {}

  async create(dto: CreateVideoGenerationDto) {
    const provider = dto.provider ?? 'openai';
    if (provider !== 'openai') {
      throw new Error('Unsupported provider');
    }

    const creativeId = new Types.ObjectId();
    const creative = await this.creativeModel.create({
      _id: creativeId,
      creativeSetId: randomUUID(),
      businessId: dto.businessId,
      campaignId: dto.campaignId,
      status: 'pending',
      creatives: [],
      videoPresetId: dto.videoPresetId,
    });

    const job = await this.openAiVideoProvider.create({
      prompt: dto.prompt,
      model: dto.model ?? 'sora-2',
      seconds: dto.seconds ?? '8',
      size: dto.size,
      quality: dto.quality ?? 'standard',
    });

    await this.creativeModel.updateOne(
      { creativeSetId: creative.creativeSetId },
      { $set: { providerJobId: job.id } },
    );

    await this.jobModel.findOneAndUpdate(
      { provider: 'openai', providerJobId: job.id },
      {
        $setOnInsert: {
          provider: 'openai',
          providerJobId: job.id,
        },
        $set: {
          creativeSetId: creative.creativeSetId,
          campaignId: dto.campaignId,
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

    return {
      ...job,
      creativeSetId: creative.creativeSetId,
    };
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
      await this.creativeModel.updateOne(
        { creativeSetId: existing.creativeSetId },
        {
          $set: {
            status: 'failed',
            providerJobId: existing.providerJobId,
          },
        },
      );
    } else {
      await this.creativeModel.updateOne(
        { creativeSetId: existing.creativeSetId },
        {
          $set: {
            status: 'pending',
            providerJobId: existing.providerJobId,
          },
        },
      );
    }

    if (mapped === 'completed' && !existing.videoKey) {
      try {
        const content =
          await this.openAiVideoProvider.downloadContent(providerJobId);
        const buf = Buffer.from(content);

        const key = `creatives/${existing.creativeSetId}/${providerJobId}.mp4`;
        const upload = await this.s3UploadService.uploadBuffer({
          key,
          body: buf,
          contentType: 'video/mp4',
        });

        existing.videoKey = upload.key;
        existing.videoUrl = upload.url;

        await this.creativeModel.updateOne(
          { creativeSetId: existing.creativeSetId },
          {
            $set: {
              status: 'completed',
              videoKey: upload.key,
              videoUrl: upload.url,
              providerJobId: existing.providerJobId,
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
        await this.creativeModel.updateOne(
          { creativeSetId: existing.creativeSetId },
          {
            $set: {
              status: 'failed',
              providerJobId: existing.providerJobId,
            },
          },
        );
      }
    }

    // If upload already happened (videoKey present), ensure Creative is marked completed.
    if (mapped === 'completed' && existing.videoKey && existing.videoUrl) {
      await this.creativeModel.updateOne(
        { creativeSetId: existing.creativeSetId },
        {
          $set: {
            status: 'completed',
            videoKey: existing.videoKey,
            videoUrl: existing.videoUrl,
            providerJobId: existing.providerJobId,
          },
        },
      );
    }

    await existing.save();

    return job;
  }

  private mapStatus(status: string): VideoGenerationJob['status'] {
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
          { status: 'completed', videoKey: { $exists: false } },
          { status: 'completed', videoKey: null },
        ],
      })
      .limit(25)
      .lean<VideoGenerationJob[]>();

    if (activeJobs.length === 0) {
      return;
    }

    await Promise.all(
      activeJobs.map(async (j) => {
        try {
          await this.refreshAndUploadToS3(j.providerJobId);
        } catch (err: any) {
          this.logger.warn(
            `Failed to refresh video job ${j.providerJobId}: ${err?.message ?? err}`,
          );
        }
      }),
    );
  }
}

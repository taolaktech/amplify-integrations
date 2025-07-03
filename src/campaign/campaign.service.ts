import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampaignDocument } from 'src/database/schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SqsProducerService } from './sqs-producer.service';

@Injectable()
export class CampaignService {
  private logger = new Logger(CampaignService.name);

  constructor(
    @InjectModel('campaigns') private campaignModel: Model<CampaignDocument>,
    private readonly sqsProducer: SqsProducerService,
  ) {}

  async create(
    createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignDocument> {
    try {
      // 1. Save the campaign to the database
      const newCampaign = await this.campaignModel.create(createCampaignDto);

      const messagePromises = newCampaign.platforms.map((platform) => {
        this.logger.log(`Initiating message send for platform: ${platform}`);
        return this.sqsProducer.sendMessage(newCampaign, platform);
      });

      //
      try {
        await Promise.all(messagePromises);
        this.logger.log(
          `All messages for campaign ${newCampaign._id.toString()} were successfully accepted by SQS.`,
        );
      } catch (error) {
        this.logger.error(
          `One or more messages failed to send for campaign ${newCampaign._id.toString()}.`,
          error,
        );

        throw error;
      }

      return newCampaign;
    } catch (error) {
      this.logger.error(`Error creating campaign: ${error.message}`);
      throw new BadRequestException(
        `Error creating campaign: ${error.message}`,
      );
    }
  }
}

import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CampaignDocument } from 'src/database/schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
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
    userId: string,
  ): Promise<CampaignDocument> {
    try {
      // 1. Save the campaign to the database
      const newCampaign = await this.campaignModel.create({
        ...createCampaignDto,
        createdBy: new Types.ObjectId(userId),
      });

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

  async findOne(id: string): Promise<CampaignDocument> {
    const campaign = await this.campaignModel.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(
    id: string,
    userId: string,
    updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignDocument> {
    try {
      // 1. Check for an empty request body
      if (Object.keys(updateCampaignDto).length === 0) {
        throw new BadRequestException('Update data cannot be empty.');
      }

      // 2. Find and update the document atomically.
      // The { new: true } option ensures the updated document is returned.
      const updatedCampaign = await this.campaignModel
        .findByIdAndUpdate(id, updateCampaignDto, { new: true })
        .exec();

      // 3. Handle the case where the campaign does not exist
      if (!updatedCampaign) {
        throw new NotFoundException(`Campaign with ID "${id}" not found`);
      }

      this.logger.log(`Campaign with ID "${id}" was successfully updated.`);
      return updatedCampaign;
    } catch (error) {
      let errorMessage = error.message;
      this.logger.error(
        `Error updating campaign with ID ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        // extract the error message from the HttpException instance
        errorMessage = error.message;
      }

      throw new InternalServerErrorException(
        `Error updating campaign with ID ${id}: ${error.message}`,
      );
    }
  }
}

import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder, Types } from 'mongoose';
import { CampaignDocument } from 'src/database/schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SqsProducerService } from './sqs-producer.service';
import { ListCampaignsDto } from './dto/list-campaigns.dto';

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
        `Error updating campaign with ID ${id}: ${errorMessage}`,
      );
    }
  }

  async findAll(listCampaignsDto: ListCampaignsDto, userId: string) {
    const { page, perPage, status, type, platforms, sortBy } = listCampaignsDto;

    // 1. Build the filter query, now including the createdBy field
    const filter: FilterQuery<CampaignDocument> = {
      createdBy: new Types.ObjectId(userId),
    };
    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }
    if (platforms && platforms.length > 0) {
      filter.platforms = { $all: platforms };
    }

    // 2. Build the sort query - with the TypeScript fix
    const [sortField, sortOrder] = sortBy.split(':');
    const sortOptions: { [key: string]: SortOrder } = {
      [sortField]: sortOrder as SortOrder,
    };

    // 3. Calculate pagination
    const skip = (page - 1) * perPage;

    // 4. Execute queries
    const [campaigns, total] = await Promise.all([
      this.campaignModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(perPage)
        .exec(),
      this.campaignModel.countDocuments(filter).exec(),
    ]);

    // 5. Construct the paginated response
    const totalPages = Math.ceil(total / perPage);

    return {
      data: campaigns,
      pagination: {
        total,
        page,
        perPage,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}

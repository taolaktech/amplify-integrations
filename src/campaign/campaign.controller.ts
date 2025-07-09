import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Public } from 'src/auth/decorators';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Campaign } from 'src/database/schema';
import { TokenAuthGuard } from 'src/auth/token-auth.guard';
import { ExtendedRequest } from 'src/common/interfaces/request.interface';

class CampaignResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Campaign created successfully' })
  message: string;

  // By referencing the Mongoose Campaign class, NestJS's Swagger plugin
  // can automatically generate a detailed model of the returned data.
  @ApiProperty({ type: Campaign })
  data: Campaign;
}

@ApiTags('Campaigns')
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Public()
  @UseGuards(TokenAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Create a new campaign',
    description:
      'This endpoint validates and creates a new marketing campaign, persisting it to the database and preparing it for processing.',
  })
  @ApiResponse({
    status: 201,
    description: 'The campaign has been successfully created.',
    type: CampaignResponse, // Use the DTO we defined above
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request. The request body is invalid or missing required fields.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error. An unexpected error occurred on the server.',
  })
  async create(
    @Req() request: ExtendedRequest,
    @Body() createCampaignDto: CreateCampaignDto,
  ) {
    const user = request['authenticatedData'];
    const userId = user._id.toString(); // ?? '680690b4b7fe560e4582cf2f';

    const createdCampaign = await this.campaignService.create(
      createCampaignDto,
      userId,
    );

    return {
      data: createdCampaign,
      message: 'Campaign created successfully',
      success: true,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single campaign by ID',
    description:
      'Retrieves the full details of a specific campaign using its unique MongoDB ObjectId.',
  })
  @ApiResponse({
    status: 200,
    description: 'The campaign was found and returned successfully.',
    type: CampaignResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found. No campaign with the specified ID exists.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error. An unexpected error occurred on the server.',
  })
  async findOne(@Param('id') id: string) {
    const campaign = await this.campaignService.findOne(id);

    return {
      data: campaign,
      message: 'Campaign found successfully',
      success: true,
    };
  }
}

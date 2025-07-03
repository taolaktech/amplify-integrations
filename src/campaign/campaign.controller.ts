import { Body, Controller, Post } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Public } from 'src/auth/decorators';

@Public()
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  async create(@Body() createCampaignDto: CreateCampaignDto) {
    const createdCampaign =
      await this.campaignService.create(createCampaignDto);

    return {
      data: createdCampaign,
      message: 'Campaign created successfully',
      success: true,
    };
  }
}

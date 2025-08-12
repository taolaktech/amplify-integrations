import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SaveGoogleAdsCustomerDataDto } from './dto/save-googleads-data.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusinessDoc } from 'src/database/schema';

@Injectable()
export class BusinessService {
  constructor(
    @InjectModel('business')
    private businessModel: Model<BusinessDoc>,
  ) {}

  async getBusinessById(businessId: string) {
    const business = await this.businessModel
      .findById(businessId)
      .populate('integrations.shopify.shopifyAccount');

    if (!business) {
      throw new NotFoundException(`business with id ${businessId} not found`);
    }

    return business;
  }

  async saveGoogleAdsCustomerData(
    businessId: string,
    dto: SaveGoogleAdsCustomerDataDto,
  ) {
    const business = await this.businessModel.findById(businessId);

    if (!business) {
      throw new NotFoundException(`business with id ${businessId} not found`);
    }

    if (business.integrations?.googleAds) {
      throw new ConflictException('Google ads integrations info already set');
    }

    business.integrations = {
      ...business.integrations,
      googleAds: {
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerResourceName: dto.customerResourceName,
        conversionAction: {
          id: dto.conversionActionId,
          resourceName: dto.conversionActionResourceName,
          tag: dto.conversionActionTag,
          label: dto.conversionActionLabel,
          tagSnippets: dto.tagSnippets,
        },
      },
    };

    await business.save();
    return business;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import {} from './dto/save-google-data.dto';
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
    const business = await this.businessModel.findById(businessId);

    if (!business) {
      throw new NotFoundException(`business with id ${businessId} not found`);
    }

    return business;
  }
}

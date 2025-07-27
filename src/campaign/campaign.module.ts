import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { SqsProducerService } from './sqs-producer.service';
import { CampaignWorkerService } from './campaign-worker.service';
import { FacebookConsumerService } from './facebook-consumer.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  providers: [
    CampaignService,
    SqsProducerService,
    CampaignWorkerService,
    FacebookConsumerService,
    JwtService,
    AuthService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
  controllers: [CampaignController],
})
export class CampaignModule {}

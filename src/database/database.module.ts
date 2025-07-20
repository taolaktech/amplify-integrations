// src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from 'src/config/config.service';
import { AppConfigModule } from 'src/config/config.module';
import {
  ShopifyAccountSchema,
  UserSchema,
  BusinessSchema,
  CampaignSchema,
  FacebookPageSchema,
} from './schema';
// import { BusinessSchema, ShopifyAccountSchema, UserSchema } from './schema';

@Global()
@Module({
  imports: [
    AppConfigModule, // Ensure ConfigModule is imported to access ConfigService
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService) => ({
        uri: configService.get('MONGO_URI'),
        dbName: configService.get('DB_NAME'),
        serverSelectionTimeoutMS: 5000,
      }),
      inject: [AppConfigService],
    }),
    MongooseModule.forFeature([
      { name: 'shopify-accounts', schema: ShopifyAccountSchema },
      { name: 'users', schema: UserSchema },
      { name: 'campaigns', schema: CampaignSchema },
      { name: 'facebook-pages', schema: FacebookPageSchema },
      { name: 'business', schema: BusinessSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}

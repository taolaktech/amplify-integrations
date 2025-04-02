import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';

@Module({
  providers: [ShopifyService],
  controllers: [ShopifyController],
})
export class ShopifyModule {}

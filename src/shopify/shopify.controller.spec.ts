import { Test, TestingModule } from '@nestjs/testing';
import { ShopifyController } from './shopify.controller';

describe('ShopifyController', () => {
  let controller: ShopifyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopifyController],
    }).compile();

    controller = module.get<ShopifyController>(ShopifyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

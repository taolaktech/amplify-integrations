import { Test, TestingModule } from '@nestjs/testing';
import { ShopifyService } from './shopify.service';
import * as dotenv from 'dotenv';
import { AppConfig } from 'src/config/config.schema';
import { AppConfigService } from '../config/config.service';

describe('ShopifyService', () => {
  let service: ShopifyService;

  beforeEach(async () => {
    dotenv.config({ path: '.env.test.local' });
    // mock config service
    const configService = {
      get: jest.fn<any, [keyof AppConfig]>((key: keyof AppConfig) => {
        return process.env[key];
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        {
          provide: AppConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get products', async () => {
    const products = await service.getProducts({
      shop: process.env.STORE_NAME || '',
      accessToken: process.env.STORE_ACCESS_TOKEN || '',
      scope: process.env.STORE_SCOPES || '',
    });
    console.log(JSON.stringify({ products }));
    expect(products).toBeDefined();
  });

  it('the hmac verification should be true', () => {
    //http:localhost:3334/api/shopify/auth/callback?code=f35fe091b0b4d4d3c13a81d2639c08e5&hmac=cec4482689d761e40423136f63bd1563c038e999f037b98777988c755a84cbf9&host=YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvYWtpbm9sYS1zdG9y&shop=akinola-stor.myshopify.com&state=12345&timestamp=1743692940
    const verification = service.verifyHmac({
      code: 'f35fe091b0b4d4d3c13a81d2639c08e5',
      host: 'YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvYWtpbm9sYS1zdG9y',
      shop: 'akinola-stor.myshopify.com',
      state: '12345',
      timestamp: '1743692940',
      hmac: 'cec4482689d761e40423136f63bd1563c038e999f037b98777988c755a84cbf9',
    });

    expect(verification).toBe(true);
  });
});

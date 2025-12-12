import { Controller, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from 'src/auth/decorators';
import { ShopifyService } from '../shopify/shopify.service';

@Public()
@Controller('shopify')
export class WebhookController {
  constructor(private shopifyService: ShopifyService) {}

  @Post('webhook')
  async handleShopifyWebhook(@Req() req: any, @Res() res: Response) {
    const valid = await this.shopifyService.validateAndHandleWebhook(
      req.rawBody,
      req,
      res,
    );

    if (!valid) {
      return res.send(400);
    }

    return res.status(200).send('OK');
  }
}

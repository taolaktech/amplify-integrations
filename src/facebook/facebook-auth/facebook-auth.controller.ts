import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FacebookAuthService } from './facebook-auth.service';
import { Response } from 'express';
import { FacebookCallbackQueryDto } from './dtos/facebook-auth-query.dto';
// import { AuthGuard } from 'src/auth/auth.guard';
import { ExtendedRequest } from 'src/common/interfaces/request.interface';
import { TokenAuthGuard } from 'src/auth/token-auth.guard';
import { Public } from 'src/auth/decorators';

// @ApiTags('stripe-subscriptions')
// @ApiBearerAuth()
@Controller('facebook-auth')
export class FacebookAuthController {
  constructor(private readonly facebookAuthService: FacebookAuthService) {}

  @Public()
  @UseGuards(TokenAuthGuard)
  @Get()
  redirectToFacebook(@Req() request: ExtendedRequest, @Res() res: Response) {
    const user = request['authenticatedData'];
    const userId = user._id.toString(); // ?? '680690b4b7fe560e4582cf2f';
    const state = this.facebookAuthService.generateStateToken(userId);
    const url = this.facebookAuthService.getAuthRedirectURL(state);
    return res.redirect(url);
  }

  @Public()
  @Get('callback')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleCallback(@Query() query: FacebookCallbackQueryDto) {
    const { code, state } = query;

    const payload = this.facebookAuthService.verifyStateToken(state);
    const tokenData = await this.facebookAuthService.exchangeCodeForToken(code);
    console.log(`token data => ${JSON.stringify(tokenData)}`);
    const pages = await this.facebookAuthService.fetchUserPages(
      tokenData.access_token,
    );
    await this.facebookAuthService.saveUserPages(payload.userId, pages);

    return {
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
      pages,
    };
  }
}

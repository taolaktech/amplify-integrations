import { Module } from '@nestjs/common';
import { FacebookAuthController } from './facebook-auth.controller';
import { FacebookAuthService } from './facebook-auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

@Module({
  imports: [],
  providers: [
    FacebookAuthService,
    JwtService,
    AuthService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
  controllers: [FacebookAuthController],
})
export class FacebookAuthModule {}

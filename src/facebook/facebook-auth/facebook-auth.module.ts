import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';
import { FacebookTokenMonitorService } from '../services/facebook-token-monitor.service';
import { FacebookTokenService } from '../services/facebook-token.service';
import { FacebookAuthController } from './facebook-auth.controller';
import { FacebookAuthService } from './facebook-auth.service';
import { FacebookBusinessManagerService } from '../services/facebook-business-manager.service';

@Module({
  imports: [],
  providers: [
    FacebookTokenMonitorService,
    FacebookAuthService,
    JwtService,
    AuthService,
    InternalHttpHelper,
    ServiceRegistryService,
    FacebookTokenService,
    FacebookBusinessManagerService,
  ],
  controllers: [FacebookAuthController],
  exports: [FacebookAuthService],
})
export class FacebookAuthModule {}

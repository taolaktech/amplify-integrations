import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from 'src/config/config.module';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ApiKeyAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
// import { TokenAuthGuard } from './token-auth.guard';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    ServiceRegistryService,
    InternalHttpHelper,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard,
    },
    // {
    //   provide: APP_GUARD,
    //   useClass: TokenAuthGuard,
    // },
  ],
  exports: [AuthService],
})
export class AuthModule {}

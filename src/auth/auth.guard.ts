import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from 'src/config/config.service';
import { IS_PUBLIC_KEY } from './decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: AppConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();

    const apiKey = this.configService.get('API_KEY');

    if (apiKey !== request.headers['x-api-key']) {
      throw new ForbiddenException('FORBIDDEN');
    }

    return true;
  }
}

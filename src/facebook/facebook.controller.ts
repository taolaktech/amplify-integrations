import { Controller } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

@ApiSecurity('x-api-key')
@Controller('api/facebook')
export class FacebookController {
  constructor() {}
}

import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { MediaGenerationService } from 'src/media-generation/media-generation.service';

@Public()
@ApiTags('Nanobanana Webhook')
@Controller('nanobanana')
export class NanobananaWebhookController {
  constructor(private readonly mediaGenerationService: MediaGenerationService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Nanobanana callback webhook' })
  @ApiResponse({ status: 200 })
  async handleCallback(@Body() body: any) {
    const taskId = body?.taskId ?? body?.data?.taskId;

    if (typeof taskId === 'string' && taskId.length > 0) {
      await this.mediaGenerationService.handleNanobananaCallback(taskId);
    }

    return { success: true };
  }
}

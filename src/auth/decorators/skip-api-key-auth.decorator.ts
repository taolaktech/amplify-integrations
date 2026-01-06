import { SetMetadata } from '@nestjs/common';

export const SKIP_API_KEY_AUTH_KEY = 'skipApiKeyAuth';
export const SkipApiKeyAuth = () => SetMetadata(SKIP_API_KEY_AUTH_KEY, true);

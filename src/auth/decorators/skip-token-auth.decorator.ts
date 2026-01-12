import { SetMetadata } from '@nestjs/common';

export const SKIP_TOKEN_AUTH_KEY = 'skipTokenAuth';
export const SkipTokenAuth = () => SetMetadata(SKIP_TOKEN_AUTH_KEY, true);

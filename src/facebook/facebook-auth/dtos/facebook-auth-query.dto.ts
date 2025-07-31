import { IsString } from 'class-validator';

export class FacebookCallbackQueryDto {
  @IsString()
  code: string;

  @IsString()
  state: string;
}

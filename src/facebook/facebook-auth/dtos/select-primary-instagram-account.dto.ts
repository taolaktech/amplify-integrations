import { IsString, IsNotEmpty } from 'class-validator';

export class SelectPrimaryInstagramAccountDto {
  @IsString()
  @IsNotEmpty()
  instagramAccountId: string;
}

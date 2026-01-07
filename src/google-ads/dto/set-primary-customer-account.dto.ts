import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetPrimaryCustomerAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  primaryCustomerAccount: string;
}

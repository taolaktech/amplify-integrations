import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectPrimaryAdAccountDto {
  @ApiProperty({
    example: 'act_123456789',
    description: 'Facebook Ad Account ID to set as primary',
  })
  @IsString()
  @IsNotEmpty()
  adAccountId: string;
}

import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveGoogleAdsCustomerDataDto {
  @ApiProperty({
    description: 'The google ads customer id',
    example: '9026873743',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'The google ads customer name',
    example: 'Akinolaa',
  })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    description: 'The google ads customer resource name',
    example: 'customers/9026873743',
  })
  @IsString()
  @IsNotEmpty()
  customerResourceName: string;

  @ApiProperty({
    description: 'The google ads customer conversionAction resource name',
    example: 'customers/9026873743/conversionAction/1234098767',
  })
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversionActionResourceName: string;

  @ApiProperty({
    description: 'The conversion action id',
    example: '1234098767',
  })
  @IsString()
  @IsNotEmpty()
  conversionActionId: string;

  @ApiProperty({
    description: 'The tag on the conversion action',
    example: 'AW-1234567',
  })
  @IsString()
  @IsOptional()
  conversionActionTag?: string;

  @ApiProperty({
    description: 'The label on the conversion action. Comes after the tag',
    example: 'aBudhHUd',
  })
  @IsString()
  @IsOptional()
  conversionActionLabel?: string;

  @ApiProperty({
    description: 'The tag snippets from the conversion action',
    example: [{ eventSnippet: 'Some long winding string with code' }],
  })
  @IsNotEmpty()
  @IsArray()
  tagSnippets: any[];
}

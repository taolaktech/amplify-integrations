import { IsNotEmpty } from 'class-validator';

export class CreateMetaPixelDto {
  @IsNotEmpty({
    message: 'Meta Pixel name is required',
  })
  name: string;
}

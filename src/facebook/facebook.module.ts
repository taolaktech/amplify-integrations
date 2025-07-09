import { Module } from '@nestjs/common';
import { FacebookAuthModule } from './facebook-auth/facebook-auth.module';
// import { MongooseModule } from '@nestjs/mongoose';
// import {
//   FacebookPage,
//   FacebookPageSchema,
// } from './schemas/facebook-page.schema';

@Module({
  imports: [FacebookAuthModule],
})
export class FacebookModule {}

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  // DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { CampaignWorkerService } from './campaign-worker.service';

@Injectable()
export class FacebookConsumerService implements OnModuleInit {
  private readonly logger = new Logger(FacebookConsumerService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly workerService: CampaignWorkerService,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing AWS configuration for SQS Consumer.');
    }

    this.sqsClient = new SQSClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.queueUrl =
      'https://sqs.us-east-2.amazonaws.com/835677831313/facebook-campaign-queue';
  }

  onModuleInit() {
    // This starts the polling process as soon as the module is initialized.
    // this.startPolling();
  }

  async startPolling() {
    this.logger.log('Starting polling for messages on the Facebook queue...');
    while (true) {
      try {
        const receiveCommand = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 10, // Receive up to 10 messages at a time
          WaitTimeSeconds: 20, // Use long polling
        });

        const { Messages } = await this.sqsClient.send(receiveCommand);

        if (Messages && Messages.length > 0) {
          this.logger.log(`Received ${Messages.length} message(s).`);
          // Process messages in parallel
          await Promise.all(
            Messages.map((message) => this.processMessage(message)),
          );
        }
        // If no messages, the loop will just continue after the 20-second wait.
      } catch (error) {
        this.logger.error('Error receiving messages from SQS:', error);
        // Wait for a bit before retrying to avoid spamming logs in case of a persistent error
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processMessage(message: Message) {
    try {
      const messageBody = JSON.parse(message.Body as string);

      // 1. Call the worker to perform the business logic
      await this.workerService.processFacebookCampaign(messageBody);

      // 2. If processing is successful, delete the message from the queue
      // const deleteCommand = new DeleteMessageCommand({
      //   QueueUrl: this.queueUrl,
      //   ReceiptHandle: message.ReceiptHandle,
      // });
      // await this.sqsClient.send(deleteCommand);
      this.logger.log(`Message ${message.MessageId} processed and deleted.`);
    } catch (error) {
      // If an error occurs, the message is NOT deleted.
      // It will become visible again on the queue after the visibility timeout
      // and will be retried.
      this.logger.error(
        `Error processing message ${message.MessageId}:`,
        error,
      );
    }
  }
}

import { Connection } from 'mongoose';

// After establishing the MongoDB connection
async function syncIndexes(connection: Connection) {
  try {
    await connection.model('FacebookCampaign').syncIndexes();
    console.log('Indexes synced successfully');
  } catch (error) {
    console.error('Error syncing indexes:', error);
  }
}

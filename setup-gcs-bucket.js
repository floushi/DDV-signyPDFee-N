import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function setupGCSBucket() {
  // Check if GCP_BUCKET_NAME is set
  const bucketName = process.env.GCP_BUCKET_NAME;
  if (!bucketName) {
    console.error('Error: GCP_BUCKET_NAME environment variable is not set.');
    console.error('Please set it in your .env file or environment variables.');
    process.exit(1);
  }

  // Initialize Google Cloud Storage client
  const storage = new Storage();
  
  // Define the directories to create
  const directories = [
    'templates/',
    'uploads/',
    'contracts/',
    'signed/',
    'config/'
  ];
  
  try {
    // Check if the bucket exists
    const [bucketExists] = await storage.bucket(bucketName).exists();
    
    if (!bucketExists) {
      console.error(`Error: Bucket "${bucketName}" does not exist.`);
      console.error('Please create the bucket first using the Google Cloud Console or gcloud CLI.');
      process.exit(1);
    }
    
    // Create empty files to represent directories (GCS doesn't have real directories)
    for (const directory of directories) {
      const file = storage.bucket(bucketName).file(`${directory}.keep`);
      await file.save('', { contentType: 'text/plain' });
      console.log(`Created directory marker: gs://${bucketName}/${directory}`);
      
      // Make the directory public if GCS_MAKE_PUBLIC is set to true
      if (process.env.GCS_MAKE_PUBLIC === 'true') {
        await file.makePublic();
      }
    }
    
    // Create an empty pdfStore.json in the config directory if it doesn't exist
    const pdfStoreFile = storage.bucket(bucketName).file('config/pdfStore.json');
    const [pdfStoreExists] = await pdfStoreFile.exists();
    
    if (!pdfStoreExists) {
      await pdfStoreFile.save(JSON.stringify({}), { contentType: 'application/json' });
      console.log(`Created empty pdfStore.json: gs://${bucketName}/config/pdfStore.json`);
      
      // Make the file public if GCS_MAKE_PUBLIC is set to true
      if (process.env.GCS_MAKE_PUBLIC === 'true') {
        await pdfStoreFile.makePublic();
      }
    } else {
      console.log(`pdfStore.json already exists: gs://${bucketName}/config/pdfStore.json`);
    }
    
    console.log('GCS bucket setup completed successfully.');
  } catch (error) {
    console.error('Error setting up GCS bucket:', error);
    process.exit(1);
  }
}

setupGCSBucket().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

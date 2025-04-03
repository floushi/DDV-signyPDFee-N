import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function uploadTemplateToGCS() {
  // Check if GCP_BUCKET_NAME is set
  const bucketName = process.env.GCP_BUCKET_NAME;
  if (!bucketName) {
    console.error('Error: GCP_BUCKET_NAME environment variable is not set.');
    console.error('Please set it in your .env file or environment variables.');
    process.exit(1);
  }

  // Initialize Google Cloud Storage client
  const storage = new Storage();
  
  // Path to the template PDF
  const templatePath = path.join(__dirname, 'templates', 'DVV-All-Time-Best-Media.pdf');
  
  try {
    // Check if the template file exists
    await fs.access(templatePath);
    
    // Read the template file
    const templateBytes = await fs.readFile(templatePath);
    
    // Define the destination in GCS
    const destination = 'templates/DVV-All-Time-Best-Media.pdf';
    
    // Upload the file to GCS
    await storage.bucket(bucketName).file(destination).save(templateBytes, {
      metadata: {
        contentType: 'application/pdf',
      },
    });
    
    console.log(`Template PDF uploaded to gs://${bucketName}/${destination}`);
    
    // Make the file public if GCS_MAKE_PUBLIC is set to true
    if (process.env.GCS_MAKE_PUBLIC === 'true') {
      await storage.bucket(bucketName).file(destination).makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
      console.log(`Template PDF made public at: ${publicUrl}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: Template file not found at ${templatePath}`);
      console.error('Please run "node create-template.js" first to create the template PDF.');
    } else {
      console.error('Error uploading template to GCS:', error);
    }
    process.exit(1);
  }
}

uploadTemplateToGCS().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

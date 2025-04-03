# SignyPDFee - PDF Signing Application

This application allows users to sign PDF documents online. It's designed to run on Google Cloud Run.

## Prerequisites

- Google Cloud Platform account
- Google Cloud Storage bucket
- Node.js 18 or later (for local development)

## Environment Variables

The following environment variables must be set in your Google Cloud Run service:

- `PORT`: Automatically set by Cloud Run (usually 8080)
- `GCP_BUCKET_NAME`: The name of your Google Cloud Storage bucket
- `API_KEY`: API key for authentication
- `GCS_MAKE_PUBLIC`: Set to "true" if you want uploaded PDFs to be publicly accessible

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the required environment variables
4. Create the template PDF:
   ```
   npm run create-template
   ```
5. Run the application:
   ```
   npm start
   ```

## Utility Scripts

This repository includes several utility scripts to help with setup, testing, and deployment:

- `npm run create-template`: Creates a placeholder template PDF in the templates directory
- `npm run setup-gcs`: Sets up the necessary directory structure in your Google Cloud Storage bucket
- `npm run upload-template`: Uploads the template PDF to your Google Cloud Storage bucket
- `npm run deploy-prep`: Runs all of the above scripts in sequence to prepare for deployment
- `npm run test-server`: Tests if the server is running correctly (run this in a separate terminal while the server is running)

## Deployment to Google Cloud Run

### Option 1: Manual Deployment

1. Prepare for deployment by setting up the GCS bucket and uploading the template PDF:
   ```
   npm run deploy-prep
   ```

2. Build and push the Docker image to Google Container Registry:
   ```
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/all-time-best-media-pdf-sign
   ```

3. Deploy to Cloud Run using the Google Cloud Console:
   - Go to Cloud Run in the Google Cloud Console
   - Click "Create Service" or select your existing service
   - Select the container image you just pushed
   - Configure the service settings (memory, CPU, etc.)
   - Under "Variables & Secrets", add the required environment variables:
     - `API_KEY`: Your API key
     - `GCP_BUCKET_NAME`: Your GCS bucket name (e.g., "all-time-best-media")
     - `GCS_MAKE_PUBLIC`: Set to "true" if you want PDFs to be public
   - Click "Create" or "Update"

### Option 2: GitHub Integration with Cloud Build

1. Push your code to GitHub

2. Set up Cloud Build to automatically build and deploy from GitHub:
   - Go to Cloud Build in the Google Cloud Console
   - Connect your GitHub repository
   - Create a build trigger for your repository
   - Create a `cloudbuild.yaml` file in your repository:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/all-time-best-media-pdf-sign', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/all-time-best-media-pdf-sign']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'all-time-best-media-pdf-sign'
      - '--image'
      - 'gcr.io/$PROJECT_ID/all-time-best-media-pdf-sign'
      - '--region'
      - 'us-central1'  # Change to your preferred region
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/all-time-best-media-pdf-sign'
```

3. Configure environment variables in the Cloud Run service settings in the Google Cloud Console (not in the code repository)

4. Ensure the Cloud Run service account has the necessary permissions to access the GCS bucket:
   ```
   gsutil iam ch serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com:objectAdmin gs://YOUR_BUCKET_NAME
   ```

## Health Check Endpoint

The application provides a health check endpoint at `/_health` that returns the current status of the server. This endpoint is useful for monitoring and can be used by Google Cloud Run to verify that the server is running correctly.

Example response:
```json
{
  "status": "ok",
  "timestamp": "2025-04-04T02:55:00.000Z",
  "uptime": 123.456,
  "message": "Server is running"
}
```

## Troubleshooting

If you encounter the error "The user-provided container failed to start and listen on the port defined by the PORT environment variable", check the following:

1. Ensure the Dockerfile CMD is set to run the server: `CMD [ "node", "server.js" ]`
2. Verify that the server is listening on the port specified by the PORT environment variable
3. Check that all required environment variables are set
4. Ensure the template PDF exists in the templates directory or in the GCS bucket at `templates/DVV-All-Time-Best-Media.pdf`
5. Make sure the Cloud Run service account has the necessary permissions to access the GCS bucket
6. Check the health endpoint at `/_health` to verify the server is running correctly

## File Structure

- `server.js`: Main application server
- `pdfConfig.mjs`: Configuration for PDF generation
- `public/`: Static files served by the application
- `templates/`: PDF templates
- `Dockerfile`: Docker configuration for Cloud Run deployment

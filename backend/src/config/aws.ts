import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';

// AWS Configuration
export const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  s3Bucket: process.env.AWS_S3_BUCKET,
  sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL
};

// Validate required AWS environment variables
// Note: Access keys are optional - ECS can use IAM roles for authentication
export const validateAWSConfig = (): void => {
  // Only S3 bucket is required
  if (!process.env.AWS_S3_BUCKET) {
    console.warn('AWS_S3_BUCKET not configured - S3 features will be disabled');
  }

  // If access keys are partially configured, warn about it
  const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
  const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;

  if (hasAccessKey !== hasSecretKey) {
    console.warn('AWS credentials partially configured - this may cause authentication issues');
  }

  if (!hasAccessKey && !hasSecretKey) {
    console.log('AWS credentials not provided - will use IAM role (recommended for ECS)');
  }
};

// Configure AWS SDK v3
export const configureAWS = (): void => {
  try {
    validateAWSConfig();

    console.log('✅ AWS SDK v3 configured successfully');
    console.log(`📍 Region: ${awsConfig.region}`);
    console.log(`🪣 S3 Bucket: ${awsConfig.s3Bucket}`);
    
    if (awsConfig.sqsQueueUrl) {
      console.log(`📨 SQS Queue: ${awsConfig.sqsQueueUrl}`);
    }
  } catch (error) {
    console.error('❌ AWS configuration failed:', error);
    throw error;
  }
};

// S3 Configuration
export const s3Config = {
  bucket: awsConfig.s3Bucket!,
  region: awsConfig.region,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ],
  allowedDocumentTypes: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  avatarPath: 'avatars',
  mediaPath: 'media',
  documentsPath: 'documents'
};

// SQS Configuration
export const sqsConfig = {
  queueUrl: awsConfig.sqsQueueUrl,
  region: awsConfig.region,
  maxRetries: 3,
  retryDelay: 1000 // 1 second
};

// File validation helpers
export const validateFileType = (mimetype: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimetype);
};

export const validateFileSize = (size: number, maxSize: number): boolean => {
  return size <= maxSize;
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const generateUniqueFilename = (originalName: string, prefix?: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = getFileExtension(originalName);
  const filename = `${timestamp}-${random}.${extension}`;
  
  return prefix ? `${prefix}/${filename}` : filename;
};

// AWS Service instances (SDK v3)
export const createS3Instance = (): S3Client => {
  validateAWSConfig();

  // Use IAM role credentials if static credentials aren't provided
  const clientConfig: any = {
    region: awsConfig.region,
  };

  if (awsConfig.accessKeyId && awsConfig.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
    };
  }

  return new S3Client(clientConfig);
};

export const createSQSInstance = (): SQSClient => {
  validateAWSConfig();

  // Use IAM role credentials if static credentials aren't provided
  const clientConfig: any = {
    region: awsConfig.region,
  };

  if (awsConfig.accessKeyId && awsConfig.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
    };
  }

  return new SQSClient(clientConfig);
};

// Export default configuration
export default {
  aws: awsConfig,
  s3: s3Config,
  sqs: sqsConfig,
  configure: configureAWS,
  validate: validateAWSConfig
};

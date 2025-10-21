import AWS from 'aws-sdk';

// AWS Configuration
export const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  s3Bucket: process.env.AWS_S3_BUCKET,
  sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL
};

// Validate required AWS environment variables
export const validateAWSConfig = (): void => {
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
  }
};

// Configure AWS SDK
export const configureAWS = (): void => {
  try {
    validateAWSConfig();
    
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
      region: awsConfig.region
    });

    console.log('✅ AWS SDK configured successfully');
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

// AWS Service instances
export const createS3Instance = (): AWS.S3 => {
  validateAWSConfig();
  return new AWS.S3({
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
    region: awsConfig.region
  });
};

export const createSQSInstance = (): AWS.SQS => {
  validateAWSConfig();
  return new AWS.SQS({
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
    region: awsConfig.region
  });
};

// Export default configuration
export default {
  aws: awsConfig,
  s3: s3Config,
  sqs: sqsConfig,
  configure: configureAWS,
  validate: validateAWSConfig
};

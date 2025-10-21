import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { 
  createS3Instance, 
  s3Config, 
  validateFileType, 
  validateFileSize,
  generateUniqueFilename 
} from '../config/aws';

/**
 * Upload avatar image to S3
 */
export const uploadAvatarToS3 = async (file: Express.Multer.File, userId: string): Promise<string> => {
  try {
    // Validate file type
    if (!validateFileType(file.mimetype, s3Config.allowedImageTypes)) {
      throw new Error(`Invalid file type. Allowed types: ${s3Config.allowedImageTypes.join(', ')}`);
    }

    // Validate file size
    if (!validateFileSize(file.size, s3Config.maxFileSize)) {
      throw new Error(`File too large. Maximum size: ${s3Config.maxFileSize / (1024 * 1024)}MB`);
    }

    // Create S3 instance
    const s3 = createS3Instance();

    // Generate unique filename
    const fileName = `${s3Config.avatarPath}/${userId}/${generateUniqueFilename(file.originalname)}`;

    // Upload parameters
    const uploadParams = {
      Bucket: s3Config.bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Make the file publicly accessible
      Metadata: {
        userId: userId,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size.toString()
      }
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    // Return the public URL
    return result.Location;
  } catch (error) {
    console.error('S3 upload error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('S3 upload failed');
  }
};

/**
 * Delete avatar from S3
 */
export const deleteAvatarFromS3 = async (avatarUrl: string): Promise<void> => {
  try {
    // Create S3 instance
    const s3 = createS3Instance();

    // Extract key from URL
    const url = new URL(avatarUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const deleteParams = {
      Bucket: s3Config.bucket,
      Key: key
    };

    await s3.deleteObject(deleteParams).promise();
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('S3 delete failed');
  }
};

/**
 * Generate pre-signed URL for direct upload (alternative approach)
 */
export const generatePresignedUploadUrl = async (userId: string, fileType: string): Promise<string> => {
  try {
    // Validate file type
    if (!validateFileType(fileType, s3Config.allowedImageTypes)) {
      throw new Error(`Invalid file type. Allowed types: ${s3Config.allowedImageTypes.join(', ')}`);
    }

    // Create S3 instance
    const s3 = createS3Instance();

    // Generate unique filename
    const fileName = `${s3Config.avatarPath}/${userId}/${generateUniqueFilename('avatar', '')}`;

    const params = {
      Bucket: s3Config.bucket,
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read',
      Expires: 300, // 5 minutes
      Metadata: {
        userId: userId,
        uploadedAt: new Date().toISOString()
      }
    };

    const presignedUrl = await s3.getSignedUrlPromise('putObject', params);
    
    return presignedUrl;
  } catch (error) {
    console.error('Generate presigned URL error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate upload URL');
  }
};

/**
 * Get S3 bucket configuration info
 */
export const getS3Config = () => {
  return {
    bucket: s3Config.bucket,
    region: s3Config.region,
    maxFileSize: s3Config.maxFileSize,
    allowedImageTypes: s3Config.allowedImageTypes,
    allowedDocumentTypes: s3Config.allowedDocumentTypes,
    isConfigured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && s3Config.bucket)
  };
};

/**
 * Upload media file to S3 (for messages)
 */
export const uploadMediaToS3 = async (file: Express.Multer.File, userId: string, conversationId: string): Promise<string> => {
  try {
    // Validate file type (images and documents)
    const allowedTypes = [...s3Config.allowedImageTypes, ...s3Config.allowedDocumentTypes];
    if (!validateFileType(file.mimetype, allowedTypes)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Validate file size
    if (!validateFileSize(file.size, s3Config.maxFileSize)) {
      throw new Error(`File too large. Maximum size: ${s3Config.maxFileSize / (1024 * 1024)}MB`);
    }

    // Create S3 instance
    const s3 = createS3Instance();

    // Generate unique filename
    const fileName = `${s3Config.mediaPath}/${conversationId}/${userId}/${generateUniqueFilename(file.originalname)}`;

    // Upload parameters
    const uploadParams = {
      Bucket: s3Config.bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
      Metadata: {
        userId: userId,
        conversationId: conversationId,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size.toString()
      }
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    // Return the public URL
    return result.Location;
  } catch (error) {
    console.error('S3 media upload error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('S3 media upload failed');
  }
};

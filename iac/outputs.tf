output "s3_bucket_name" {
  description = "Name of the artifacts S3 bucket"
  value       = aws_s3_bucket.app_artifacts.bucket
}

output "media_s3_bucket" {
  description = "Name of the media S3 bucket"
  value       = aws_s3_bucket.media.bucket
}

output "aws_sqs_queue_url" {
  description = "Notifications SQS queue URL"
  value       = aws_sqs_queue.notifications.id
}

output "aws_region" {
  description = "AWS region used for deployment"
  value       = var.aws_region
}

# Additional AWS Outputs
output "aws_s3_bucket" {
  description = "AWS S3 bucket name for media storage"
  value       = aws_s3_bucket.media.bucket
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.placeholder.arn
}

# Note: Railway outputs will be added after manual Railway setup
# The Railway provider has limited resource support, so we'll configure
# Railway resources manually and add outputs later

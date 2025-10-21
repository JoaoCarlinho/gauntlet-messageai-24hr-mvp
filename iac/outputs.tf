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

# Railway Outputs
output "railway_project_id" {
  description = "Railway project ID"
  value       = railway_project.messageai.id
}

output "railway_service_domain" {
  description = "Railway backend service domain"
  value       = railway_service.backend.domain
}

output "database_url" {
  description = "PostgreSQL database URL from Railway"
  value       = railway_service.postgres.database_url
  sensitive   = true
}

output "aws_s3_bucket" {
  description = "AWS S3 bucket name for media storage"
  value       = aws_s3_bucket.media.bucket
}

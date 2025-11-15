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

# Sales Funnel Infrastructure Outputs
output "content_library_s3_bucket" {
  description = "Name of the content library S3 bucket"
  value       = aws_s3_bucket.content_library.bucket
}

output "webhook_queue_url" {
  description = "Webhook processing SQS queue URL"
  value       = aws_sqs_queue.webhook_queue.id
}

output "webhook_dlq_url" {
  description = "Webhook dead letter queue URL"
  value       = aws_sqs_queue.webhook_dlq.id
}

output "metrics_queue_url" {
  description = "Metrics sync SQS queue URL"
  value       = aws_sqs_queue.metrics_queue.id
}

output "performance_queue_url" {
  description = "Performance reporting SQS queue URL"
  value       = aws_sqs_queue.performance_queue.id
}

output "webhook_processor_lambda_arn" {
  description = "Webhook processor Lambda function ARN"
  value       = aws_lambda_function.webhook_processor.arn
}

output "metrics_sync_lambda_arn" {
  description = "Metrics sync Lambda function ARN"
  value       = aws_lambda_function.metrics_sync.arn
}

output "performance_reporter_lambda_arn" {
  description = "Performance reporter Lambda function ARN"
  value       = aws_lambda_function.performance_reporter.arn
}

output "daily_metrics_sync_rule_arn" {
  description = "Daily metrics sync EventBridge rule ARN"
  value       = aws_cloudwatch_event_rule.daily_metrics_sync.arn
}

output "weekly_report_rule_arn" {
  description = "Weekly performance report EventBridge rule ARN"
  value       = aws_cloudwatch_event_rule.weekly_report.arn
}

# Pinecone Vector Database Outputs
# Pinecone outputs disabled for AWS-only deployment
# output "pinecone_index_name" {
#   description = "Name of the Pinecone index for vector storage"
#   value       = pinecone_index.messageai_production.name
# }
#
# output "pinecone_index_host" {
#   description = "Host URL of the Pinecone index"
#   value       = pinecone_index.messageai_production.host
# }
#
# output "pinecone_index_dimension" {
#   description = "Dimension of vectors stored in the index"
#   value       = pinecone_index.messageai_production.dimension
# }
#
# output "pinecone_index_metric" {
#   description = "Distance metric used for similarity search"
#   value       = pinecone_index.messageai_production.metric
# }


# Note: Railway outputs will be added after manual Railway setup
# The Railway provider has limited resource support, so we'll configure
# Railway resources manually and add outputs later

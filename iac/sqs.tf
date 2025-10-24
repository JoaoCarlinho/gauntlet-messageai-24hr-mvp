# SQS Queues for Sales Funnel
# Webhook processing queue
resource "aws_sqs_queue" "webhook_queue" {
  name                       = "${var.project_name}-webhook-queue-${var.environment}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20      # Enable long polling

  tags = {
    Project = var.project_name
    Env     = var.environment
    Purpose = "webhook-processing"
  }
}

# Dead letter queue for webhook processing failures
resource "aws_sqs_queue" "webhook_dlq" {
  name                       = "${var.project_name}-webhook-dlq-${var.environment}"
  message_retention_seconds  = 1209600 # 14 days

  tags = {
    Project = var.project_name
    Env     = var.environment
    Purpose = "webhook-dlq"
  }
}

# Redrive policy for webhook queue
resource "aws_sqs_queue_redrive_policy" "webhook_queue" {
  queue_url = aws_sqs_queue.webhook_queue.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.webhook_dlq.arn
    maxReceiveCount     = 3
  })
}

# Metrics sync queue
resource "aws_sqs_queue" "metrics_queue" {
  name                       = "${var.project_name}-metrics-queue-${var.environment}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 1209600 # 14 days

  tags = {
    Project = var.project_name
    Env     = var.environment
    Purpose = "metrics-sync"
  }
}

# Performance reporting queue
resource "aws_sqs_queue" "performance_queue" {
  name                       = "${var.project_name}-performance-queue-${var.environment}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 1209600 # 14 days

  tags = {
    Project = var.project_name
    Env     = var.environment
    Purpose = "performance-reporting"
  }
}

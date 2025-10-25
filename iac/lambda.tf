# Lambda Functions for Sales Funnel
# Webhook processor Lambda
resource "aws_lambda_function" "webhook_processor" {
  filename      = "webhook-processor.zip"
  function_name = "${var.project_name}-webhook-processor-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "dist/index.handler"
  runtime       = "nodejs18.x"
  timeout       = 60
  memory_size   = 512

  environment {
    variables = {
      DATABASE_URL         = var.database_url
      API_URL              = var.api_url
      BACKEND_URL          = var.backend_url
      INTERNAL_API_SECRET  = var.internal_api_secret
      SQS_URL              = aws_sqs_queue.webhook_queue.id
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_attach]
}

# Metrics sync Lambda
resource "aws_lambda_function" "metrics_sync" {
  filename      = "placeholder.zip"
  function_name = "${var.project_name}-metrics-sync-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      DATABASE_URL = var.database_url
      API_URL      = var.api_url
      SQS_URL      = aws_sqs_queue.metrics_queue.id
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_attach]
}

# Performance reporter Lambda
resource "aws_lambda_function" "performance_reporter" {
  filename      = "placeholder.zip"
  function_name = "${var.project_name}-performance-reporter-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      DATABASE_URL = var.database_url
      API_URL      = var.api_url
      SQS_URL      = aws_sqs_queue.performance_queue.id
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_attach]
}

# SQS event source mappings
resource "aws_lambda_event_source_mapping" "webhook_processor" {
  event_source_arn = aws_sqs_queue.webhook_queue.arn
  function_name    = aws_lambda_function.webhook_processor.arn
  batch_size       = 10
  maximum_batching_window_in_seconds = 5
}

resource "aws_lambda_event_source_mapping" "metrics_sync" {
  event_source_arn = aws_sqs_queue.metrics_queue.arn
  function_name    = aws_lambda_function.metrics_sync.arn
  batch_size       = 5
  maximum_batching_window_in_seconds = 5
}

resource "aws_lambda_event_source_mapping" "performance_reporter" {
  event_source_arn = aws_sqs_queue.performance_queue.arn
  function_name    = aws_lambda_function.performance_reporter.arn
  batch_size       = 5
  maximum_batching_window_in_seconds = 5
}

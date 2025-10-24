# IAM Policies and Roles for Sales Funnel
# Enhanced Lambda execution policy with additional permissions
resource "aws_iam_policy" "lambda_enhanced_policy" {
  name        = "${var.project_name}-lambda-enhanced-${var.environment}"
  description = "Enhanced Lambda execution policy for MessageAI sales funnel"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = "*"
      },
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        Effect = "Allow",
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*",
          aws_s3_bucket.content_library.arn,
          "${aws_s3_bucket.content_library.arn}/*"
        ]
      },
      {
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ],
        Effect = "Allow",
        Resource = [
          aws_sqs_queue.notifications.arn,
          aws_sqs_queue.webhook_queue.arn,
          aws_sqs_queue.webhook_dlq.arn,
          aws_sqs_queue.metrics_queue.arn,
          aws_sqs_queue.performance_queue.arn
        ]
      },
      {
        Action = [
          "events:PutEvents"
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}

# Attach enhanced policy to Lambda role
resource "aws_iam_role_policy_attachment" "lambda_enhanced_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_enhanced_policy.arn
}

# IAM role for webhook processing (if needed for external access)
resource "aws_iam_role" "webhook_processor_role" {
  name = "${var.project_name}-webhook-processor-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic execution policy to webhook processor role
resource "aws_iam_role_policy_attachment" "webhook_processor_basic" {
  role       = aws_iam_role.webhook_processor_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach enhanced policy to webhook processor role
resource "aws_iam_role_policy_attachment" "webhook_processor_enhanced" {
  role       = aws_iam_role.webhook_processor_role.name
  policy_arn = aws_iam_policy.lambda_enhanced_policy.arn
}

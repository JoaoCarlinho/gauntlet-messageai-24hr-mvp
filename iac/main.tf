# Initial Terraform scaffold for MessageAI MVP

# Example S3 bucket to store app artifacts (adjust as needed)
resource "aws_s3_bucket" "app_artifacts" {
  bucket = "${var.project_name}-artifacts-${random_id.bucket_id.hex}"

  tags = {
    Name    = "${var.project_name}-artifacts"
    Project = var.project_name
  }
}

resource "aws_s3_bucket_ownership_controls" "example" {
  bucket = aws_s3_bucket.app_artifacts.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "example" {
  depends_on = [aws_s3_bucket_ownership_controls.example]

  bucket = aws_s3_bucket.app_artifacts.id
  acl    = "private"
}

# Random ID for uniqueness
resource "random_id" "bucket_id" {
  byte_length = 4
}

# --- Media S3 bucket for user uploads ---
resource "aws_s3_bucket" "media" {
  bucket = "${var.project_name}-media-${random_id.media_bucket_id.hex}"
  acl    = "private"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  lifecycle_rule {
    id      = "expire-temp-uploads"
    enabled = true
    expiration {
      days = 30
    }
    noncurrent_version_expiration {
      days = 30
    }
  }

  tags = {
    Name    = "${var.project_name}-media"
    Project = var.project_name
    Env     = var.environment
  }
}

resource "random_id" "media_bucket_id" {
  byte_length = 4
}

# --- SQS queue for notifications ---
resource "aws_sqs_queue" "notifications" {
  name                       = "${var.project_name}-notification-queue-${var.environment}"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 1209600 # 14 days

  tags = {
    Project = var.project_name
    Env     = var.environment
  }
}

# --- IAM Role and Policy for Lambda functions ---
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.project_name}-lambda-exec-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_policy" "lambda_basic_policy" {
  name        = "${var.project_name}-lambda-basic-${var.environment}"
  description = "Basic Lambda execution policy for ${var.project_name}"

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
          "${aws_s3_bucket.media.arn}/*"
        ]
      },
      {
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Effect = "Allow",
        Resource = aws_sqs_queue.notifications.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_basic_policy.arn
}

# --- CloudWatch Log Group for Lambdas ---
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-*"
  retention_in_days = 14
}

# --- Placeholder Lambda function (code must be uploaded separately) ---
resource "aws_lambda_function" "placeholder" {
  filename         = "placeholder.zip"
  function_name    = "${var.project_name}-placeholder-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256("placeholder.zip")

  environment {
    variables = {
      AWS_REGION = var.aws_region
      S3_BUCKET  = aws_s3_bucket.media.bucket
      SQS_URL    = aws_sqs_queue.notifications.id
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_attach]
}


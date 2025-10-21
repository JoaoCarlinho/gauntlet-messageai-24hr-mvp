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

  tags = {
    Name    = "${var.project_name}-media"
    Project = var.project_name
    Env     = var.environment
  }
}

# --- S3 bucket CORS configuration ---
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# --- S3 bucket lifecycle configuration ---
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "expire-temp-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
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
  name              = "/aws/lambda/${var.project_name}-${var.environment}"
  retention_in_days = 14
}

# --- Placeholder Lambda function (code must be uploaded separately) ---
resource "aws_lambda_function" "placeholder" {
  filename         = "placeholder.zip"
  function_name    = "${var.project_name}-placeholder-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  # source_code_hash = filebase64sha256("placeholder.zip")

  environment {
    variables = {
      AWS_REGION = var.aws_region
      S3_BUCKET  = aws_s3_bucket.media.bucket
      SQS_URL    = aws_sqs_queue.notifications.id
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic_attach]
}

# --- Railway Resources ---

# Railway Project
resource "railway_project" "messageai" {
  name = "${var.project_name}-${var.environment}"
}

# Railway PostgreSQL Database Service
resource "railway_service" "postgres" {
  project_id = railway_project.messageai.id
  name       = "postgres"
  source     = "postgresql:15"
}

# Railway Backend Service
resource "railway_service" "backend" {
  project_id = railway_project.messageai.id
  name       = "backend"
  source     = "."
}

# Railway Environment Variables for Backend Service
resource "railway_variable" "backend_database_url" {
  project_id = railway_project.messageai.id
  service_id = railway_service.backend.id
  name       = "DATABASE_URL"
  value      = railway_service.postgres.database_url
  sensitive  = true
}

resource "railway_variable" "backend_aws_region" {
  project_id = railway_project.messageai.id
  service_id = railway_service.backend.id
  name       = "AWS_REGION"
  value      = var.aws_region
}

resource "railway_variable" "backend_aws_s3_bucket" {
  project_id = railway_project.messageai.id
  service_id = railway_service.backend.id
  name       = "AWS_S3_BUCKET"
  value      = aws_s3_bucket.media.bucket
}

resource "railway_variable" "backend_aws_sqs_queue_url" {
  project_id = railway_project.messageai.id
  service_id = railway_service.backend.id
  name       = "AWS_SQS_QUEUE_URL"
  value      = aws_sqs_queue.notifications.url
}

resource "railway_variable" "backend_node_env" {
  project_id = railway_project.messageai.id
  service_id = railway_service.backend.id
  name       = "NODE_ENV"
  value      = var.environment
}

resource "railway_variable" "backend_port" {
  project_id = railway_project.messageai.id
  service_id = railway_service.backend.id
  name       = "PORT"
  value      = "3000"
}

# Railway Custom Domain (optional - can be configured later)
# resource "railway_domain" "backend" {
#   project_id = railway_project.messageai.id
#   service_id = railway_service.backend.id
#   domain     = "api.${var.project_name}.com"
# }


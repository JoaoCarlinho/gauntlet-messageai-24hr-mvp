# S3 Buckets for Sales Funnel
# Content Library S3 bucket for marketing content storage
resource "aws_s3_bucket" "content_library" {
  bucket = "${var.project_name}-content-library-${var.environment}-${random_id.content_bucket_id.hex}"

  tags = {
    Name    = "${var.project_name}-content-library"
    Project = var.project_name
    Env     = var.environment
  }
}

resource "aws_s3_bucket_ownership_controls" "content_library" {
  bucket = aws_s3_bucket.content_library.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "content_library" {
  depends_on = [aws_s3_bucket_ownership_controls.content_library]

  bucket = aws_s3_bucket.content_library.id
  acl    = "private"
}

resource "aws_s3_bucket_cors_configuration" "content_library" {
  bucket = aws_s3_bucket.content_library.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "random_id" "content_bucket_id" {
  byte_length = 4
}

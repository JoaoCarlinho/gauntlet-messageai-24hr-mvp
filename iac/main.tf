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

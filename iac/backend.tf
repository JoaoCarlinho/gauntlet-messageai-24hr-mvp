# Backend configuration examples. Uncomment and configure one of the backends before running terraform init.

# --- Option 1: Terraform Cloud backend (recommended for collaboration) ---
# terraform {
#   backend "remote" {
#     hostname     = "app.terraform.io"
#     organization = "YOUR_TF_ORG"
#     workspaces {
#       name = "messageai-${var.environment}"
#     }
#   }
# }

# --- Option 2: S3 + DynamoDB backend for state locking ---
# terraform {
#   backend "s3" {
#     bucket         = "<your-terraform-state-bucket>"
#     key            = "messageai/${var.environment}/terraform.tfstate"
#     region         = var.aws_region
#     encrypt        = true
#     dynamodb_table = "<your-lock-table>"
#   }
# }

# NOTE: Do NOT commit backend configuration containing secrets or bucket names.
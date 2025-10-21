# Infrastructure as Code (iac)

This folder contains a small Terraform scaffold intended to bootstrap cloud resources for the MessageAI MVP.

Quick start

1. Install Terraform 1.0+.
2. Configure AWS credentials (environment variables or shared credentials file).
3. Initialize and validate:

   terraform init
   terraform validate

Files
- `provider.tf` — Terraform settings and provider.
- `variables.tf` — Input variables.
- `main.tf` — Example resources (S3 bucket + random id).
- `outputs.tf` — Outputs.
- `validate.sh` — Small script to run basic checks.

Notes
- This scaffold is intentionally minimal. Extend resources and modules as required for production (VPC, IAM, EKS/RDS, etc.).

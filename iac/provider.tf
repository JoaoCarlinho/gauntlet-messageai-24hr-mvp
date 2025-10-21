terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.2"
    }
  }
}

provider "aws" {
  region = var.aws_region
  # Credentials will be picked up from environment or shared config (recommended)
}

provider "railway" {
  # Railway API key will be picked up from environment variable RAILWAY_API_KEY
}

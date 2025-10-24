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
    pinecone = {
      source  = "pinecone-io/pinecone"
      version = "~> 0.1"
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

provider "pinecone" {
  # API key is read from PINECONE_API_KEY environment variable
  # This is set in the tokens file: pcsk_6KQjYY_HxStHS4vorqLp4mDUhx545NR7C3F2uJdrbSvaf5uy2W96JuZuLN9UehDgnP3sZn
}

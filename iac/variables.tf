variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "messageai"
}

variable "environment" {
  description = "Deployment environment (development|staging|production)"
  type        = string
  default     = "production"
}

variable "railway_api_key" {
  description = "Railway API key for provisioning Railway resources (sensitive)"
  type        = string
  sensitive   = true
  default     = ""
}

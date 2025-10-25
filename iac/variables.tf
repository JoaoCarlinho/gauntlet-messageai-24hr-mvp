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

variable "database_url" {
  description = "Database connection URL for Lambda functions"
  type        = string
  sensitive   = true
  default     = ""
}

variable "api_url" {
  description = "API URL for Lambda functions to call back to"
  type        = string
  default     = ""
}

variable "backend_url" {
  description = "Backend URL for Socket.io notifications"
  type        = string
  default     = ""
}

variable "internal_api_secret" {
  description = "Internal API secret for backend communication"
  type        = string
  sensitive   = true
  default     = ""
}

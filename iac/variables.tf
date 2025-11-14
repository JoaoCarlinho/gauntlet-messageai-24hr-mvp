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

# Database Configuration
variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "messageai"
}

variable "database_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "database_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "use_aurora_serverless" {
  description = "Use Aurora Serverless v2 instead of standard RDS (more expensive but auto-scales)"
  type        = bool
  default     = false
}

variable "aurora_min_capacity" {
  description = "Minimum Aurora Capacity Units (0.5 = ~$0.12/hour)"
  type        = number
  default     = 0.5
}

variable "aurora_max_capacity" {
  description = "Maximum Aurora Capacity Units (2 = ~$0.48/hour)"
  type        = number
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS instance class for standard RDS (db.t4g.micro for budget)"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for RDS (doubles cost)"
  type        = bool
  default     = false
}

# Redis Configuration
variable "enable_redis" {
  description = "Enable ElastiCache Redis cluster"
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "ElastiCache node type (cache.t4g.micro for budget)"
  type        = string
  default     = "cache.t4g.micro"
}

# ECS Configuration
variable "ecs_task_cpu" {
  description = "CPU units for ECS task (512 = 0.5 vCPU)"
  type        = string
  default     = "512"
}

variable "ecs_task_memory" {
  description = "Memory for ECS task in MB"
  type        = string
  default     = "1024"
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS tasks for auto-scaling"
  type        = number
  default     = 5
}

# Networking Configuration
variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets (adds ~$32/month)"
  type        = bool
  default     = false
}

variable "enable_vpc_endpoints" {
  description = "Enable VPC endpoints for cost savings (recommended)"
  type        = bool
  default     = true
}

# SSL Certificate
variable "acm_certificate_arn" {
  description = "ARN of ACM SSL certificate for ALB HTTPS listener"
  type        = string
  default     = ""
}

# Secrets (these should be set via terraform.tfvars or environment variables)
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
}

variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
  default     = ""
}

variable "firebase_client_email" {
  description = "Firebase service account email"
  type        = string
  sensitive   = true
  default     = ""
}

variable "firebase_private_key" {
  description = "Firebase service account private key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "linkedin_credential_key" {
  description = "LinkedIn authentication encryption key"
  type        = string
  sensitive   = true
  default     = ""
}

# Monitoring & Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "sns_alarm_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms (optional)"
  type        = string
  default     = ""
}

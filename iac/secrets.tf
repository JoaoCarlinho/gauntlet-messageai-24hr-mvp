# AWS Secrets Manager - Secure storage for sensitive configuration

# Database URL
resource "aws_secretsmanager_secret" "database_url" {
  name        = "${var.project_name}/database_url-${var.environment}"
  description = "PostgreSQL connection string for MessageAI"

  tags = {
    Name        = "${var.project_name}/database_url-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = var.use_aurora_serverless ? "postgresql://${var.database_username}:${var.database_password}@${aws_rds_cluster.aurora[0].endpoint}:5432/${var.database_name}?schema=public" : "postgresql://${var.database_username}:${var.database_password}@${aws_db_instance.postgresql[0].endpoint}/${var.database_name}?schema=public"
}

# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/jwt_secret-${var.environment}"
  description = "JWT signing secret for MessageAI"

  tags = {
    Name        = "${var.project_name}/jwt_secret-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

# JWT Refresh Secret
resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name        = "${var.project_name}/jwt_refresh_secret-${var.environment}"
  description = "JWT refresh token secret for MessageAI"

  tags = {
    Name        = "${var.project_name}/jwt_refresh_secret-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_refresh_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh_secret.id
  secret_string = var.jwt_refresh_secret
}

# Firebase Project ID
resource "aws_secretsmanager_secret" "firebase_project_id" {
  name        = "${var.project_name}/firebase_project_id-${var.environment}"
  description = "Firebase project ID for push notifications"

  tags = {
    Name        = "${var.project_name}/firebase_project_id-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "firebase_project_id" {
  secret_id     = aws_secretsmanager_secret.firebase_project_id.id
  secret_string = var.firebase_project_id
}

# Firebase Client Email
resource "aws_secretsmanager_secret" "firebase_client_email" {
  name        = "${var.project_name}/firebase_client_email-${var.environment}"
  description = "Firebase service account email"

  tags = {
    Name        = "${var.project_name}/firebase_client_email-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "firebase_client_email" {
  secret_id     = aws_secretsmanager_secret.firebase_client_email.id
  secret_string = var.firebase_client_email
}

# Firebase Private Key
resource "aws_secretsmanager_secret" "firebase_private_key" {
  name        = "${var.project_name}/firebase_private_key-${var.environment}"
  description = "Firebase service account private key"

  tags = {
    Name        = "${var.project_name}/firebase_private_key-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "firebase_private_key" {
  secret_id     = aws_secretsmanager_secret.firebase_private_key.id
  secret_string = var.firebase_private_key != "" ? var.firebase_private_key : "placeholder-update-with-real-firebase-private-key"
}

# LinkedIn Credential Key
resource "aws_secretsmanager_secret" "linkedin_credential_key" {
  name        = "${var.project_name}/linkedin_credential_key-${var.environment}"
  description = "LinkedIn authentication encryption key"

  tags = {
    Name        = "${var.project_name}/linkedin_credential_key-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "linkedin_credential_key" {
  secret_id     = aws_secretsmanager_secret.linkedin_credential_key.id
  secret_string = var.linkedin_credential_key
}

# Redis URL (conditional based on Redis enablement)
resource "aws_secretsmanager_secret" "redis_url" {
  count = var.enable_redis ? 1 : 0

  name        = "${var.project_name}/redis_url-${var.environment}"
  description = "Redis connection URL for caching and sessions"

  tags = {
    Name        = "${var.project_name}/redis_url-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  count = var.enable_redis ? 1 : 0

  secret_id     = aws_secretsmanager_secret.redis_url[0].id
  secret_string = "redis://${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:6379"
}

# Outputs
output "secrets_manager_arns" {
  description = "ARNs of all Secrets Manager secrets"
  value = {
    database_url          = aws_secretsmanager_secret.database_url.arn
    jwt_secret            = aws_secretsmanager_secret.jwt_secret.arn
    jwt_refresh_secret    = aws_secretsmanager_secret.jwt_refresh_secret.arn
    firebase_project_id   = aws_secretsmanager_secret.firebase_project_id.arn
    firebase_client_email = aws_secretsmanager_secret.firebase_client_email.arn
    firebase_private_key  = aws_secretsmanager_secret.firebase_private_key.arn
    linkedin_credential_key = aws_secretsmanager_secret.linkedin_credential_key.arn
    redis_url             = var.enable_redis ? aws_secretsmanager_secret.redis_url[0].arn : "N/A"
  }
}

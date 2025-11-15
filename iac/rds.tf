# RDS PostgreSQL Database for MessageAI
# Choose between Aurora Serverless v2 or standard RDS based on budget

# Option 1: Aurora Serverless v2 (recommended for production with variable traffic)
# Uncomment this section if you want Aurora Serverless v2

resource "aws_rds_cluster" "aurora" {
  count = var.use_aurora_serverless ? 1 : 0

  cluster_identifier      = "${var.project_name}-aurora-cluster-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "14.9"
  database_name           = var.database_name
  master_username         = var.database_username
  master_password         = var.database_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  skip_final_snapshot     = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  serverlessv2_scaling_configuration {
    min_capacity = var.aurora_min_capacity  # 0.5 ACU = ~$0.12/hour
    max_capacity = var.aurora_max_capacity  # 2 ACU = ~$0.48/hour
  }

  # Enable encryption
  storage_encrypted = true

  # Enable deletion protection for production
  deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name        = "${var.project_name}-aurora-cluster-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster_instance" "aurora_instance" {
  count = var.use_aurora_serverless ? 1 : 0

  identifier           = "${var.project_name}-aurora-instance-1-${var.environment}"
  cluster_identifier   = aws_rds_cluster.aurora[0].id
  instance_class       = "db.serverless"
  engine               = aws_rds_cluster.aurora[0].engine
  engine_version       = aws_rds_cluster.aurora[0].engine_version
  publicly_accessible  = false
  db_subnet_group_name = aws_db_subnet_group.main.name

  tags = {
    Name        = "${var.project_name}-aurora-instance-1-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Option 2: Standard RDS PostgreSQL (recommended for budget-conscious deployments)
# This is much cheaper than Aurora Serverless (~$16-18/month vs $45-90/month)

resource "aws_db_instance" "postgresql" {
  count = var.use_aurora_serverless ? 0 : 1

  identifier             = "${var.project_name}-db-${var.environment}"
  engine                 = "postgres"
  engine_version         = "14"  # AWS will use latest 14.x version
  instance_class         = var.rds_instance_class  # db.t4g.micro for budget
  allocated_storage      = var.rds_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true
  db_name                = var.database_name
  username               = var.database_username
  password               = var.database_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "mon:04:00-mon:05:00"
  skip_final_snapshot       = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Performance Insights (optional, adds ~$7/month)
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = var.environment == "production" ? true : false

  # Multi-AZ for high availability (optional, doubles cost)
  multi_az = var.enable_multi_az

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Deletion protection for production
  deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name        = "${var.project_name}-db-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

# CloudWatch Alarms for RDS

# High CPU alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  count = var.use_aurora_serverless ? 0 : 1

  alarm_name          = "${var.project_name}-rds-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgresql[0].id
  }
}

# Low storage alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  count = var.use_aurora_serverless ? 0 : 1

  alarm_name          = "${var.project_name}-rds-low-storage-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648  # 2 GB in bytes
  alarm_description   = "This metric monitors RDS free storage space"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgresql[0].id
  }
}

# Connection count alarm
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count = var.use_aurora_serverless ? 0 : 1

  alarm_name          = "${var.project_name}-rds-high-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80  # Adjust based on max_connections setting
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgresql[0].id
  }
}

# Output database endpoint
output "database_endpoint" {
  description = "Database endpoint for connection"
  value       = var.use_aurora_serverless ? aws_rds_cluster.aurora[0].endpoint : aws_db_instance.postgresql[0].endpoint
  sensitive   = true
}

output "database_url" {
  description = "Full DATABASE_URL for Prisma"
  value       = var.use_aurora_serverless ? "postgresql://${var.database_username}:${var.database_password}@${aws_rds_cluster.aurora[0].endpoint}:5432/${var.database_name}?schema=public" : "postgresql://${var.database_username}:${var.database_password}@${aws_db_instance.postgresql[0].endpoint}/${var.database_name}?schema=public"
  sensitive   = true
}

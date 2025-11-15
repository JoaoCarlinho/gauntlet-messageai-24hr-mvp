# ElastiCache Redis for MessageAI
# Used for session caching, rate limiting, and Socket.io adapter

resource "aws_elasticache_replication_group" "redis" {
  count = var.enable_redis ? 1 : 0

  replication_group_id       = "${var.project_name}-redis-${var.environment}"
  description                = "Redis cluster for MessageAI caching and sessions"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = var.redis_node_type  # cache.t4g.micro for budget
  num_cache_clusters         = 1  # Single node for cost savings
  parameter_group_name       = aws_elasticache_parameter_group.redis[0].name
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.elasticache.id]

  # Automatic failover for high availability (requires 2+ nodes)
  automatic_failover_enabled = false  # Set to true with 2+ nodes

  # At-rest encryption
  at_rest_encryption_enabled = true

  # In-transit encryption
  transit_encryption_enabled = false  # Enable for production (requires TLS client support)

  # Backup configuration
  snapshot_retention_limit = 1
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "sun:05:00-sun:06:00"

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Apply changes immediately (be careful in production)
  apply_immediately = var.environment != "production"

  tags = {
    Name        = "${var.project_name}-redis-${var.environment}"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  count = var.enable_redis ? 1 : 0

  name   = "${var.project_name}-redis-params-${var.environment}"
  family = "redis7"

  # Optimize for memory usage
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict least recently used keys when memory full
  }

  # Timeout for idle connections (5 minutes)
  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = {
    Name    = "${var.project_name}-redis-params-${var.environment}"
    Project = var.project_name
  }
}

# CloudWatch Alarms for Redis

# High CPU alarm
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.enable_redis ? 1 : 0

  alarm_name          = "${var.project_name}-redis-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    CacheClusterId = "${var.project_name}-redis-${var.environment}-001"
  }
}

# Memory usage alarm
resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.enable_redis ? 1 : 0

  alarm_name          = "${var.project_name}-redis-high-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    CacheClusterId = "${var.project_name}-redis-${var.environment}-001"
  }
}

# Evictions alarm (indicates memory pressure)
resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  count = var.enable_redis ? 1 : 0

  alarm_name          = "${var.project_name}-redis-evictions-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "This metric monitors Redis evictions (memory pressure)"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    CacheClusterId = "${var.project_name}-redis-${var.environment}-001"
  }
}

# Outputs
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = var.enable_redis ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : "Redis disabled"
}

output "redis_port" {
  description = "Redis port"
  value       = var.enable_redis ? 6379 : 0
}

output "redis_url" {
  description = "Redis connection URL"
  value       = var.enable_redis ? "redis://${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:6379" : "Redis disabled"
  sensitive   = true
}

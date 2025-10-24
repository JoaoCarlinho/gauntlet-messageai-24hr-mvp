# EventBridge Rules for Sales Funnel Scheduling
# Daily metrics sync rule
resource "aws_cloudwatch_event_rule" "daily_metrics_sync" {
  name                = "${var.project_name}-daily-metrics-sync-${var.environment}"
  description         = "Trigger daily metrics sync for MessageAI"
  schedule_expression = "cron(0 6 * * ? *)" # Daily at 6 AM UTC

  tags = {
    Project = var.project_name
    Env     = var.environment
    Purpose = "daily-metrics-sync"
  }
}

# Weekly performance report rule
resource "aws_cloudwatch_event_rule" "weekly_report" {
  name                = "${var.project_name}-weekly-report-${var.environment}"
  description         = "Trigger weekly performance report for MessageAI"
  schedule_expression = "cron(0 9 ? * MON *)" # Weekly on Monday at 9 AM UTC

  tags = {
    Project = var.project_name
    Env     = var.environment
    Purpose = "weekly-report"
  }
}

# Event targets for metrics sync
resource "aws_cloudwatch_event_target" "metrics_sync_target" {
  rule      = aws_cloudwatch_event_rule.daily_metrics_sync.name
  target_id = "MetricsSyncTarget"
  arn       = aws_lambda_function.metrics_sync.arn
}

# Event targets for performance reporter
resource "aws_cloudwatch_event_target" "performance_reporter_target" {
  rule      = aws_cloudwatch_event_rule.weekly_report.name
  target_id = "PerformanceReporterTarget"
  arn       = aws_lambda_function.performance_reporter.arn
}

# Lambda permissions for EventBridge
resource "aws_lambda_permission" "allow_eventbridge_metrics" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metrics_sync.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_metrics_sync.arn
}

resource "aws_lambda_permission" "allow_eventbridge_performance" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.performance_reporter.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report.arn
}

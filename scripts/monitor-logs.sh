#!/bin/bash

# Railway Log Monitoring Script
# Usage: ./monitor-logs.sh <RAILWAY_TOKEN> <DEPLOYMENT_ID>

set -e

RAILWAY_TOKEN=$1
DEPLOYMENT_ID=$2

if [ -z "$RAILWAY_TOKEN" ] || [ -z "$DEPLOYMENT_ID" ]; then
    echo "Usage: $0 <RAILWAY_TOKEN> <DEPLOYMENT_ID>"
    echo "Get your Railway token from: https://railway.app/account/tokens"
    echo "Get Deployment ID from Railway dashboard or check-railway-build.sh script"
    exit 1
fi

echo "📋 Monitoring logs for deployment: $DEPLOYMENT_ID"
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Log monitoring stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Stream logs in real-time
curl -H "Authorization: Bearer $RAILWAY_TOKEN" \
     -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     "https://backboard.railway.app/graphql" \
     -d '{"query": "subscription { deploymentLogs(deploymentId: \"'$DEPLOYMENT_ID'\") { message timestamp level } }"}' \
     --no-buffer 2>/dev/null | while IFS= read -r line; do
    # Parse and format log entries
    if [[ $line == data:* ]]; then
        # Extract JSON data
        json_data=$(echo "$line" | sed 's/data: //')
        
        # Parse timestamp and message
        timestamp=$(echo "$json_data" | jq -r '.data.deploymentLogs.timestamp // "unknown"' 2>/dev/null || echo "unknown")
        message=$(echo "$json_data" | jq -r '.data.deploymentLogs.message // ""' 2>/dev/null || echo "")
        level=$(echo "$json_data" | jq -r '.data.deploymentLogs.level // "info"' 2>/dev/null || echo "info")
        
        if [ -n "$message" ]; then
            # Format timestamp
            if [ "$timestamp" != "unknown" ]; then
                formatted_time=$(date -d "$timestamp" "+%H:%M:%S" 2>/dev/null || echo "$timestamp")
            else
                formatted_time="unknown"
            fi
            
            # Color code by log level
            case $level in
                "error")
                    echo -e "\033[31m[$formatted_time] ERROR: $message\033[0m"
                    ;;
                "warn")
                    echo -e "\033[33m[$formatted_time] WARN:  $message\033[0m"
                    ;;
                "info")
                    echo -e "\033[36m[$formatted_time] INFO:  $message\033[0m"
                    ;;
                "debug")
                    echo -e "\033[90m[$formatted_time] DEBUG: $message\033[0m"
                    ;;
                *)
                    echo "[$formatted_time] $message"
                    ;;
            esac
        fi
    fi
done

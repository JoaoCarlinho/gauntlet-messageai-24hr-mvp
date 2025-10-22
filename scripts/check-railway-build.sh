#!/bin/bash

# Railway Build Status Checker
# Usage: ./check-railway-build.sh <RAILWAY_TOKEN> <PROJECT_ID>

set -e

RAILWAY_TOKEN=$1
PROJECT_ID=$2

if [ -z "$RAILWAY_TOKEN" ] || [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <RAILWAY_TOKEN> <PROJECT_ID>"
    echo "Get your Railway token from: https://railway.app/account/tokens"
    echo "Get your Project ID from Railway dashboard"
    exit 1
fi

echo "🔍 Checking Railway build status for project: $PROJECT_ID"

# Get latest deployment status
RESPONSE=$(curl -s -H "Authorization: Bearer $RAILWAY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "query { deployments(limit: 1) { id status createdAt logs { message } } }"}' \
     https://backboard.railway.app/graphql)

# Check if request was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to Railway API"
    exit 1
fi

# Parse response
STATUS=$(echo "$RESPONSE" | jq -r '.data.deployments[0].status // "unknown"')
DEPLOYMENT_ID=$(echo "$RESPONSE" | jq -r '.data.deployments[0].id // "unknown"')
CREATED_AT=$(echo "$RESPONSE" | jq -r '.data.deployments[0].createdAt // "unknown"')

echo "📊 Build Status: $STATUS"
echo "🆔 Deployment ID: $DEPLOYMENT_ID"
echo "⏰ Created At: $CREATED_AT"

# Check build status
case $STATUS in
    "SUCCESS")
        echo "✅ Build completed successfully!"
        exit 0
        ;;
    "FAILED")
        echo "❌ Build failed!"
        echo "📋 Recent logs:"
        echo "$RESPONSE" | jq -r '.data.deployments[0].logs[-5:] | .[].message'
        exit 1
        ;;
    "BUILDING"|"DEPLOYING")
        echo "⏳ Build in progress..."
        exit 2
        ;;
    *)
        echo "⚠️  Unknown status: $STATUS"
        exit 3
        ;;
esac

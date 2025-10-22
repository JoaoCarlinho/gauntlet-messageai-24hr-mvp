#!/bin/bash

# API Health Check Script
# Usage: ./health-check.sh <API_URL> [MAX_RETRIES] [RETRY_DELAY]

set -e

API_URL=$1
MAX_RETRIES=${2:-10}
RETRY_DELAY=${3:-30}

if [ -z "$API_URL" ]; then
    echo "Usage: $0 <API_URL> [MAX_RETRIES] [RETRY_DELAY]"
    echo "Example: $0 https://gauntlet-messageai-24hr-mvp-production.up.railway.app 10 30"
    exit 1
fi

echo "🏥 Starting health check for: $API_URL"
echo "🔄 Max retries: $MAX_RETRIES"
echo "⏱️  Retry delay: ${RETRY_DELAY}s"
echo ""

for i in $(seq 1 $MAX_RETRIES); do
    echo "🔍 Health check attempt $i/$MAX_RETRIES"
    
    # Perform health check
    if curl -f -s -m 10 "$API_URL/health" > /dev/null 2>&1; then
        echo "✅ Health check passed!"
        
        # Additional API endpoint checks
        echo "🔍 Testing additional endpoints..."
        
        # Test auth endpoint (login endpoint exists)
        if curl -f -s -m 10 -X POST "$API_URL/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test"}' > /dev/null 2>&1; then
            echo "✅ Auth service accessible"
        else
            echo "⚠️  Auth service may have issues (expected for invalid credentials)"
        fi
        
        # Test users endpoint (requires auth, so we expect 401)
        if curl -f -s -m 10 "$API_URL/api/v1/users" > /dev/null 2>&1; then
            echo "✅ Users service accessible"
        else
            echo "⚠️  Users service requires authentication (expected)"
        fi
        
        # Test conversations endpoint (requires auth, so we expect 401)
        if curl -f -s -m 10 "$API_URL/api/v1/conversations" > /dev/null 2>&1; then
            echo "✅ Conversations service accessible"
        else
            echo "⚠️  Conversations service requires authentication (expected)"
        fi
        
        echo ""
        echo "🎉 All health checks completed successfully!"
        exit 0
    fi
    
    echo "❌ Health check failed, retrying in $RETRY_DELAY seconds..."
    
    # Show last few lines of error for debugging
    echo "🔍 Last error details:"
    curl -s -m 10 "$API_URL/health" 2>&1 | tail -3 || true
    echo ""
    
    if [ $i -lt $MAX_RETRIES ]; then
        sleep $RETRY_DELAY
    fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
echo "🔍 Final error details:"
curl -s -m 10 "$API_URL/health" 2>&1 || true
exit 1

#!/bin/bash

# Railway Build Monitoring Setup Script
# This script helps set up the monitoring environment

set -e

echo "🚀 Setting up Railway Build Monitoring"
echo "======================================"

# Check if required tools are installed
echo "🔍 Checking required tools..."

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it:"
    echo "   macOS: brew install jq"
    echo "   Ubuntu: sudo apt-get install jq"
    echo "   Windows: choco install jq"
    exit 1
fi
echo "✅ jq is installed"

# Check for curl
if ! command -v curl &> /dev/null; then
    echo "❌ curl is not installed. Please install it."
    exit 1
fi
echo "✅ curl is installed"

# Check for GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI is not installed. It's recommended for managing secrets."
    echo "   Install it from: https://cli.github.com/"
else
    echo "✅ GitHub CLI is installed"
fi

echo ""
echo "📋 Setup Instructions:"
echo "======================"

echo ""
echo "1. 🔑 Railway Token Setup:"
echo "   - Go to: https://railway.app/account/tokens"
echo "   - Create a new token"
echo "   - Add it to GitHub secrets as 'RAILWAY_TOKEN'"

echo ""
echo "2. 🆔 Project ID Setup:"
echo "   - Go to your Railway project dashboard"
echo "   - Copy the Project ID from the URL or settings"
echo "   - Add it to GitHub secrets as 'RAILWAY_PROJECT_ID'"

echo ""
echo "3. 🔐 GitHub Secrets Setup:"
echo "   Run these commands (replace with your actual values):"
echo ""
echo "   gh secret set RAILWAY_TOKEN --body 'your_railway_token_here'"
echo "   gh secret set RAILWAY_PROJECT_ID --body 'your_project_id_here'"

echo ""
echo "4. 🧪 Test the Setup:"
echo "   Run these commands to test:"
echo ""
echo "   # Test build status check"
echo "   ./scripts/check-railway-build.sh YOUR_TOKEN YOUR_PROJECT_ID"
echo ""
echo "   # Test health check"
echo "   ./scripts/health-check.sh https://your-app.up.railway.app"

echo ""
echo "5. 📊 Monitor Logs:"
echo "   # Get deployment ID from build status check, then:"
echo "   ./scripts/monitor-logs.sh YOUR_TOKEN DEPLOYMENT_ID"

echo ""
echo "✅ Setup complete! The monitoring system is ready to use."
echo ""
echo "📚 For more information, see: logs/test_plan.md"

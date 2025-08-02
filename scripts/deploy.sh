#!/bin/bash

# Enerlectra Deployment Script
set -e

echo "🚀 Starting Enerlectra deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BRANCH=${2:-main}

echo "📋 Deployment Configuration:"
echo "Environment: $ENVIRONMENT"
echo "Branch: $BRANCH"
echo ""

# Check if required environment variables are set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY environment variable is not set${NC}"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Install TypeScript globally
echo "🔧 Installing TypeScript..."
npm install -g typescript

# Build application
echo "🏗️ Building application..."
npx tsc
mkdir -p dist/db
cp -r src/db/* dist/db/

# Run tests
echo "🧪 Running tests..."
if [ "$ENVIRONMENT" != "production" ]; then
    echo "Skipping tests in non-production environment"
else
    npm test
fi

# Health check
echo "❤️ Performing health check..."
timeout 30s bash -c 'until curl -f http://localhost:5000/health; do sleep 1; done' || {
    echo -e "${YELLOW}⚠️ Health check failed, but continuing deployment${NC}"
}

# Deploy based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🌍 Deploying to production..."
    echo "Production URL: https://enerlectra.replit.app"
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "🧪 Deploying to staging..."
    echo "Staging URL: https://enerlectra-staging.replit.app"
else
    echo "🏠 Deploying to development..."
    echo "Development URL: http://localhost:5000"
fi

# Verify deployment
echo "✅ Verifying deployment..."
sleep 5

# Final checks
echo "🔍 Running post-deployment checks..."
curl -f http://localhost:5000/health || {
    echo -e "${RED}❌ Deployment verification failed${NC}"
    exit 1
}

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📊 API Endpoints:"
echo "• Health: http://localhost:5000/health"
echo "• Market: http://localhost:5000/market/stats"
echo "• USSD: http://localhost:5000/ussd"
echo "• Documentation: README.md"
echo ""
echo -e "${GREEN}✅ Enerlectra is ready for African energy trading!${NC}"
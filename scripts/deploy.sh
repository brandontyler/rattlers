#!/bin/bash
# Deployment script for DFW Christmas Lights Finder

set -e

ENV=${1:-dev}
echo "🎄 Deploying to $ENV environment..."

# Deploy infrastructure
echo "📦 Deploying infrastructure..."
cd infrastructure
python -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -q -r requirements.txt
cdk deploy -c env=$ENV --require-approval never
cd ..

# Get outputs
echo "📋 Getting stack outputs..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ChristmasLightsStack-$ENV \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name ChristmasLightsStack-$ENV \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name ChristmasLightsStack-$ENV \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text)

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ChristmasLightsStack-$ENV \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name ChristmasLightsStack-$ENV \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" \
  --output text)

# Build frontend
echo "🔨 Building frontend..."
cd frontend
cat > .env <<EOF
VITE_API_ENDPOINT=${API_ENDPOINT}v1
VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID
VITE_COGNITO_CLIENT_ID=$CLIENT_ID
VITE_AWS_REGION=${AWS_REGION:-us-east-1}
EOF

npm install
npm run build
cd ..

# Deploy frontend
echo "🚀 Deploying frontend to S3..."
aws s3 sync frontend/dist/ s3://$FRONTEND_BUCKET/ --delete

# Invalidate CloudFront cache
echo "♻️  Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?Id=='S3-$FRONTEND_BUCKET']].Id" \
  --output text)

if [ -n "$DISTRIBUTION_ID" ]; then
  aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
fi

echo "✅ Deployment complete!"
echo ""
echo "📍 Application URL: $CLOUDFRONT_URL"
echo "📍 API Endpoint: $API_ENDPOINT"
echo ""
echo "🎅 Your Christmas Lights Finder is ready!"

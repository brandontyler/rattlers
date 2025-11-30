# Infrastructure - DFW Christmas Lights Finder

AWS CDK infrastructure code (Python) for deploying the application.

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CDK Toolkit installed: `npm install -g aws-cdk`
- Python 3.12+
- Node.js (for CDK CLI)

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Bootstrap CDK (first time only, per account/region)
cdk bootstrap
```

## Deployment

### Development Environment

```bash
# Synthesize CloudFormation template
cdk synth

# Deploy to dev environment
cdk deploy

# Deploy with specific profile
cdk deploy --profile your-aws-profile

# Deploy with approval
cdk deploy --require-approval never
```

### Production Environment

```bash
# Deploy to production
cdk deploy -c env=prod
```

## Stack Resources

The CDK stack creates:

### Compute
- **Lambda Functions** - Python 3.12 serverless functions
- **Lambda Layer** - Shared code (models, utilities)

### Storage
- **DynamoDB Tables** - 3 tables (locations, feedback, suggestions)
- **S3 Buckets** - 2 buckets (frontend, photos)

### API & Auth
- **API Gateway** - REST API with Cognito authorization
- **Cognito User Pool** - User authentication

### CDN
- **CloudFront Distribution** - Frontend delivery

## Useful CDK Commands

```bash
# List all stacks
cdk list

# Show differences between deployed and local
cdk diff

# Destroy stack (dev only!)
cdk destroy

# Watch mode (auto-deploy on changes)
cdk watch

# Show CloudFormation template
cdk synth > template.yaml
```

## Outputs

After deployment, CDK outputs important values:

- `ApiEndpoint` - API Gateway URL
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito Client ID
- `FrontendBucketName` - S3 bucket for frontend
- `CloudFrontUrl` - Frontend URL
- `PhotosBucketName` - S3 bucket for photos

Use these values to configure your frontend `.env` file.

## Environment Variables

CDK uses these environment variables:

- `CDK_DEFAULT_ACCOUNT` - AWS account ID
- `CDK_DEFAULT_REGION` - AWS region (default: us-east-1)

## Cost Estimates

Based on AWS Free Tier and on-demand pricing:

**Free Tier (first 12 months):**
- Lambda: 1M requests/month, 400,000 GB-seconds
- API Gateway: 1M requests/month
- DynamoDB: 25 GB storage, 200M requests
- S3: 5 GB storage, 20,000 GET, 2,000 PUT
- CloudFront: 1 TB transfer, 10M requests

**Beyond Free Tier (monthly estimates):**
- Low traffic (< 1000 users): $10-30
- Medium traffic (10,000 users): $50-150
- High traffic (100,000 users): $300-800

## Project Structure

```
infrastructure/
├── app.py              # CDK app entry point
├── cdk.json            # CDK configuration
├── requirements.txt    # Python dependencies
└── stacks/
    └── main_stack.py   # Main infrastructure stack
```

## Configuration

### Custom Domain (Future)
To use a custom domain:
1. Register domain in Route 53
2. Request SSL certificate in ACM
3. Update CloudFront distribution
4. Add Route 53 alias record

### Alarms & Monitoring (Future)
Add CloudWatch alarms for:
- Lambda errors > 5%
- API Gateway 5xx errors
- DynamoDB throttling
- Estimated monthly cost > threshold

## Troubleshooting

### Bootstrap Issues
```bash
# Re-bootstrap if needed
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Permission Errors
Ensure your AWS credentials have:
- CloudFormation full access
- Lambda, API Gateway, DynamoDB, S3, Cognito, CloudFront permissions
- IAM role creation permissions

### Stack Stuck in UPDATE_ROLLBACK_FAILED
```bash
# Continue rollback from AWS Console or
aws cloudformation continue-update-rollback --stack-name ChristmasLightsStack-dev
```

## Security Notes

- All S3 buckets block public access by default
- API Gateway uses Cognito authorization
- CloudFront uses HTTPS only
- Secrets should use AWS Secrets Manager (not implemented yet)
- For production, enable:
  - CloudTrail logging
  - GuardDuty
  - Security Hub
  - Config rules

## Updating Infrastructure

1. Modify stack code
2. Run `cdk diff` to see changes
3. Run `cdk deploy` to apply
4. Monitor CloudFormation events in console

## Cleanup

```bash
# Destroy development stack
cdk destroy

# Note: S3 buckets with objects won't delete automatically
# Empty them first or set auto_delete_objects=True in code
```

## Next Steps

- [ ] Add custom domain
- [ ] Set up CI/CD pipeline
- [ ] Add CloudWatch alarms
- [ ] Implement AWS WAF rules
- [ ] Add VPC for Lambda functions (if needed)
- [ ] Set up Route 53 health checks
- [ ] Configure backup policies

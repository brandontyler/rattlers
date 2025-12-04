# GitHub Actions Workflows

## Automatic Deployment

The `deploy.yml` workflow automatically deploys the application to AWS when changes are merged to the `main` branch.

### What it does:

1. **Deploy Infrastructure** - CDK stack (Lambda, DynamoDB, API Gateway, etc.)
2. **Build Frontend** - React app with environment variables
3. **Upload to S3** - Static files to S3 bucket
4. **Invalidate CloudFront** - Clear CDN cache for immediate updates

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key with deployment permissions | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS region for deployment | `us-east-1` |

### AWS IAM Permissions Required

The AWS credentials need the following permissions:

- **CloudFormation**: Full access (for CDK)
- **Lambda**: Create/update functions
- **API Gateway**: Create/update APIs
- **DynamoDB**: Create/update tables
- **S3**: Create buckets, upload files
- **CloudFront**: Create distributions, create invalidations
- **Cognito**: Create user pools
- **IAM**: Create roles for Lambda functions
- **CloudWatch**: Create log groups

**Recommended**: Attach the `PowerUserAccess` managed policy, or create a custom policy with these permissions.

### Testing the Workflow

1. Make a change to your code
2. Create a pull request
3. Merge to `main`
4. GitHub Actions will automatically deploy
5. Check the **Actions** tab to monitor progress
6. Deployment takes ~3-5 minutes

### CloudFront Cache Invalidation

The workflow automatically invalidates the CloudFront cache (`/*`) after deployment, so changes appear immediately (typically within 1-2 minutes).

### Deployment Summary

After each deployment, GitHub Actions generates a summary with:
- Frontend URL (CloudFront)
- API endpoint
- CloudFront distribution ID
- Deployment status

### Troubleshooting

**CDK deployment fails:**
- Ensure AWS credentials are valid
- Check that `cdk bootstrap` has been run once manually
- Verify IAM permissions

**Frontend not updating:**
- Check CloudFront invalidation completed
- Hard refresh browser (Ctrl+Shift+R)
- Check S3 files were uploaded

**Build fails:**
- Check frontend dependencies are in package.json
- Verify environment variables are correct
- Review build logs in Actions tab

### Manual Deployment

You can still deploy manually if needed:

```bash
# Infrastructure
cd infrastructure
uv run cdk deploy

# Frontend
cd frontend
npm run build
aws s3 sync dist/ s3://your-bucket-name/
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Workflow Customization

To modify the workflow:
- Edit `.github/workflows/deploy.yml`
- Add staging environment (duplicate workflow, change branch trigger)
- Add tests before deployment
- Add Slack/Discord notifications

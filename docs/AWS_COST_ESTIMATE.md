# AWS Cost Estimate - Christmas Lights Finder

**Created:** December 6, 2025
**Region:** us-east-1 (prices may vary by region)

---

## Services Overview

| Service | Usage Type | Billing Model |
|---------|------------|---------------|
| DynamoDB | 3 tables + GSIs | On-demand (pay per request) |
| Lambda | 18 functions | Pay per invocation + duration |
| S3 | 2 buckets | Storage + requests |
| CloudFront | 2 distributions | Data transfer + requests |
| API Gateway | REST API | Per request |
| Cognito | User Pool | Monthly active users |
| Bedrock | Claude 3.5 Sonnet | Input/output tokens |

---

## Traffic Scenarios

| Metric | Small | Medium | Large |
|--------|-------|--------|-------|
| Monthly Active Users | 500 | 5,000 | 50,000 |
| Daily Active Users | 50 | 500 | 5,000 |
| Page Views/Month | 10,000 | 100,000 | 1,000,000 |
| API Requests/Month | 50,000 | 500,000 | 5,000,000 |
| Photo Uploads/Month | 50 | 500 | 5,000 |
| New Locations/Month | 20 | 200 | 2,000 |

---

## Detailed Cost Breakdown

### 1. DynamoDB

**Pricing (us-east-1):**
- Write Request Units (WRU): $1.25 per million
- Read Request Units (RRU): $0.25 per million
- Storage: $0.25 per GB/month

| Scenario | Reads | Writes | Storage | Monthly Cost |
|----------|-------|--------|---------|--------------|
| **Small** | 100K | 10K | 0.5 GB | **$0.15** |
| **Medium** | 1M | 100K | 2 GB | **$1.00** |
| **Large** | 10M | 1M | 10 GB | **$6.00** |

*Note: On-demand pricing is very cost-effective for variable traffic.*

---

### 2. Lambda

**Pricing:**
- Requests: $0.20 per 1M requests
- Duration: $0.0000166667 per GB-second
- Free tier: 1M requests + 400,000 GB-seconds/month

**Function Summary:**
| Function Type | Memory | Avg Duration | Count |
|--------------|--------|--------------|-------|
| Fast reads | 256 MB | 100ms | 10 |
| Write ops | 512 MB | 300ms | 5 |
| Photo analysis | 512 MB | 5s | 1 |
| PDF generation | 512 MB | 3s | 1 |

| Scenario | Invocations | GB-seconds | Monthly Cost |
|----------|-------------|------------|--------------|
| **Small** | 50K | 5,000 | **$0.10** (free tier) |
| **Medium** | 500K | 50,000 | **$1.00** |
| **Large** | 5M | 500,000 | **$10.00** |

---

### 3. S3 Storage

**Pricing:**
- Storage: $0.023 per GB/month
- PUT/POST requests: $0.005 per 1,000
- GET requests: $0.0004 per 1,000

**Buckets:**
1. Frontend: ~50 MB (static assets)
2. Photos: Variable (avg 2MB per photo after compression)

| Scenario | Photo Storage | Requests | Monthly Cost |
|----------|--------------|----------|--------------|
| **Small** | 0.5 GB (250 photos) | 50K | **$0.05** |
| **Medium** | 5 GB (2,500 photos) | 500K | **$0.35** |
| **Large** | 50 GB (25,000 photos) | 5M | **$3.20** |

---

### 4. CloudFront CDN

**Pricing (North America):**
- Data transfer: $0.085 per GB (first 10 TB)
- HTTP requests: $0.0075 per 10,000
- HTTPS requests: $0.01 per 10,000

**Assumptions:**
- Average page load: 500 KB
- Average photo: 200 KB
- 80% cache hit rate

| Scenario | Data Transfer | Requests | Monthly Cost |
|----------|--------------|----------|--------------|
| **Small** | 5 GB | 100K | **$0.55** |
| **Medium** | 50 GB | 1M | **$5.25** |
| **Large** | 500 GB | 10M | **$52.50** |

---

### 5. API Gateway

**Pricing:**
- REST API: $3.50 per million requests
- Data transfer: Included in CloudFront

| Scenario | Requests | Monthly Cost |
|----------|----------|--------------|
| **Small** | 50K | **$0.18** |
| **Medium** | 500K | **$1.75** |
| **Large** | 5M | **$17.50** |

---

### 6. Cognito

**Pricing:**
- First 50,000 MAUs: FREE
- 50,001 - 100,000: $0.0055 per MAU

| Scenario | MAUs | Monthly Cost |
|----------|------|--------------|
| **Small** | 500 | **$0.00** (free) |
| **Medium** | 5,000 | **$0.00** (free) |
| **Large** | 50,000 | **$0.00** (free) |

*Note: Even at large scale, Cognito is free for first 50K MAUs!*

---

### 7. Bedrock (Claude 3.5 Sonnet)

**Pricing (Claude 3.5 Sonnet v2):**
- Input tokens: $3.00 per 1M tokens
- Output tokens: $15.00 per 1M tokens

**Photo Analysis:**
- Input per photo: ~1,500 tokens (image + prompt)
- Output per photo: ~200 tokens

| Scenario | Photos Analyzed | Input Tokens | Output Tokens | Monthly Cost |
|----------|-----------------|--------------|---------------|--------------|
| **Small** | 50 | 75K | 10K | **$0.38** |
| **Medium** | 500 | 750K | 100K | **$3.75** |
| **Large** | 5,000 | 7.5M | 1M | **$37.50** |

---

## Monthly Cost Summary

| Service | Small | Medium | Large |
|---------|-------|--------|-------|
| DynamoDB | $0.15 | $1.00 | $6.00 |
| Lambda | $0.10 | $1.00 | $10.00 |
| S3 | $0.05 | $0.35 | $3.20 |
| CloudFront | $0.55 | $5.25 | $52.50 |
| API Gateway | $0.18 | $1.75 | $17.50 |
| Cognito | $0.00 | $0.00 | $0.00 |
| Bedrock | $0.38 | $3.75 | $37.50 |
| **TOTAL** | **$1.41** | **$13.10** | **$126.70** |

---

## Annual Cost Projection

*Christmas lights apps have highly seasonal traffic - peak Nov-Jan, minimal Feb-Oct*

| Period | Duration | Traffic Level | Cost |
|--------|----------|---------------|------|
| Off-season (Feb-Oct) | 9 months | Minimal (~$5/mo) | $45 |
| Pre-season (Nov) | 1 month | Medium | $13 |
| Peak season (Dec) | 1 month | Large | $127 |
| Post-season (Jan) | 1 month | Medium | $13 |
| **ANNUAL TOTAL** | 12 months | Variable | **~$200** |

---

## Cost Optimization Tips

### Already Implemented
1. **DynamoDB On-Demand** - No idle costs, pay only for usage
2. **Lambda right-sizing** - Different memory for different functions
3. **S3 Lifecycle Rules** - Auto-delete pending uploads after 48h
4. **CloudFront Caching** - Reduces Lambda/API invocations
5. **Photo Compression** - 20MB → 2MB saves storage costs

### Recommended
1. **Lambda ARM64 (Graviton)** - 20% cheaper than x86
   - Add `architecture: lambda_.Architecture.ARM_64`
   - Savings: ~$2/mo at medium scale

2. **CloudFront Cache TTL** - Increase cache duration
   - Locations rarely change, cache for 1 hour
   - Savings: ~$1/mo at medium scale

3. **S3 Intelligent-Tiering** - Auto-archive old photos
   - Move photos >90 days to Infrequent Access
   - Savings: 40% on storage for old photos

4. **Reserved Capacity** - Not recommended for seasonal apps

---

## Free Tier Benefits (First 12 Months)

| Service | Free Tier Included |
|---------|-------------------|
| Lambda | 1M requests + 400K GB-seconds |
| DynamoDB | 25 GB storage + 25 RCU/WCU |
| S3 | 5 GB storage + 20K GET + 2K PUT |
| CloudFront | 1 TB data transfer + 10M requests |
| API Gateway | 1M API calls |
| Cognito | 50,000 MAUs (always free) |

**With Free Tier:** First year could be nearly **FREE** at small scale!

---

## Cost Alerts Setup

```bash
# Set up AWS Budget alerts
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget '{
    "BudgetName": "ChristmasLights-Monthly",
    "BudgetLimit": {"Amount": "50", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "your-email@example.com"
    }]
  }]'
```

---

## Key Takeaways

1. **Very affordable at small scale** - ~$1.50/month for 500 users
2. **Scales linearly** - Costs grow predictably with traffic
3. **Seasonal optimization** - Most costs only during peak season
4. **Bedrock is the largest variable cost** - Consider batch processing
5. **CloudFront dominates at scale** - But provides best UX
6. **Cognito is FREE** - Even for 50K users

---

*Prices as of December 2025. Check [AWS Pricing Calculator](https://calculator.aws/) for current rates.*

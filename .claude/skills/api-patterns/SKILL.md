---
name: api-patterns
description: API development patterns for Lambda handlers
---

# API Patterns

## Handler Structure
```typescript
import { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { createResponse, createErrorResponse } from "../../shared/utils/response";

const RequestSchema = z.object({
  // Define request schema
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const validated = RequestSchema.parse(body);

    // Handler logic

    return createResponse(200, { data });
  } catch (error) {
    return createErrorResponse(error);
  }
};
```

## Response Utilities
- Use `createResponse(statusCode, body)` for success
- Use `createErrorResponse(error)` for errors
- Always include CORS headers

## Validation
- Use Zod schemas for all request validation
- Return 400 for validation errors
- Return 401 for auth errors
- Return 404 for not found
- Return 500 for unexpected errors

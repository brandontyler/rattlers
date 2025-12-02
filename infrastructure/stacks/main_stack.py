"""Main CDK stack for Christmas Lights application."""

from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_cognito as cognito,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
)
from constructs import Construct
import os


class ChristmasLightsStack(Stack):
    """Main stack for Christmas Lights Finder application."""

    def __init__(self, scope: Construct, construct_id: str, env_name: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.env_name = env_name

        # Create DynamoDB tables
        self.create_dynamodb_tables()

        # Create S3 buckets
        self.create_s3_buckets()

        # Create Cognito user pool
        self.create_cognito_pool()

        # Create Lambda layer with shared code
        self.create_lambda_layer()

        # Create Lambda functions
        self.create_lambda_functions()

        # Create API Gateway
        self.create_api_gateway()

        # Create CloudFront distribution for frontend
        self.create_cloudfront_distribution()

        # Create outputs
        self.create_outputs()

    def create_dynamodb_tables(self):
        """Create DynamoDB tables."""

        # Locations table
        self.locations_table = dynamodb.Table(
            self,
            "LocationsTable",
            table_name=f"christmas-lights-locations-{self.env_name}",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery=True,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
        )

        # Add GSI for querying by status and creation date
        self.locations_table.add_global_secondary_index(
            index_name="status-createdAt-index",
            partition_key=dynamodb.Attribute(
                name="status", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # Add GSI for querying by status and rating (for top-rated displays)
        self.locations_table.add_global_secondary_index(
            index_name="status-averageRating-index",
            partition_key=dynamodb.Attribute(
                name="status", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="averageRating", type=dynamodb.AttributeType.NUMBER
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # Feedback table
        self.feedback_table = dynamodb.Table(
            self,
            "FeedbackTable",
            table_name=f"christmas-lights-feedback-{self.env_name}",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
        )

        # Suggestions table
        self.suggestions_table = dynamodb.Table(
            self,
            "SuggestionsTable",
            table_name=f"christmas-lights-suggestions-{self.env_name}",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
        )

    def create_s3_buckets(self):
        """Create S3 buckets."""

        # Frontend bucket
        self.frontend_bucket = s3.Bucket(
            self,
            "FrontendBucket",
            bucket_name=f"christmas-lights-frontend-{self.env_name}-{self.account}",
            website_index_document="index.html",
            website_error_document="index.html",
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
            auto_delete_objects=self.env_name == "dev",
        )

        # Determine allowed origins for S3 CORS
        if self.env_name == "prod":
            s3_allowed_origins = ["https://christmaslights.example.com"]
        else:
            s3_allowed_origins = ["http://localhost:5173", "http://localhost:3000"]

        # Photos bucket
        self.photos_bucket = s3.Bucket(
            self,
            "PhotosBucket",
            bucket_name=f"christmas-lights-photos-{self.env_name}-{self.account}",
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowed_origins=s3_allowed_origins,
                    allowed_headers=["Content-Type", "Content-Length"],
                    max_age=3000,
                )
            ],
            lifecycle_rules=[
                s3.LifecycleRule(
                    abort_incomplete_multipart_upload_after=Duration.days(7),
                    expiration=Duration.days(365),  # Delete old photos after 1 year
                )
            ],
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
            auto_delete_objects=self.env_name == "dev",
        )

    def create_cognito_pool(self):
        """Create Cognito user pool for authentication."""

        self.user_pool = cognito.UserPool(
            self,
            "UserPool",
            user_pool_name=f"christmas-lights-users-{self.env_name}",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
        )

        # Create admin group
        cognito.CfnUserPoolGroup(
            self,
            "AdminsGroup",
            user_pool_id=self.user_pool.user_pool_id,
            group_name="Admins",
            description="Administrator users",
        )

        # Create user pool client
        self.user_pool_client = self.user_pool.add_client(
            "UserPoolClient",
            user_pool_client_name=f"christmas-lights-client-{self.env_name}",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
            generate_secret=False,
        )

    def create_lambda_layer(self):
        """Create Lambda layer with shared code."""

        self.common_layer = lambda_.LayerVersion(
            self,
            "CommonLayer",
            code=lambda_.Code.from_asset("../backend/layers/common"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_12],
            description="Common utilities and models",
        )

    def create_lambda_functions(self):
        """Create Lambda functions."""

        # Determine allowed origin for CORS
        if self.env_name == "prod":
            allowed_origin = "https://christmaslights.example.com"
        else:
            allowed_origin = "http://localhost:5173"

        # Common environment variables
        common_env = {
            "LOCATIONS_TABLE_NAME": self.locations_table.table_name,
            "FEEDBACK_TABLE_NAME": self.feedback_table.table_name,
            "SUGGESTIONS_TABLE_NAME": self.suggestions_table.table_name,
            "PHOTOS_BUCKET_NAME": self.photos_bucket.bucket_name,
            "ALLOWED_ORIGIN": allowed_origin,
            "ENV_NAME": self.env_name,
        }

        # Locations functions - read operations (optimized)
        self.get_locations_fn = lambda_.Function(
            self,
            "GetLocationsFunction",
            handler="get_locations.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),  # Quick read operations
            memory_size=256,  # Less memory for simple queries
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_data(self.get_locations_fn)

        self.get_location_by_id_fn = lambda_.Function(
            self,
            "GetLocationByIdFunction",
            handler="get_location_by_id.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(5),  # Very fast single-item read
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_data(self.get_location_by_id_fn)

        # Create location - write operation (needs more time)
        self.create_location_fn = lambda_.Function(
            self,
            "CreateLocationFunction",
            handler="create_location.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(15),  # Write operations need more time
            memory_size=512,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_write_data(self.create_location_fn)

        # Store functions for API Gateway integration
        self.lambda_functions = {
            "get_locations": self.get_locations_fn,
            "get_location_by_id": self.get_location_by_id_fn,
            "create_location": self.create_location_fn,
        }

    def create_api_gateway(self):
        """Create API Gateway REST API."""

        # Create authorizer
        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "CognitoAuthorizer",
            cognito_user_pools=[self.user_pool],
        )

        # Determine allowed origins based on environment
        if self.env_name == "prod":
            # TODO: Replace with your actual production domain
            allowed_origins = ["https://christmaslights.example.com"]
        else:
            # Development: allow localhost
            allowed_origins = [
                "http://localhost:5173",
                "http://localhost:3000",
                f"https://{self.distribution.distribution_domain_name}" if hasattr(self, 'distribution') else "http://localhost:5173"
            ]

        # Create API with rate limiting
        self.api = apigw.RestApi(
            self,
            "ChristmasLightsApi",
            rest_api_name=f"christmas-lights-api-{self.env_name}",
            description="Christmas Lights Finder API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=allowed_origins,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"],
            ),
            deploy_options=apigw.StageOptions(
                stage_name=self.env_name,
                throttling_rate_limit=100,  # Requests per second
                throttling_burst_limit=200,  # Burst capacity
                logging_level=apigw.MethodLoggingLevel.INFO,
                data_trace_enabled=True,
                metrics_enabled=True,
            ),
        )

        # API v1
        v1 = self.api.root.add_resource("v1")

        # /locations endpoints
        locations = v1.add_resource("locations")
        locations.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_locations_fn),
        )
        locations.add_method(
            "POST",
            apigw.LambdaIntegration(self.create_location_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /locations/{id} endpoints
        location_by_id = locations.add_resource("{id}")
        location_by_id.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_location_by_id_fn),
        )

        # TODO: Add more endpoints (feedback, suggestions, etc.)

    def create_cloudfront_distribution(self):
        """Create CloudFront distribution for frontend."""

        # Origin Access Identity for S3
        oai = cloudfront.OriginAccessIdentity(
            self,
            "OAI",
            comment=f"OAI for Christmas Lights frontend {self.env_name}",
        )

        self.frontend_bucket.grant_read(oai)

        # CloudFront distribution
        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(
                    self.frontend_bucket,
                    origin_access_identity=oai,
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_page_path="/index.html",
                    response_http_status=200,
                ),
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_page_path="/index.html",
                    response_http_status=200,
                ),
            ],
        )

    def create_outputs(self):
        """Create CloudFormation outputs."""

        CfnOutput(
            self,
            "ApiEndpoint",
            value=self.api.url,
            description="API Gateway endpoint URL",
        )

        CfnOutput(
            self,
            "UserPoolId",
            value=self.user_pool.user_pool_id,
            description="Cognito User Pool ID",
        )

        CfnOutput(
            self,
            "UserPoolClientId",
            value=self.user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID",
        )

        CfnOutput(
            self,
            "FrontendBucketName",
            value=self.frontend_bucket.bucket_name,
            description="Frontend S3 bucket name",
        )

        CfnOutput(
            self,
            "CloudFrontUrl",
            value=f"https://{self.distribution.distribution_domain_name}",
            description="CloudFront distribution URL",
        )

        CfnOutput(
            self,
            "PhotosBucketName",
            value=self.photos_bucket.bucket_name,
            description="Photos S3 bucket name",
        )

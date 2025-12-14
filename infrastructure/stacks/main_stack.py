"""Main CDK stack for Christmas Lights application."""

from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_lambda_event_sources as lambda_events,
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

        # Create CloudFront distribution for frontend (before Lambda so CORS origin is available)
        self.create_cloudfront_distribution()

        # Create Lambda layer with shared code
        self.create_lambda_layer()

        # Create Lambda functions (after CloudFront so CORS can include CF domain)
        self.create_lambda_functions()

        # Configure Cognito Lambda triggers (after Lambda functions are created)
        self.configure_cognito_triggers()

        # Create API Gateway (after CloudFront so CORS can include CF domain)
        self.create_api_gateway()

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

        # Add GSI for efficient user feedback queries
        self.feedback_table.add_global_secondary_index(
            index_name="userId-locationId-index",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="locationId", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
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

        # Users table
        self.users_table = dynamodb.Table(
            self,
            "UsersTable",
            table_name=f"christmas-lights-users-{self.env_name}",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
        )

        # Add GSI for querying by username
        self.users_table.add_global_secondary_index(
            index_name="username-index",
            partition_key=dynamodb.Attribute(
                name="username", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # Routes table - for saved/shared routes
        self.routes_table = dynamodb.Table(
            self,
            "RoutesTable",
            table_name=f"christmas-lights-routes-{self.env_name}",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
        )

        # GSI for querying public routes by like count (popular routes leaderboard)
        self.routes_table.add_global_secondary_index(
            index_name="status-likeCount-index",
            partition_key=dynamodb.Attribute(
                name="status", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="likeCount", type=dynamodb.AttributeType.NUMBER
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI for querying routes by creator (user's routes)
        self.routes_table.add_global_secondary_index(
            index_name="createdBy-createdAt-index",
            partition_key=dynamodb.Attribute(
                name="createdBy", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI for querying public routes by creation date (new routes)
        self.routes_table.add_global_secondary_index(
            index_name="status-createdAt-index",
            partition_key=dynamodb.Attribute(
                name="status", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # Route feedback table - for likes, saves, and starts on routes
        self.route_feedback_table = dynamodb.Table(
            self,
            "RouteFeedbackTable",
            table_name=f"christmas-lights-route-feedback-{self.env_name}",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
        )

        # GSI for querying user's feedback on routes (prevent duplicates, get user's saved routes)
        self.route_feedback_table.add_global_secondary_index(
            index_name="userId-routeId-index",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="routeId", type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL,
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
                # Clean up orphaned pending uploads after 48 hours
                s3.LifecycleRule(
                    id="cleanup-pending-uploads",
                    prefix="pending/",
                    expiration=Duration.days(2),
                ),
                # Clean up generated PDFs after 1 day (they're temporary)
                s3.LifecycleRule(
                    id="cleanup-pdfs",
                    prefix="pdfs/",
                    expiration=Duration.days(1),
                ),
                s3.LifecycleRule(
                    id="cleanup-multipart",
                    abort_incomplete_multipart_upload_after=Duration.days(1),
                ),
            ],
            removal_policy=RemovalPolicy.DESTROY if self.env_name == "dev" else RemovalPolicy.RETAIN,
            auto_delete_objects=self.env_name == "dev",
        )

    def create_cognito_pool(self):
        """Create Cognito user pool for authentication."""

        # Note: Lambda triggers will be added after Lambda functions are created
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

    def configure_cognito_triggers(self):
        """Configure Lambda triggers for Cognito user pool.

        This must be called after Lambda functions are created.
        """
        # Grant Cognito permission to invoke the post-auth Lambda
        self.post_auth_fn.grant_invoke(
            iam.ServicePrincipal("cognito-idp.amazonaws.com")
        )

        # Add post-authentication trigger to user pool
        # We use CfnUserPool to add the Lambda config
        cfn_user_pool = self.user_pool.node.default_child
        cfn_user_pool.lambda_config = cognito.CfnUserPool.LambdaConfigProperty(
            post_authentication=self.post_auth_fn.function_arn
        )

    def create_lambda_layer(self):
        """Create Lambda layer with shared code and dependencies."""
        import time
        import subprocess
        import shutil
        import tempfile

        layer_source = "../backend/layers/common"
        
        # Create a temporary directory for bundling
        with tempfile.TemporaryDirectory() as tmpdir:
            python_dir = os.path.join(tmpdir, "python")
            os.makedirs(python_dir)
            
            # Export dependencies from uv.lock and install them
            pyproject_file = os.path.join(layer_source, "pyproject.toml")
            if os.path.exists(pyproject_file):
                subprocess.run(
                    ["uv", "export", "--no-hashes", "--no-dev", "--frozen", "-o", f"{tmpdir}/requirements.txt"],
                    cwd=layer_source,
                    check=True
                )
                subprocess.run(
                    ["uv", "pip", "install", "-r", f"{tmpdir}/requirements.txt", "--target", python_dir, "--quiet"],
                    check=True
                )
            
            # Copy custom Python modules
            source_python_dir = os.path.join(layer_source, "python")
            if os.path.exists(source_python_dir):
                for item in os.listdir(source_python_dir):
                    src = os.path.join(source_python_dir, item)
                    dst = os.path.join(python_dir, item)
                    if os.path.isdir(src):
                        shutil.copytree(src, dst, dirs_exist_ok=True)
                    else:
                        shutil.copy2(src, dst)
            
            self.common_layer = lambda_.LayerVersion(
                self,
                "CommonLayer",
                code=lambda_.Code.from_asset(tmpdir),
                compatible_runtimes=[lambda_.Runtime.PYTHON_3_12],
                description=f"Common utilities and models - v{int(time.time())}",
            )

    def create_lambda_functions(self):
        """Create Lambda functions."""

        # Determine allowed origins for CORS
        if self.env_name == "prod":
            allowed_origins = ["https://christmaslights.example.com"]
        else:
            # Dev: CloudFront + localhost for local development
            allowed_origins = [
                f"https://{self.distribution.distribution_domain_name}",
                "http://localhost:5173",
                "http://localhost:3000",
            ]

        # Common environment variables
        common_env = {
            "LOCATIONS_TABLE_NAME": self.locations_table.table_name,
            "FEEDBACK_TABLE_NAME": self.feedback_table.table_name,
            "SUGGESTIONS_TABLE_NAME": self.suggestions_table.table_name,
            "ROUTES_TABLE_NAME": self.routes_table.table_name,
            "ROUTE_FEEDBACK_TABLE_NAME": self.route_feedback_table.table_name,
            "PHOTOS_BUCKET_NAME": self.photos_bucket.bucket_name,
            "PHOTOS_CDN_URL": f"https://{self.photos_distribution.distribution_domain_name}" if hasattr(self, 'photos_distribution') else "",
            "ALLOWED_ORIGINS": ",".join(allowed_origins),
            "ALLOWED_ORIGIN": allowed_origins[0],  # Keep for backwards compatibility
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

        # Delete location (admin only) - for testing
        self.delete_location_fn = lambda_.Function(
            self,
            "DeleteLocationFunction",
            handler="delete_location.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(30),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_write_data(self.delete_location_fn)
        self.feedback_table.grant_read_write_data(self.delete_location_fn)
        self.photos_bucket.grant_delete(self.delete_location_fn)

        # Update location (admin only) - for editing approved locations
        self.update_location_fn = lambda_.Function(
            self,
            "UpdateLocationFunction",
            handler="update_location.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_write_data(self.update_location_fn)

        # Check pending photo submission for a location
        self.check_pending_photo_fn = lambda_.Function(
            self,
            "CheckPendingPhotoFunction",
            handler="check_pending_photo.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(5),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_data(self.check_pending_photo_fn)

        # Check for duplicate locations before submission
        self.check_duplicate_fn = lambda_.Function(
            self,
            "CheckDuplicateFunction",
            handler="check_duplicate.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_data(self.check_duplicate_fn)
        self.suggestions_table.grant_read_data(self.check_duplicate_fn)

        # Feedback functions
        self.submit_feedback_fn = lambda_.Function(
            self,
            "SubmitFeedbackFunction",
            handler="submit_feedback.handler",
            code=lambda_.Code.from_asset("../backend/functions/feedback"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_write_data(self.submit_feedback_fn)
        self.feedback_table.grant_read_write_data(self.submit_feedback_fn)

        self.report_inactive_fn = lambda_.Function(
            self,
            "ReportInactiveFunction",
            handler="report_inactive.handler",
            code=lambda_.Code.from_asset("../backend/functions/feedback"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_write_data(self.report_inactive_fn)
        self.feedback_table.grant_read_write_data(self.report_inactive_fn)

        self.get_feedback_status_fn = lambda_.Function(
            self,
            "GetFeedbackStatusFunction",
            handler="get_feedback_status.handler",
            code=lambda_.Code.from_asset("../backend/functions/feedback"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(5),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.feedback_table.grant_read_data(self.get_feedback_status_fn)

        # Toggle favorite function
        self.toggle_favorite_fn = lambda_.Function(
            self,
            "ToggleFavoriteFunction",
            handler="toggle_favorite.handler",
            code=lambda_.Code.from_asset("../backend/functions/feedback"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_data(self.toggle_favorite_fn)
        self.feedback_table.grant_read_write_data(self.toggle_favorite_fn)

        # Get favorites function
        self.get_favorites_fn = lambda_.Function(
            self,
            "GetFavoritesFunction",
            handler="get_favorites.handler",
            code=lambda_.Code.from_asset("../backend/functions/feedback"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_data(self.get_favorites_fn)
        self.feedback_table.grant_read_data(self.get_favorites_fn)

        # Address suggestions - geocoding
        self.suggest_addresses_fn = lambda_.Function(
            self,
            "SuggestAddressesFunction",
            handler="suggest_addresses.handler",
            code=lambda_.Code.from_asset("../backend/functions/locations"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),  # Geocoding may take time
            memory_size=512,  # More memory for geocoding operations
            environment=common_env,
            layers=[self.common_layer],
        )

        # Submit suggestion function
        self.submit_suggestion_fn = lambda_.Function(
            self,
            "SubmitSuggestionFunction",
            handler="submit_suggestion.handler",
            code=lambda_.Code.from_asset("../backend/functions/suggestions"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_write_data(self.submit_suggestion_fn)
        self.locations_table.grant_read_data(self.submit_suggestion_fn)

        # Get suggestions function (admin)
        self.get_suggestions_fn = lambda_.Function(
            self,
            "GetSuggestionsFunction",
            handler="get_suggestions.handler",
            code=lambda_.Code.from_asset("../backend/functions/suggestions"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_data(self.get_suggestions_fn)
        self.photos_bucket.grant_read(self.get_suggestions_fn)

        # Approve suggestion function (admin)
        self.approve_suggestion_fn = lambda_.Function(
            self,
            "ApproveSuggestionFunction",
            handler="approve_suggestion.handler",
            code=lambda_.Code.from_asset("../backend/functions/suggestions"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_write_data(self.approve_suggestion_fn)
        self.locations_table.grant_read_write_data(self.approve_suggestion_fn)
        self.users_table.grant_read_data(self.approve_suggestion_fn)
        # Grant S3 permissions to move photos from pending/ to approved/
        self.photos_bucket.grant_read_write(self.approve_suggestion_fn)
        self.photos_bucket.grant_delete(self.approve_suggestion_fn)

        # Reject suggestion function (admin)
        self.reject_suggestion_fn = lambda_.Function(
            self,
            "RejectSuggestionFunction",
            handler="reject_suggestion.handler",
            code=lambda_.Code.from_asset("../backend/functions/suggestions"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_write_data(self.reject_suggestion_fn)
        # Grant S3 permissions to delete photos from pending/
        self.photos_bucket.grant_delete(self.reject_suggestion_fn)
        self.photos_bucket.grant_read(self.reject_suggestion_fn)

        # Update suggestion function (admin) - for editing before approval
        self.update_suggestion_fn = lambda_.Function(
            self,
            "UpdateSuggestionFunction",
            handler="update_suggestion.handler",
            code=lambda_.Code.from_asset("../backend/functions/suggestions"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_write_data(self.update_suggestion_fn)

        # Photo upload URL function
        self.get_upload_url_fn = lambda_.Function(
            self,
            "GetUploadUrlFunction",
            handler="get_upload_url.handler",
            code=lambda_.Code.from_asset("../backend/functions/photos"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        # Grant S3 permissions for presigned URL generation
        self.photos_bucket.grant_put(self.get_upload_url_fn)

        # Route PDF generation function
        self.generate_route_pdf_fn = lambda_.Function(
            self,
            "GenerateRoutePdfFunction",
            handler="generate_pdf.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(30),  # PDF generation needs more time
            memory_size=512,  # More memory for PDF generation
            environment=common_env,
            layers=[self.common_layer],
        )
        # Grant S3 permissions for PDF storage and presigned URL generation
        self.photos_bucket.grant_read_write(self.generate_route_pdf_fn)

        # Route environment with users table for usernames
        routes_env = {
            **common_env,
            "USERS_TABLE_NAME": self.users_table.table_name,
        }

        # Create route function
        self.create_route_fn = lambda_.Function(
            self,
            "CreateRouteFunction",
            handler="create_route.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=routes_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_write_data(self.create_route_fn)
        self.locations_table.grant_read_data(self.create_route_fn)
        self.users_table.grant_read_data(self.create_route_fn)

        # Get routes function (list with sorting/filtering)
        self.get_routes_fn = lambda_.Function(
            self,
            "GetRoutesFunction",
            handler="get_routes.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=routes_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_data(self.get_routes_fn)
        self.locations_table.grant_read_data(self.get_routes_fn)
        self.users_table.grant_read_data(self.get_routes_fn)

        # Get route by ID function
        self.get_route_by_id_fn = lambda_.Function(
            self,
            "GetRouteByIdFunction",
            handler="get_route_by_id.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=routes_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_data(self.get_route_by_id_fn)
        self.routes_table.grant_write_data(self.get_route_by_id_fn)  # For increment_start_count analytics
        self.locations_table.grant_read_data(self.get_route_by_id_fn)
        self.users_table.grant_read_data(self.get_route_by_id_fn)
        self.route_feedback_table.grant_read_data(self.get_route_by_id_fn)

        # Update route function
        self.update_route_fn = lambda_.Function(
            self,
            "UpdateRouteFunction",
            handler="update_route.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=routes_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_write_data(self.update_route_fn)
        self.locations_table.grant_read_data(self.update_route_fn)

        # Delete route function
        self.delete_route_fn = lambda_.Function(
            self,
            "DeleteRouteFunction",
            handler="delete_route.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_write_data(self.delete_route_fn)
        self.route_feedback_table.grant_read_write_data(self.delete_route_fn)

        # Route feedback function (like/save/start toggle)
        self.route_feedback_fn = lambda_.Function(
            self,
            "RouteFeedbackFunction",
            handler="route_feedback.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_write_data(self.route_feedback_fn)
        self.route_feedback_table.grant_read_write_data(self.route_feedback_fn)

        # Get route feedback status function
        self.get_route_feedback_status_fn = lambda_.Function(
            self,
            "GetRouteFeedbackStatusFunction",
            handler="get_route_feedback_status.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(5),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.route_feedback_table.grant_read_data(self.get_route_feedback_status_fn)

        # Get user's routes function
        self.get_user_routes_fn = lambda_.Function(
            self,
            "GetUserRoutesFunction",
            handler="get_user_routes.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_data(self.get_user_routes_fn)

        # Get user's saved routes function
        self.get_user_saved_routes_fn = lambda_.Function(
            self,
            "GetUserSavedRoutesFunction",
            handler="get_user_saved_routes.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=routes_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_data(self.get_user_saved_routes_fn)
        self.route_feedback_table.grant_read_data(self.get_user_saved_routes_fn)
        self.users_table.grant_read_data(self.get_user_saved_routes_fn)

        # Routes leaderboard function (public)
        self.get_routes_leaderboard_fn = lambda_.Function(
            self,
            "GetRoutesLeaderboardFunction",
            handler="get_routes_leaderboard.handler",
            code=lambda_.Code.from_asset("../backend/functions/routes"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=routes_env,
            layers=[self.common_layer],
        )
        self.routes_table.grant_read_data(self.get_routes_leaderboard_fn)
        self.users_table.grant_read_data(self.get_routes_leaderboard_fn)

        # Photo analysis function (triggered by S3)
        self.analyze_photo_fn = lambda_.Function(
            self,
            "AnalyzePhotoFunction",
            handler="analyze_photo.handler",
            code=lambda_.Code.from_asset("../backend/functions/photos"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(60),  # Vision analysis needs time
            memory_size=512,
            environment=common_env,
            layers=[self.common_layer],
        )
        # Grant S3 read/write for fetching and compressing photos
        self.photos_bucket.grant_read_write(self.analyze_photo_fn)
        # Grant DynamoDB write for updating suggestion tags
        self.suggestions_table.grant_read_write_data(self.analyze_photo_fn)
        # Grant Bedrock invoke for Amazon Nova Pro vision
        self.analyze_photo_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=[
                    "arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0",
                    "arn:aws:bedrock:*:*:inference-profile/us.amazon.nova-pro-v1:0",
                ],
            )
        )
        # Add S3 trigger for pending/ prefix
        self.analyze_photo_fn.add_event_source(
            lambda_events.S3EventSource(
                self.photos_bucket,
                events=[s3.EventType.OBJECT_CREATED],
                filters=[s3.NotificationKeyFilter(prefix="pending/")],
            )
        )

        # Grant submit_suggestion permission to invoke analyze_photo
        self.analyze_photo_fn.grant_invoke(self.submit_suggestion_fn)
        self.submit_suggestion_fn.add_environment(
            "ANALYZE_PHOTO_FUNCTION_NAME", self.analyze_photo_fn.function_name
        )

        # User profile function
        user_env = {
            **common_env,
            "USER_POOL_ID": self.user_pool.user_pool_id,
            "USERS_TABLE_NAME": self.users_table.table_name,
        }
        self.get_user_profile_fn = lambda_.Function(
            self,
            "GetUserProfileFunction",
            handler="get_profile.handler",
            code=lambda_.Code.from_asset("../backend/functions/users"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=user_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_data(self.get_user_profile_fn)
        self.users_table.grant_read_data(self.get_user_profile_fn)
        # Grant Cognito permissions to get user details
        self.get_user_profile_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["cognito-idp:AdminGetUser"],
                resources=[self.user_pool.user_pool_arn],
            )
        )

        # User submissions function
        self.get_user_submissions_fn = lambda_.Function(
            self,
            "GetUserSubmissionsFunction",
            handler="get_submissions.handler",
            code=lambda_.Code.from_asset("../backend/functions/users"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_data(self.get_user_submissions_fn)
        self.photos_bucket.grant_read(self.get_user_submissions_fn)

        # Update user profile function
        update_profile_env = {
            **common_env,
            "USERS_TABLE_NAME": self.users_table.table_name,
        }
        self.update_user_profile_fn = lambda_.Function(
            self,
            "UpdateUserProfileFunction",
            handler="update_profile.handler",
            code=lambda_.Code.from_asset("../backend/functions/users"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=update_profile_env,
            layers=[self.common_layer],
        )
        self.users_table.grant_read_write_data(self.update_user_profile_fn)

        # Leaderboard function (public)
        leaderboard_env = {
            **common_env,
            "USER_POOL_ID": self.user_pool.user_pool_id,
            "USERS_TABLE_NAME": self.users_table.table_name,
        }
        self.get_leaderboard_fn = lambda_.Function(
            self,
            "GetLeaderboardFunction",
            handler="get_leaderboard.handler",
            code=lambda_.Code.from_asset("../backend/functions/users"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(15),
            memory_size=256,
            environment=leaderboard_env,
            layers=[self.common_layer],
        )
        self.suggestions_table.grant_read_data(self.get_leaderboard_fn)
        self.users_table.grant_read_data(self.get_leaderboard_fn)
        # Grant Cognito permissions to get user details
        self.get_leaderboard_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["cognito-idp:AdminGetUser"],
                resources=[self.user_pool.user_pool_arn],
            )
        )

        # Locations leaderboard function (public)
        self.get_locations_leaderboard_fn = lambda_.Function(
            self,
            "GetLocationsLeaderboardFunction",
            handler="get_locations_leaderboard.handler",
            code=lambda_.Code.from_asset("../backend/functions/users"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            memory_size=256,
            environment=common_env,
            layers=[self.common_layer],
        )
        self.locations_table.grant_read_data(self.get_locations_leaderboard_fn)

        # Post-authentication Lambda (Cognito trigger)
        post_auth_env = {
            "USERS_TABLE_NAME": self.users_table.table_name,
            "ENV_NAME": self.env_name,
        }
        self.post_auth_fn = lambda_.Function(
            self,
            "PostAuthenticationFunction",
            handler="post_authentication.handler",
            code=lambda_.Code.from_asset("../backend/functions/auth"),
            runtime=lambda_.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(30),  # Needs time for Bedrock API call
            memory_size=512,
            environment=post_auth_env,
            layers=[self.common_layer],
        )
        self.users_table.grant_read_write_data(self.post_auth_fn)
        # Grant Bedrock permissions for username generation
        self.post_auth_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=[
                    f"arn:aws:bedrock:{self.region}::foundation-model/us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                    f"arn:aws:bedrock:{self.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
                    f"arn:aws:bedrock:us-east-1:{self.account}:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0",
                    "arn:aws:bedrock:*::foundation-model/anthropic.claude-*",
                    f"arn:aws:bedrock:*:{self.account}:inference-profile/*",
                ],
            )
        )

        # Store functions for API Gateway integration
        self.lambda_functions = {
            "get_locations": self.get_locations_fn,
            "get_location_by_id": self.get_location_by_id_fn,
            "create_location": self.create_location_fn,
            "delete_location": self.delete_location_fn,
            "submit_feedback": self.submit_feedback_fn,
            "report_inactive": self.report_inactive_fn,
            "get_feedback_status": self.get_feedback_status_fn,
            "toggle_favorite": self.toggle_favorite_fn,
            "get_favorites": self.get_favorites_fn,
            "suggest_addresses": self.suggest_addresses_fn,
            "submit_suggestion": self.submit_suggestion_fn,
            "get_suggestions": self.get_suggestions_fn,
            "approve_suggestion": self.approve_suggestion_fn,
            "reject_suggestion": self.reject_suggestion_fn,
            "get_upload_url": self.get_upload_url_fn,
            "generate_route_pdf": self.generate_route_pdf_fn,
            "get_user_profile": self.get_user_profile_fn,
            "get_user_submissions": self.get_user_submissions_fn,
            "get_locations_leaderboard": self.get_locations_leaderboard_fn,
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
            # Development: CloudFront first (primary), then localhost for local dev
            allowed_origins = [
                f"https://{self.distribution.distribution_domain_name}",
                "http://localhost:5173",
                "http://localhost:3000",
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

        # Add CORS headers to Gateway error responses (4XX/5XX)
        # This ensures CORS headers are returned even when auth fails
        cors_headers = {
            "Access-Control-Allow-Origin": f"'{allowed_origins[0]}'",
            "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
            "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
        }

        self.api.add_gateway_response(
            "Unauthorized",
            type=apigw.ResponseType.UNAUTHORIZED,
            response_headers=cors_headers,
        )

        self.api.add_gateway_response(
            "AccessDenied",
            type=apigw.ResponseType.ACCESS_DENIED,
            response_headers=cors_headers,
        )

        self.api.add_gateway_response(
            "Default4XX",
            type=apigw.ResponseType.DEFAULT_4_XX,
            response_headers=cors_headers,
        )

        self.api.add_gateway_response(
            "Default5XX",
            type=apigw.ResponseType.DEFAULT_5_XX,
            response_headers=cors_headers,
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

        # /locations/suggest-addresses endpoint
        suggest_addresses = locations.add_resource("suggest-addresses")
        suggest_addresses.add_method(
            "POST",
            apigw.LambdaIntegration(self.suggest_addresses_fn),
        )

        # /locations/check-duplicate endpoint
        check_duplicate = locations.add_resource("check-duplicate")
        check_duplicate.add_method(
            "POST",
            apigw.LambdaIntegration(self.check_duplicate_fn),
        )

        # /locations/{id} endpoints
        location_by_id = locations.add_resource("{id}")
        location_by_id.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_location_by_id_fn),
        )
        # DELETE /locations/{id} - admin only for testing
        location_by_id.add_method(
            "DELETE",
            apigw.LambdaIntegration(self.delete_location_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        # PUT /locations/{id} - admin only for editing approved locations
        location_by_id.add_method(
            "PUT",
            apigw.LambdaIntegration(self.update_location_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /locations/{id}/feedback endpoint
        feedback = location_by_id.add_resource("feedback")
        feedback.add_method(
            "POST",
            apigw.LambdaIntegration(self.submit_feedback_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /locations/{id}/feedback/status endpoint
        feedback_status = feedback.add_resource("status")
        feedback_status.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_feedback_status_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /locations/{id}/report endpoint
        report = location_by_id.add_resource("report")
        report.add_method(
            "POST",
            apigw.LambdaIntegration(self.report_inactive_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /locations/{id}/favorite endpoint
        favorite = location_by_id.add_resource("favorite")
        favorite.add_method(
            "POST",
            apigw.LambdaIntegration(self.toggle_favorite_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /locations/{id}/pending-photo endpoint
        pending_photo = location_by_id.add_resource("pending-photo")
        pending_photo.add_method(
            "GET",
            apigw.LambdaIntegration(self.check_pending_photo_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /suggestions endpoints
        suggestions = v1.add_resource("suggestions")
        suggestions.add_method(
            "POST",
            apigw.LambdaIntegration(self.submit_suggestion_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        suggestions.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_suggestions_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /suggestions/{id} endpoints
        suggestion_by_id = suggestions.add_resource("{id}")
        # PUT /suggestions/{id} - admin only for editing before approval
        suggestion_by_id.add_method(
            "PUT",
            apigw.LambdaIntegration(self.update_suggestion_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /suggestions/{id}/approve endpoint
        approve = suggestion_by_id.add_resource("approve")
        approve.add_method(
            "POST",
            apigw.LambdaIntegration(self.approve_suggestion_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /suggestions/{id}/reject endpoint
        reject = suggestion_by_id.add_resource("reject")
        reject.add_method(
            "POST",
            apigw.LambdaIntegration(self.reject_suggestion_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /photos endpoints
        photos = v1.add_resource("photos")

        # /photos/upload-url endpoint
        upload_url = photos.add_resource("upload-url")
        upload_url.add_method(
            "POST",
            apigw.LambdaIntegration(self.get_upload_url_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /routes endpoints
        routes = v1.add_resource("routes")

        # GET /routes - list public routes (public)
        routes.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_routes_fn),
        )

        # POST /routes - create a new route (authenticated)
        routes.add_method(
            "POST",
            apigw.LambdaIntegration(self.create_route_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /routes/generate-pdf endpoint (no auth required for now)
        generate_pdf = routes.add_resource("generate-pdf")
        generate_pdf.add_method(
            "POST",
            apigw.LambdaIntegration(self.generate_route_pdf_fn),
        )

        # /routes/{id} endpoints
        route_by_id = routes.add_resource("{id}")

        # GET /routes/{id} - get route details (public)
        route_by_id.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_route_by_id_fn),
        )

        # PUT /routes/{id} - update route (authenticated, owner only)
        route_by_id.add_method(
            "PUT",
            apigw.LambdaIntegration(self.update_route_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # DELETE /routes/{id} - delete route (authenticated, owner only)
        route_by_id.add_method(
            "DELETE",
            apigw.LambdaIntegration(self.delete_route_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /routes/{id}/feedback endpoint
        route_feedback = route_by_id.add_resource("feedback")
        route_feedback.add_method(
            "POST",
            apigw.LambdaIntegration(self.route_feedback_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /routes/{id}/feedback/status endpoint
        route_feedback_status = route_feedback.add_resource("status")
        route_feedback_status.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_route_feedback_status_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /users endpoints
        users = v1.add_resource("users")

        # /users/profile endpoint (authenticated)
        profile = users.add_resource("profile")
        profile.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_user_profile_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        profile.add_method(
            "PUT",
            apigw.LambdaIntegration(self.update_user_profile_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /users/submissions endpoint (authenticated)
        submissions = users.add_resource("submissions")
        submissions.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_user_submissions_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /users/favorites endpoint (authenticated)
        favorites = users.add_resource("favorites")
        favorites.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_favorites_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /users/routes endpoint (authenticated) - get user's created routes
        user_routes = users.add_resource("routes")
        user_routes.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_user_routes_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /users/saved-routes endpoint (authenticated) - get user's saved routes
        saved_routes = users.add_resource("saved-routes")
        saved_routes.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_user_saved_routes_fn),
            authorizer=authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # /leaderboard endpoint (public)
        leaderboard = v1.add_resource("leaderboard")
        leaderboard.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_leaderboard_fn),
        )

        # /leaderboard/locations endpoint (public)
        leaderboard_locations = leaderboard.add_resource("locations")
        leaderboard_locations.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_locations_leaderboard_fn),
        )

        # /leaderboard/routes endpoint (public)
        leaderboard_routes = leaderboard.add_resource("routes")
        leaderboard_routes.add_method(
            "GET",
            apigw.LambdaIntegration(self.get_routes_leaderboard_fn),
        )

    def create_cloudfront_distribution(self):
        """Create CloudFront distribution for frontend and photos."""

        # CloudFront distribution with S3 origin using OAC
        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(
                    self.frontend_bucket,
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

        # CloudFront distribution for serving approved photos only
        # Uses origin_path to restrict access to approved/ prefix
        self.photos_distribution = cloudfront.Distribution(
            self,
            "PhotosDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(
                    self.photos_bucket,
                    origin_path="/approved",  # Only serve from approved/
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
        )

        # Update S3 CORS to include CloudFront domain (dev only)
        if self.env_name == "dev":
            cloudfront_origin = f"https://{self.distribution.distribution_domain_name}"

            # Add CORS rule with CloudFront domain to photos bucket
            cfn_photos_bucket = self.photos_bucket.node.default_child
            cfn_photos_bucket.add_property_override(
                "CorsConfiguration.CorsRules",
                [
                    {
                        "AllowedMethods": ["GET", "PUT", "POST"],
                        "AllowedOrigins": [
                            "http://localhost:5173",
                            "http://localhost:3000",
                            cloudfront_origin,
                        ],
                        "AllowedHeaders": ["Content-Type", "Content-Length"],
                        "MaxAge": 3000,
                    }
                ],
            )

    def create_outputs(self):
        """Create CloudFormation outputs."""

        CfnOutput(
            self,
            "ApiEndpoint",
            value=f"{self.api.url}v1/",
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
            "CloudFrontDistributionId",
            value=self.distribution.distribution_id,
            description="CloudFront distribution ID",
        )

        CfnOutput(
            self,
            "PhotosBucketName",
            value=self.photos_bucket.bucket_name,
            description="Photos S3 bucket name",
        )

        CfnOutput(
            self,
            "PhotosCdnUrl",
            value=f"https://{self.photos_distribution.distribution_domain_name}",
            description="Photos CloudFront distribution URL",
        )

        CfnOutput(
            self,
            "PhotosDistributionId",
            value=self.photos_distribution.distribution_id,
            description="Photos CloudFront distribution ID",
        )

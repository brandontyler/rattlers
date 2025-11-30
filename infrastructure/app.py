#!/usr/bin/env python3
"""CDK app for DFW Christmas Lights Finder."""

import os
import aws_cdk as cdk
from stacks.main_stack import ChristmasLightsStack


app = cdk.App()

# Get environment from context or use 'dev' as default
env_name = app.node.try_get_context("env") or "dev"

# AWS environment
env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-east-1"),
)

# Create stack
ChristmasLightsStack(
    app,
    f"ChristmasLightsStack-{env_name}",
    env_name=env_name,
    env=env,
    description=f"DFW Christmas Lights Finder - {env_name} environment",
)

app.synth()

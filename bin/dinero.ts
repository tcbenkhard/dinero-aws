#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { DineroStack } from '../lib/dinero-stack';

const app = new cdk.App();
new DineroStack(app, 'dinero-tst', {
    stage: 'tst',
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
new DineroStack(app, 'dinero', {
    stage: 'prd',
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

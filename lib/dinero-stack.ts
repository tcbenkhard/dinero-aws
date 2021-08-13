import * as cdk from '@aws-cdk/core';
import {DockerImage, Duration} from '@aws-cdk/core';
import * as apigw from '@aws-cdk/aws-apigateway';
import {LambdaIntegration} from '@aws-cdk/aws-apigateway';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs'
import * as dynamo from '@aws-cdk/aws-dynamodb';
import {AttributeType} from '@aws-cdk/aws-dynamodb';
import * as ssm from '@aws-cdk/aws-ssm';
import * as cm from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as alias from '@aws-cdk/aws-route53-targets';
import * as s3 from '@aws-cdk/aws-s3';
import {S3EventSource, SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as sub from '@aws-cdk/aws-sns-subscriptions';

interface DineroStackProps extends cdk.StackProps {
  stage: 'dev'|'tst'|'prd'
}

export class DineroStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: DineroStackProps) {
    super(scope, id, props);
    const serviceName = `dinero-${props?.stage}`
    const domainName = props?.stage == 'prd' ? 'dinero.benkhard.com' : `${serviceName}.benkhard.com`;

    /**
    // SNS
    */
    const imageProcessedTopic = new sns.Topic(this, `${serviceName}-image-processed-topic`, {
      topicName: `${serviceName}-image-processed-topic`
    })

    /**
    // SQS
    */
    const processImageQueue = new sqs.Queue(this, `${serviceName}-process-image-command-queue`, {
      queueName: `${serviceName}-process-image-command-queue`,
    })

    const imageProcessedQueue = new sqs.Queue(this, `${serviceName}-image-processed-queue`, {
      queueName: `${serviceName}-image-processed-queue`
    })
    imageProcessedTopic.addSubscription(new sub.SqsSubscription(imageProcessedQueue));

    //
    // S3
    //
    const imageBucket = new s3.Bucket(this,  `${serviceName}-imageBucket`, {
      bucketName: `${serviceName}-imageBucket`.toLowerCase(),
      lifecycleRules: [
        {
          prefix: 'upload/',
          enabled: true,
          expiration: Duration.days(1)
        }
      ]
    });

    //
    // DynamoDB
    //
    const mealsTable = new dynamo.Table(this, `${serviceName}-meals`, {
      tableName: `${serviceName}-meals`,
      partitionKey: {
        name: 'shortName',
        type: AttributeType.STRING
      }
    });

    //
    // ACM
    //
    const certificateArn = ssm.StringParameter.valueFromLookup(this,'/com/benkhard/wildcard-certificate');
    const certificate = cm.Certificate.fromCertificateArn(this, `${serviceName}-certificate`, certificateArn);

    //
    // Lambda
    //
    const environment = {
      PROCESS_IMAGE_COMMAND_QUEUE_URL: processImageQueue.queueUrl,
      MEALS_TABLE_NAME: mealsTable.tableName,
      IMAGE_BUCKET_NAME: imageBucket.bucketName,
      IMAGE_PROCESSED_TOPIC_ARN: imageProcessedTopic.topicArn,
    };

    const getMealsLambda = new NodejsFunction(this, `${serviceName}-get-meals-lambda`, {
      functionName: `${serviceName}-get-meals-lambda`,
      handler: 'handler',
      entry: 'src/get-meals-handler.ts',
      environment,
    });
    mealsTable.grantReadData(getMealsLambda);

    const getSignedUrlLambda = new NodejsFunction(this, `${serviceName}-get-signed-url-lambda`, {
      functionName: `${serviceName}-get-signed-url-lambda`,
      handler: 'handler',
      entry: 'src/get-signed-url-handler.ts',
      environment,
    });
    imageBucket.grantPut(getSignedUrlLambda);

    const postMealLambda = new NodejsFunction(this, `${serviceName}-post-meal-lambda`, {
      functionName: `${serviceName}-post-meal-lambda`,
      handler: 'handler',
      entry: 'src/post-meal-handler.ts',
      environment,
    });
    processImageQueue.grantSendMessages(postMealLambda);
    mealsTable.grantReadWriteData(postMealLambda);

    const processImageHandler = new NodejsFunction(this, `${serviceName}-process-image-listener`, {
      functionName: `${serviceName}-process-image-listener`,
      handler: 'handler',
      entry: 'src/process-image-listener.ts',
      bundling: {
        nodeModules: ['sharp'],
        forceDockerBundling: true,
        commandHooks: {
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return ['npm rebuild --arch=x64 --platform=linux sharp', 'echo "pwd"', 'pwd', 'echo "root ls"', 'ls -lha', 'echo "input ls"', 'ls -lha asset-input']
          }
        }
      },
      environment,
    });
    imageBucket.grantReadWrite(processImageHandler);
    imageBucket.grantDelete(processImageHandler);
    processImageHandler.addEventSource(new SqsEventSource(processImageQueue));
    imageProcessedTopic.grantPublish(processImageHandler);

    const imageProcessedListener = new NodejsFunction(this, `${serviceName}-image-processed-listener`, {
      functionName: `${serviceName}-image-processed-listener`,
      handler: 'handler',
      entry: 'src/image-processed-listener.ts',
      environment
    });
    mealsTable.grantReadWriteData(imageProcessedListener);
    imageProcessedListener.addEventSource(new SqsEventSource(imageProcessedQueue));

    //
    // API Gateway
    //
    const gateway = new apigw.RestApi(this, `${serviceName}`, {
      domainName: {
        certificate,
        domainName
      }
    });

    const meals = gateway.root.addResource('meals');
    meals.addMethod('GET', new LambdaIntegration(getMealsLambda))
    meals.addMethod('POST', new LambdaIntegration(postMealLambda))

    const upload = gateway.root.addResource('upload');
    upload.addMethod('GET', new LambdaIntegration(getSignedUrlLambda));

    //
    // Route53
    //
    const zoneId = ssm.StringParameter.valueFromLookup(this,'/com/benkhard/public-hosted-zone-id');
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, `${serviceName}-hostedZone`, {
      hostedZoneId: zoneId,
      zoneName: 'benkhard.com' // your zone name here
    });


    new route53.ARecord(this, '`${serviceName}-dnsRecord`', {
      zone,
      target: route53.RecordTarget.fromAlias(new alias.ApiGateway(gateway)),
      recordName: domainName
    });
  }
}

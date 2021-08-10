import * as cdk from '@aws-cdk/core';
import {Duration} from '@aws-cdk/core';
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
import {S3EventSource} from "@aws-cdk/aws-lambda-event-sources";

interface DineroStackProps extends cdk.StackProps {
  stage: 'dev'|'tst'|'prd'
}

export class DineroStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: DineroStackProps) {
    super(scope, id, props);
    const serviceName = `dinero-${props?.stage}`

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

    const mealsTable = new dynamo.Table(this, `${serviceName}-meals`, {
      tableName: `${serviceName}-meals`,
      partitionKey: {
        name: 'shortName',
        type: AttributeType.STRING
      }
    });

    const getMealsLambda = new NodejsFunction(this, `${serviceName}-get-meals-lambda`, {
      functionName: `${serviceName}-get-meals-lambda`,
      handler: 'handler',
      entry: 'src/get-meals-handler.ts',
      environment: {
        MEALS_TABLE_NAME: mealsTable.tableName
      },
    });

    const getSignedUrlLambda = new NodejsFunction(this, `${serviceName}-get-signed-url-lambda`, {
      functionName: `${serviceName}-get-signed-url-lambda`,
      handler: 'handler',
      entry: 'src/get-signed-url-handler.ts',
      environment: {
        IMAGE_BUCKET_NAME: imageBucket.bucketName
      },
    });
    imageBucket.grantPut(getSignedUrlLambda);

    const s3UploadHandler = new NodejsFunction(this, `${serviceName}-s3-upload-handler`, {
      functionName: `${serviceName}-s3-upload-handler`,
      handler: 'handler',
      entry: 'src/s3-upload-handler.ts',
      bundling: {
        nodeModules: ['sharp'],
        forceDockerBundling: true,

      }
    });
    imageBucket.grantReadWrite(s3UploadHandler);
    imageBucket.grantDelete(s3UploadHandler);

    s3UploadHandler.addEventSource(new S3EventSource(imageBucket, {
      events: [ s3.EventType.OBJECT_CREATED_PUT ],
      filters: [ { prefix: 'upload/' } ]
    }));

    const zoneId = ssm.StringParameter.valueFromLookup(this,'/com/benkhard/public-hosted-zone-id');
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, `${serviceName}-hostedZone`, {
      hostedZoneId: zoneId,
      zoneName: 'benkhard.com' // your zone name here
    });

    const certificateArn = ssm.StringParameter.valueFromLookup(this,'/com/benkhard/wildcard-certificate');
    const certificate = cm.Certificate.fromCertificateArn(this, `${serviceName}-certificate`, certificateArn);
    const gateway = new apigw.RestApi(this, `${serviceName}`, {
      domainName: {
        certificate,
        domainName: `${serviceName}.benkhard.com`
      }
    });

    new route53.ARecord(this, '`${serviceName}-dnsRecord`', {
      zone,
      target: route53.RecordTarget.fromAlias(new alias.ApiGateway(gateway)),
      recordName: `${serviceName}.benkhard.com`
    });

    const meals = gateway.root.addResource('meals');
    meals.addMethod('GET', new LambdaIntegration(getMealsLambda))

    const upload = gateway.root.addResource('upload');
    upload.addMethod('GET', new LambdaIntegration(getSignedUrlLambda));
  }
}

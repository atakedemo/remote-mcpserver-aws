import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class RemoteMcpServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDBテーブル（DCRクライアント情報保存用）
    const clientTable = new dynamodb.Table(this, 'McpClientTable', {
      tableName: 'mcp-clients',
      partitionKey: { name: 'clientId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 本番環境では適切なポリシーを設定
      pointInTimeRecovery: true,
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'McpLogGroup', {
      logGroupName: '/aws/lambda/mcp-handler',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda関数
    const mcpHandler = new lambda.Function(this, 'McpHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        CLIENT_TABLE_NAME: clientTable.tableName,
        JWT_SECRET: 'your-jwt-secret-key', // 本番環境ではSecrets Managerを使用
        LOG_GROUP_NAME: logGroup.logGroupName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: logGroup,
    });

    // DynamoDBアクセス権限を付与
    clientTable.grantReadWriteData(mcpHandler);

    // API Gateway
    const api = new apigateway.RestApi(this, 'McpApi', {
      restApiName: 'Remote MCP Server',
      description: 'Remote MCP Server with DCR support',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    // MCPエンドポイント
    const mcpResource = api.root.addResource('mcp');
    mcpResource.addMethod('POST', new apigateway.LambdaIntegration(mcpHandler));

    // DCRエンドポイント
    const dcrResource = api.root.addResource('dcr');
    dcrResource.addMethod('POST', new apigateway.LambdaIntegration(mcpHandler));

    // クライアント管理エンドポイント
    const clientsResource = api.root.addResource('clients');
    const clientResource = clientsResource.addResource('{clientId}');
    clientResource.addMethod('GET', new apigateway.LambdaIntegration(mcpHandler));
    clientResource.addMethod('DELETE', new apigateway.LambdaIntegration(mcpHandler));

    // CloudWatch アラーム
    new cloudwatch.Alarm(this, 'McpErrorAlarm', {
      metric: mcpHandler.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'MCP Lambda function errors',
    });

    new cloudwatch.Alarm(this, 'McpDurationAlarm', {
      metric: mcpHandler.metricDuration(),
      threshold: 25000, // 25 seconds
      evaluationPeriods: 2,
      alarmDescription: 'MCP Lambda function duration',
    });

    // 出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ClientTableName', {
      value: clientTable.tableName,
      description: 'DynamoDB Client Table Name',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group Name',
    });
  }
} 
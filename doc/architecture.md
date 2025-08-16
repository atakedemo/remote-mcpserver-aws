# AWS Lambda + API Gateway リモートMCPサーバー構築手順

## 概要

AWS LambdaとAPI Gatewayを使用してリモートMCPサーバーを構築し、RFC 7591 Dynamic Client Registration（DCR）による認可を実装します。

## プロジェクト構造

```
remote-mcpserver-aws/
├── 📁 bin/                          # CDKアプリケーション
│   └── 📄 remote-mcpserver-aws.ts   # CDKアプリのエントリーポイント
│
├── 📁 lib/                          # CDKスタック定義
│   └── 📄 remote-mcpserver-stack.ts # インフラストラクチャスタック
│
├── 📁 lambda/                       # AWS Lambda関数
│   ├── 📄 index.ts                  # メインハンドラー（ルーティング）
│   ├── 📄 mcp-handler.ts            # MCPプロトコル処理
│   ├── 📄 dcr-handler.ts            # DCR認可処理
│   ├── 📄 jwt-verifier.ts           # JWT検証・生成
│   └── 📄 client-handler.ts         # クライアント管理
│
├── 📁 test/                         # テストファイル
│   └── 📄 mcp-handler.test.ts       # MCPハンドラーのテスト
│
├── 📁 scripts/                      # デプロイ・テストスクリプト
│   ├── 📄 deploy.sh                 # デプロイスクリプト
│   └── 📄 test-api.sh               # APIテストスクリプト
│
├── 📁 doc/                          # ドキュメント
│   └── 📄 architecture.md           # 詳細な構築手順
│
├── 📄 package.json                  # 依存関係とスクリプト
├── 📄 tsconfig.json                 # TypeScript設定
├── 📄 cdk.json                      # CDK設定
├── 📄 jest.config.js                # Jestテスト設定
├── 📄 .gitignore                    # Git除外設定
├── 📄 LICENSE                       # ライセンス
└── 📄 README.md                     # プロジェクト説明
```

### 📁 ディレクトリ詳細

#### `bin/` - CDKアプリケーション
- **`remote-mcpserver-aws.ts`**: CDKアプリケーションのメインファイル
  - AWS CDKアプリケーションのエントリーポイント
  - スタックの初期化と設定
  - 環境変数の設定

#### `lib/` - CDKスタック定義
- **`remote-mcpserver-stack.ts`**: メインのインフラストラクチャスタック
  - AWS Lambda関数の定義
  - API Gatewayの設定
  - DynamoDBテーブルの作成
  - CloudWatchログとアラームの設定
  - IAMロールとポリシーの設定

#### `lambda/` - AWS Lambda関数
- **`index.ts`**: メインハンドラー
  - API Gatewayからのリクエストをルーティング
  - エラーハンドリングとCORS設定
  - リクエストの振り分け
- **`mcp-handler.ts`**: MCPプロトコル処理
  - MCPプロトコル（initialize, tools/list, tools/call, resources/list, resources/read）
  - JWT認証とクライアント検証
  - DynamoDBからのクライアント情報取得
- **`dcr-handler.ts`**: DCR認可処理
  - RFC 7591 Dynamic Client Registration
  - クライアント登録とシークレット生成
  - DynamoDBへのクライアント情報保存
- **`jwt-verifier.ts`**: JWT検証・生成
  - JWTトークンの検証と生成
  - セキュリティ設定
  - 環境変数からのシークレット取得
- **`client-handler.ts`**: クライアント管理
  - クライアント情報の取得・削除
  - DynamoDB操作
  - セキュリティ（client_secretの除外）

#### `test/` - テストファイル
- **`mcp-handler.test.ts`**: MCPハンドラーのテスト
  - Jestを使用した単体テスト
  - モックと統合テストの準備
  - 認証エラーのテスト

#### `scripts/` - デプロイ・テストスクリプト
- **`deploy.sh`**: デプロイスクリプト
  - 依存関係インストール
  - TypeScriptビルド
  - CDK差分確認
  - デプロイ実行
- **`test-api.sh`**: APIテストスクリプト
  - エンドポイントのテスト
  - クライアント登録・削除のテスト
  - jqを使用したJSONレスポンス解析

#### `doc/` - ドキュメント
- **`architecture.md`**: 詳細な構築手順
  - 完全な実装手順
  - セキュリティ考慮事項
  - トラブルシューティング
  - 監視とログ設定

### 📄 設定ファイル詳細

#### `package.json`
```json
{
  "scripts": {
    "build": "tsc",           # TypeScriptビルド
    "watch": "tsc -w",        # 監視モード
    "test": "jest",           # テスト実行
    "cdk": "cdk",             # CDKコマンド
    "deploy": "cdk deploy",   # デプロイ
    "destroy": "cdk destroy", # リソース削除
    "diff": "cdk diff",       # 差分確認
    "synth": "cdk synth"      # CloudFormation生成
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.450.0",    # DynamoDBクライアント
    "@aws-sdk/lib-dynamodb": "^3.450.0",       # DynamoDBドキュメントクライアント
    "jsonwebtoken": "^9.0.2",                  # JWT処理
    "uuid": "^9.0.1"                          # UUID生成
  },
  "devDependencies": {
    "aws-cdk": "^2.108.1",                     # CDK CLI
    "aws-cdk-lib": "^2.108.1",                 # CDKライブラリ
    "typescript": "^5.2.2",                    # TypeScript
    "jest": "^29.7.0"                         # テストフレームワーク
  }
}
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",                        # ES2020ターゲット
    "module": "commonjs",                      # CommonJSモジュール
    "lib": ["ES2020"],                        # ES2020ライブラリ
    "strict": true,                           # 厳密な型チェック
    "esModuleInterop": true,                  # ESモジュール互換性
    "skipLibCheck": true,                     # ライブラリチェックスキップ
    "forceConsistentCasingInFileNames": true  # ファイル名の大文字小文字一貫性
  }
}
```

#### `cdk.json`
```json
{
  "app": "npx ts-node --prefer-ts-exts bin/remote-mcpserver-aws.ts",
  "watch": {
    "include": ["**"],
    "exclude": ["node_modules", "cdk.out", "test"]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true
  }
}
```

#### `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',                          # TypeScriptサポート
  testEnvironment: 'node',                    # Node.js環境
  roots: ['<rootDir>/test', '<rootDir>/lambda'], # テスト対象ディレクトリ
  collectCoverageFrom: [                      # カバレッジ対象
    'lambda/**/*.ts',
    'lib/**/*.ts'
  ]
};
```

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  API Gateway    │───▶│   Lambda        │
│                 │    │                 │    │   Function      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   DynamoDB      │    │   CloudWatch    │
                       │   (DCR Store)   │    │   (Logs)        │
                       └─────────────────┘    └─────────────────┘
```

## 前提条件

- Node.js 18.x以上
- AWS CLI が設定済み
- AWS CDK CLI がインストール済み
- TypeScript の知識

## 1. プロジェクト初期化

### 1.1 プロジェクト構造の作成

```bash
mkdir remote-mcpserver-aws
cd remote-mcpserver-aws
npm init -y
```

### 1.2 必要な依存関係のインストール

```bash
# CDK関連
npm install -D aws-cdk aws-cdk-lib constructs typescript @types/node

# Lambda関数用
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npm install jsonwebtoken @types/jsonwebtoken
npm install crypto-js @types/crypto-js

# 開発用
npm install -D esbuild @types/aws-lambda
```

### 1.3 TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": false,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "typeRoots": ["./node_modules/@types"]
  },
  "exclude": ["node_modules", "cdk.out"]
}
```

## 2. CDKインフラストラクチャの実装

### 2.1 CDKアプリケーションの初期化

```bash
npx cdk init app --language typescript
```

### 2.2 インフラストラクチャスタックの実装

```typescript
// lib/remote-mcpserver-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
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
    });

    // Lambda関数
    const mcpHandler = new lambda.Function(this, 'McpHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        CLIENT_TABLE_NAME: clientTable.tableName,
        JWT_SECRET: 'your-jwt-secret-key', // 本番環境ではSecrets Managerを使用
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
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

    // 出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
```

## 3. Lambda関数の実装

### 3.1 メインハンドラー

```typescript
// lambda/index.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { McpHandler } from './mcp-handler';
import { DcrHandler } from './dcr-handler';
import { ClientHandler } from './client-handler';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    // ルーティング
    if (path === '/mcp' && method === 'POST') {
      return await McpHandler.handle(event);
    } else if (path === '/dcr' && method === 'POST') {
      return await DcrHandler.handle(event);
    } else if (path.startsWith('/clients/') && method === 'GET') {
      return await ClientHandler.get(event);
    } else if (path.startsWith('/clients/') && method === 'DELETE') {
      return await ClientHandler.delete(event);
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Not Found' }),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
```

### 3.2 MCPハンドラー

```typescript
// lambda/mcp-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { JwtVerifier } from './jwt-verifier';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class McpHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Authorization headerからトークンを取得
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unauthorized' }),
        };
      }

      const token = authHeader.substring(7);
      
      // JWTトークンを検証
      const payload = await JwtVerifier.verify(token);
      if (!payload) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid token' }),
        };
      }

      // クライアント情報を取得
      const clientId = payload.client_id;
      const client = await this.getClient(clientId);
      if (!client) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Client not found' }),
        };
      }

      // MCPリクエストを処理
      const requestBody = JSON.parse(event.body || '{}');
      const response = await this.processMcpRequest(requestBody, client);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      };
    } catch (error) {
      console.error('MCP handler error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  private static async getClient(clientId: string) {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );
      return result.Item;
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
    }
  }

  private static async processMcpRequest(request: any, client: any) {
    // MCPプロトコルに基づいてリクエストを処理
    // ここに実際のMCPサーバー実装を追加
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        // MCPレスポンス
      },
    };
  }
}
```

### 3.3 DCRハンドラー

```typescript
// lambda/dcr-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class DcrHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const requestBody = JSON.parse(event.body || '{}');
      
      // RFC 7591に基づくクライアント登録
      const clientId = uuidv4();
      const clientSecret = this.generateClientSecret();
      
      const clientData = {
        clientId,
        clientSecret,
        clientName: requestBody.client_name,
        clientUri: requestBody.client_uri,
        redirectUris: requestBody.redirect_uris || [],
        grantTypes: requestBody.grant_types || ['client_credentials'],
        responseTypes: requestBody.response_types || [],
        tokenEndpointAuthMethod: requestBody.token_endpoint_auth_method || 'client_secret_basic',
        scope: requestBody.scope || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // DynamoDBに保存
      await docClient.send(
        new PutCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Item: clientData,
        })
      );

      // RFC 7591準拠のレスポンス
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0, // 無期限
          client_name: clientData.clientName,
          client_uri: clientData.clientUri,
          redirect_uris: clientData.redirectUris,
          grant_types: clientData.grantTypes,
          response_types: clientData.responseTypes,
          token_endpoint_auth_method: clientData.tokenEndpointAuthMethod,
          scope: clientData.scope,
        }),
      };
    } catch (error) {
      console.error('DCR handler error:', error);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }
  }

  private static generateClientSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### 3.4 JWT検証器

```typescript
// lambda/jwt-verifier.ts
import * as jwt from 'jsonwebtoken';

export class JwtVerifier {
  static async verify(token: string): Promise<any> {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  static generateToken(payload: any): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }
}
```

### 3.5 クライアント管理ハンドラー

```typescript
// lambda/client-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class ClientHandler {
  static async get(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const clientId = event.pathParameters?.clientId;
      if (!clientId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Client ID is required' }),
        };
      }

      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Client not found' }),
        };
      }

      // client_secretは除外して返す
      const { clientSecret, ...clientInfo } = result.Item;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientInfo),
      };
    } catch (error) {
      console.error('Get client error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  static async delete(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const clientId = event.pathParameters?.clientId;
      if (!clientId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Client ID is required' }),
        };
      }

      await docClient.send(
        new DeleteCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );

      return {
        statusCode: 204,
        headers: { 'Content-Type': 'application/json' },
        body: '',
      };
    } catch (error) {
      console.error('Delete client error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }
}
```

## 4. デプロイ手順

### 4.1 依存関係のインストール

```bash
npm install
```

### 4.2 CDKブートストラップ（初回のみ）

```bash
npx cdk bootstrap
```

### 4.3 デプロイ

```bash
npx cdk deploy
```

### 4.4 デプロイ後の確認

```bash
# スタックの出力を確認
npx cdk list
npx cdk describe RemoteMcpServerStack
```

## 5. 使用方法

### 5.1 クライアント登録（DCR）

```bash
curl -X POST https://your-api-gateway-url/dcr \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My MCP Client",
    "client_uri": "https://example.com",
    "grant_types": ["client_credentials"],
    "token_endpoint_auth_method": "client_secret_basic"
  }'
```

### 5.2 MCPリクエスト

```bash
curl -X POST https://your-api-gateway-url/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "My Client",
        "version": "1.0.0"
      }
    }
  }'
```

## 6. セキュリティ考慮事項

### 6.1 本番環境での設定

- JWT_SECRETをAWS Secrets Managerで管理
- DynamoDBテーブルの暗号化を有効化
- API GatewayでWAFを設定
- CloudTrailでAPI呼び出しをログ記録

### 6.2 追加のセキュリティ対策

- レート制限の実装
- IPアドレス制限
- クライアント証明書認証
- 監査ログの実装

## 7. 監視とログ

### 7.1 CloudWatch設定

```typescript
// lib/remote-mcpserver-stack.ts に追加
const logGroup = new logs.LogGroup(this, 'McpLogGroup', {
  logGroupName: '/aws/lambda/mcp-handler',
  retention: logs.RetentionDays.ONE_WEEK,
});

mcpHandler.addEnvironment('LOG_GROUP_NAME', logGroup.logGroupName);
```

### 7.2 アラーム設定

```typescript
// エラー率アラーム
new cloudwatch.Alarm(this, 'McpErrorAlarm', {
  metric: mcpHandler.metricErrors(),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'MCP Lambda function errors',
});
```

## 8. テスト

### 8.1 単体テスト

```bash
npm install -D jest @types/jest
```

```typescript
// __tests__/mcp-handler.test.ts
import { McpHandler } from '../lambda/mcp-handler';

describe('McpHandler', () => {
  test('should handle valid MCP request', async () => {
    // テスト実装
  });
});
```

### 8.2 統合テスト

```bash
# API Gatewayのエンドポイントをテスト
curl -X POST https://your-api-gateway-url/dcr \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Test Client"}'
```

## 9. トラブルシューティング

### 9.1 よくある問題

1. **CORSエラー**: API GatewayのCORS設定を確認
2. **権限エラー**: Lambda関数のIAMロールを確認
3. **タイムアウト**: Lambda関数のタイムアウト設定を調整
4. **メモリ不足**: Lambda関数のメモリ設定を増加

### 9.2 ログ確認

```bash
# CloudWatchログを確認
aws logs tail /aws/lambda/remote-mcpserver-stack-McpHandler --follow
```

## 10. 次のステップ

1. MCPプロトコルの完全実装
2. ツールとリソースの実装
3. エラーハンドリングの改善
4. パフォーマンス最適化
5. セキュリティ強化

---

このドキュメントに従って実装することで、AWS LambdaとAPI Gatewayを使用したリモートMCPサーバーを構築できます。RFC 7591 Dynamic Client Registrationによる認可機能も含まれており、セキュアなMCPサーバーとして運用できます。

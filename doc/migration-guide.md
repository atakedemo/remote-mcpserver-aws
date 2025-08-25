# CDKからAmplify Gen2への移行ガイド

このドキュメントでは、既存のCDKベースのMCPサーバーからAWS Amplify Gen2ベースの構成への移行手順を説明します。

## 🎯 移行の目的

### 主な変更点

1. **インフラストラクチャ管理**: CDK → Amplify Gen2
2. **認証システム**: 手動実装 → Amplify Auth
3. **データベース**: 手動DynamoDB → Amplify Data
4. **フロントエンド**: なし → Next.js + Tailwind CSS
5. **エンドユーザー認証**: なし → 完全実装

## 📋 移行前の準備

### 1. 現在の環境のバックアップ

```bash
# 現在のプロジェクトをバックアップ
cp -r remote-mcpserver-aws remote-mcpserver-aws-cdk-backup

# 重要な設定を保存
cp package.json package.json.backup
cp tsconfig.json tsconfig.json.backup
```

### 2. 依存関係の確認

```bash
# 現在の依存関係を確認
npm list --depth=0
```

## 🔄 移行手順

### ステップ1: 新しいプロジェクト構造の作成

```bash
# 新しいディレクトリ構造を作成
mkdir -p amplify/{auth,data,storage,function/mcp-server}
mkdir -p app
```

### ステップ2: package.jsonの更新

```json
{
  "name": "remote-mcpserver-aws",
  "version": "2.0.0",
  "description": "AWS Amplify Gen2 based Remote MCP Server with User Authentication",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "amplify": "amplify",
    "deploy": "amplify push",
    "destroy": "amplify delete",
    "diff": "amplify status",
    "synth": "amplify sandbox"
  },
  "dependencies": {
    "@aws-amplify/backend": "^0.10.0",
    "@aws-amplify/amplify-api-next-alpha": "^0.10.0",
    "@aws-amplify/amplify-auth-next-alpha": "^0.10.0",
    "@aws-amplify/amplify-storage-next-alpha": "^0.10.0",
    "crypto-js": "^4.2.0",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1"
  }
}
```

### ステップ3: Amplify Gen2設定ファイルの作成

#### amplify/backend.ts
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { mcpServerFunction } from './function/mcp-server/resource';

export const backend = defineBackend({
  auth,
  data,
  storage,
  mcpServerFunction,
});
```

#### amplify/auth/resource.ts
```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true,
    phone: false,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    username: {
      required: true,
      mutable: true,
    },
  },
  passwordFormat: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialCharacters: true,
  },
});
```

#### amplify/data/resource.ts
```typescript
import { type ClientSchema, a } from '@aws-amplify/amplify-api-next-alpha';

const schema: ClientSchema = a.schema({
  User: a.model({
    username: a.string().required(),
    email: a.string().required(),
    passwordHash: a.string().required(),
    salt: a.string().required(),
    status: a.string().required(),
    lastLoginAt: a.string(),
    failedLoginAttempts: a.integer(),
    lockedUntil: a.string(),
    createdAt: a.string().required(),
    updatedAt: a.string().required(),
  }).authorization([a.allow.owner()]),

  McpClient: a.model({
    clientId: a.string().required(),
    clientSecret: a.string().required(),
    clientName: a.string(),
    clientUri: a.string(),
    redirectUris: a.list(a.string()),
    grantTypes: a.list(a.string()),
    responseTypes: a.list(a.string()),
    tokenEndpointAuthMethod: a.string(),
    scope: a.string(),
    createdAt: a.string().required(),
    updatedAt: a.string().required(),
  }).authorization([a.allow.owner()]),

  AuthorizationCode: a.model({
    code: a.string().required(),
    clientId: a.string().required(),
    redirectUri: a.string().required(),
    userId: a.string(),
    codeChallenge: a.string(),
    codeChallengeMethod: a.string(),
    state: a.string(),
    scope: a.string(),
    expiresAt: a.integer().required(),
  }).authorization([a.allow.owner()]),

  RefreshToken: a.model({
    refreshToken: a.string().required(),
    clientId: a.string().required(),
    userId: a.string().required(),
    scope: a.string(),
    expiresAt: a.integer().required(),
  }).authorization([a.allow.owner()]),
});

export const data = a.data({
  schema,
});
```

### ステップ4: Lambda関数の移行

#### 既存のlambda/ディレクトリから移行

```bash
# Lambda関数を新しい場所にコピー
cp -r lambda/* amplify/function/mcp-server/
```

#### ハンドラーの更新

既存のLambda関数をAmplify Gen2用に更新：

```typescript
// amplify/function/mcp-server/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { McpHandler } from './mcp-handler';
import { DcrHandler } from './dcr-handler';
import { ClientHandler } from './client-handler';
import { TokenHandler } from './token-handler';
import { OAuth21Handler } from './oauth21-handler';

const client = generateClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // 既存のルーティングロジックを維持
  // Amplify Gen2のクライアントを使用
};
```

### ステップ5: フロントエンドの追加

#### Next.jsアプリの作成

```bash
# Next.jsアプリの作成
npx create-next-app@latest app --typescript --tailwind --app --src-dir --import-alias "@/*"
```

#### 認証UIの実装

```typescript
// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';

export default function Home() {
  // 認証UIの実装
  // ユーザー登録・ログイン機能
  // MCPサーバー状態の表示
}
```

### ステップ6: データ移行

#### 既存データの移行

```bash
# 既存のDynamoDBテーブルからデータをエクスポート
aws dynamodb scan --table-name mcp-clients --output json > clients-backup.json

# 新しいAmplify Dataテーブルにデータを移行
# 手動でデータを移行するスクリプトを作成
```

#### 移行スクリプトの作成

```typescript
// scripts/migrate-data.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { generateClient } from 'aws-amplify/api';

async function migrateData() {
  // 既存データの読み込み
  // 新しいテーブルへの移行
}
```

## 🔧 設定の更新

### 環境変数の移行

#### 既存の環境変数
```bash
# CDK環境変数
CLIENT_TABLE_NAME=mcp-clients
JWT_SECRET=your-secret
LOG_GROUP_NAME=/aws/lambda/mcp-handler
```

#### 新しい環境変数
```bash
# Amplify Gen2環境変数
NEXT_PUBLIC_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_USER_POOL_CLIENT_ID=your-client-id
NEXT_PUBLIC_GRAPHQL_ENDPOINT=your-graphql-endpoint
NEXT_PUBLIC_AWS_REGION=us-east-1
JWT_SECRET=your-jwt-secret
```

### API Gateway設定の移行

#### 既存のCDK設定
```typescript
// lib/remote-mcpserver-stack.ts
const api = new apigateway.RestApi(this, 'McpApi', {
  restApiName: 'MCP Server API',
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
  },
});
```

#### 新しいAmplify Gen2設定
```typescript
// amplify/function/mcp-server/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const mcpServerFunction = defineFunction({
  name: 'mcp-server',
  entry: './handler.ts',
  runtime: 'nodejs18.x',
  timeout: 30,
  memorySize: 512,
});
```

## 🚀 デプロイ手順

### 1. 新しい依存関係のインストール

```bash
npm install
```

### 2. Amplify Gen2の初期化

```bash
npx amplify init --yes
```

### 3. バックエンドのデプロイ

```bash
npx amplify push --yes
```

### 4. フロントエンドのデプロイ

```bash
npm run build
npx amplify hosting push
```

## 🔍 移行後の検証

### 1. 機能テスト

```bash
# 認証機能のテスト
curl -X POST https://your-new-endpoint/auth/signup

# MCP機能のテスト
curl -X POST https://your-new-endpoint/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

### 2. データ整合性の確認

```bash
# 既存データが正しく移行されているか確認
aws dynamodb scan --table-name new-mcp-clients
```

### 3. パフォーマンステスト

```bash
# レスポンス時間の測定
time curl -X POST https://your-new-endpoint/mcp
```

## 🛠️ トラブルシューティング

### よくある問題

1. **認証エラー**
   - Amplify Auth設定の確認
   - ユーザープールの設定確認

2. **データアクセスエラー**
   - Amplify Data権限の確認
   - スキーマ定義の確認

3. **API Gatewayエラー**
   - Lambda関数の権限確認
   - CORS設定の確認

### ロールバック手順

```bash
# 移行前のバックアップから復元
cp -r remote-mcpserver-aws-cdk-backup/* .
npm install
npx cdk deploy
```

## 📊 移行のメリット

### 開発効率の向上

- **自動化**: インフラ設定の自動化
- **統合**: 認証・データベース・ストレージの統合
- **開発体験**: ローカル開発環境の改善

### セキュリティの向上

- **標準化**: OAuth 2.1準拠の認証
- **管理**: ユーザー管理の簡素化
- **監査**: 統合されたログと監査

### スケーラビリティの向上

- **自動スケーリング**: Amplify Gen2の自動スケーリング
- **グローバル展開**: エッジロケーションの活用
- **コスト最適化**: 使用量ベースの課金

## 📚 参考資料

- [AWS Amplify Gen2 Documentation](https://docs.amplify.aws/)
- [Amplify Auth Documentation](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [Amplify Data Documentation](https://docs.amplify.aws/lib/graphqlapi/getting-started/q/platform/js/)
- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-09)

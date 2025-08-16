# Remote MCP Server AWS

AWS LambdaとAPI Gatewayを使用したリモートMCPサーバーです。RFC 7591 Dynamic Client Registration（DCR）による認可機能を実装しています。

## 機能

- **MCPプロトコル対応**: Model Context Protocol（MCP）に準拠したサーバー
- **DCR認可**: RFC 7591 Dynamic Client Registrationによるクライアント管理
- **JWT認証**: セキュアなトークンベース認証
- **スケーラブル**: AWS Lambdaによる自動スケーリング
- **監視**: CloudWatchによるログとメトリクス

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
└── 📄 README.md                     # このファイル
```

### 📁 ディレクトリ詳細

#### `bin/` - CDKアプリケーション
- **`remote-mcpserver-aws.ts`**: CDKアプリケーションのメインファイル
- AWS CDKアプリケーションのエントリーポイント
- スタックの初期化と設定

#### `lib/` - CDKスタック定義
- **`remote-mcpserver-stack.ts`**: メインのインフラストラクチャスタック
- AWS Lambda、API Gateway、DynamoDB、CloudWatchの定義
- セキュリティ設定とIAMロールの設定

#### `lambda/` - AWS Lambda関数
- **`index.ts`**: メインハンドラー
  - API Gatewayからのリクエストをルーティング
  - エラーハンドリングとCORS設定
- **`mcp-handler.ts`**: MCPプロトコル処理
  - MCPプロトコル（initialize, tools/list, tools/call, resources/list, resources/read）
  - JWT認証とクライアント検証
- **`dcr-handler.ts`**: DCR認可処理
  - RFC 7591 Dynamic Client Registration
  - クライアント登録とシークレット生成
- **`jwt-verifier.ts`**: JWT検証・生成
  - JWTトークンの検証と生成
  - セキュリティ設定
- **`client-handler.ts`**: クライアント管理
  - クライアント情報の取得・削除
  - DynamoDB操作

#### `test/` - テストファイル
- **`mcp-handler.test.ts`**: MCPハンドラーのテスト
- Jestを使用した単体テスト
- モックと統合テストの準備

#### `scripts/` - デプロイ・テストスクリプト
- **`deploy.sh`**: デプロイスクリプト
  - 依存関係インストール
  - TypeScriptビルド
  - CDKデプロイ
- **`test-api.sh`**: APIテストスクリプト
  - エンドポイントのテスト
  - クライアント登録・削除のテスト

#### `doc/` - ドキュメント
- **`architecture.md`**: 詳細な構築手順
  - 完全な実装手順
  - セキュリティ考慮事項
  - トラブルシューティング

### 📄 設定ファイル

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
  }
}
```

#### `tsconfig.json`
- TypeScriptコンパイラ設定
- ES2020ターゲット
- 厳密な型チェック
- ソースマップ生成

#### `cdk.json`
- CDKアプリケーション設定
- ウォッチモード設定
- コンテキスト設定

#### `jest.config.js`
- Jestテスト設定
- TypeScriptサポート
- カバレッジ設定

## 前提条件

- Node.js 18.x以上
- AWS CLI が設定済み
- AWS CDK CLI がインストール済み
- TypeScript の知識

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. CDKブートストラップ（初回のみ）

```bash
npx cdk bootstrap
```

### 3. デプロイ

```bash
npx cdk deploy
```

### 4. デプロイ後の確認

```bash
# スタックの出力を確認
npx cdk list
npx cdk describe RemoteMcpServerStack
```

## 使用方法

### 1. クライアント登録（DCR）

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

### 2. MCPリクエスト

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

### 3. クライアント情報取得

```bash
curl -X GET https://your-api-gateway-url/clients/YOUR_CLIENT_ID
```

### 4. クライアント削除

```bash
curl -X DELETE https://your-api-gateway-url/clients/YOUR_CLIENT_ID
```

## Claude DesktopとCursorへのMCP登録方法

### Claude Desktopへの登録

#### 1. クライアント登録

まず、DCRエンドポイントを使用してクライアントを登録します：

```bash
curl -X POST https://your-api-gateway-url/dcr \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Claude Desktop MCP Client",
    "client_uri": "https://claude.ai",
    "grant_types": ["client_credentials"],
    "token_endpoint_auth_method": "client_secret_basic"
  }'
```

#### 2. Claude Desktop設定ファイルの作成

Claude Desktopの設定ディレクトリにMCP設定ファイルを作成します：

**macOS:**
```bash
mkdir -p ~/Library/Application\ Support/Claude/claude_desktop_config.toml
```

**Windows:**
```bash
mkdir -p %APPDATA%\Claude\claude_desktop_config.toml
```

**Linux:**
```bash
mkdir -p ~/.config/Claude/claude_desktop_config.toml
```

#### 3. 設定ファイルの内容

```toml
[mcpServers.remote-mcp-server]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-cli", "https://your-api-gateway-url/mcp"]
env = { JWT_TOKEN = "YOUR_JWT_TOKEN" }

[mcpServers.remote-mcp-server.auth]
type = "bearer"
token = "YOUR_JWT_TOKEN"
```

#### 4. Claude Desktopの再起動

設定を反映するためにClaude Desktopを再起動します。

### Cursorへの登録

#### 1. クライアント登録

```bash
curl -X POST https://your-api-gateway-url/dcr \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Cursor MCP Client",
    "client_uri": "https://cursor.sh",
    "grant_types": ["client_credentials"],
    "token_endpoint_auth_method": "client_secret_basic"
  }'
```

#### 2. Cursor設定ファイルの作成

Cursorの設定ディレクトリにMCP設定ファイルを作成します：

**macOS:**
```bash
mkdir -p ~/Library/Application\ Support/Cursor/User/globalStorage/mcp
```

**Windows:**
```bash
mkdir -p %APPDATA%\Cursor\User\globalStorage\mcp
```

**Linux:**
```bash
mkdir -p ~/.config/Cursor/User/globalStorage/mcp
```

#### 3. 設定ファイルの内容

`mcp-servers.json`ファイルを作成：

```json
{
  "mcpServers": {
    "remote-mcp-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-cli", "https://your-api-gateway-url/mcp"],
      "env": {
        "JWT_TOKEN": "YOUR_JWT_TOKEN"
      }
    }
  }
}
```

#### 4. Cursorの再起動

設定を反映するためにCursorを再起動します。

### JWTトークンの生成

MCPクライアントで使用するJWTトークンを生成するには、以下のエンドポイントを実装する必要があります：

#### 1. トークンエンドポイントの追加

`lambda/token-handler.ts`を作成：

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { JwtVerifier } from './jwt-verifier';
import * as crypto from 'crypto';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class TokenHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unauthorized' }),
        };
      }

      // Basic認証のデコード
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
      const [clientId, clientSecret] = credentials.split(':');

      // クライアント認証
      const client = await this.authenticateClient(clientId, clientSecret);
      if (!client) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid credentials' }),
        };
      }

      // JWTトークンを生成
      const token = JwtVerifier.generateToken({
        client_id: clientId,
        scope: client.scope || '',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1時間
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: token,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: client.scope || '',
        }),
      };
    } catch (error) {
      console.error('Token handler error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  private static async authenticateClient(clientId: string, clientSecret: string) {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );

      if (!result.Item || result.Item.clientSecret !== clientSecret) {
        return null;
      }

      return result.Item;
    } catch (error) {
      console.error('Error authenticating client:', error);
      return null;
    }
  }
}
```

#### 2. ルーティングの追加

`lambda/index.ts`にトークンエンドポイントを追加：

```typescript
// 既存のimportに追加
import { TokenHandler } from './token-handler';

// ルーティング部分に追加
} else if (path === '/token' && method === 'POST') {
  return await TokenHandler.handle(event);
```

#### 3. CDKスタックの更新

`lib/remote-mcpserver-stack.ts`にトークンエンドポイントを追加：

```typescript
// トークンエンドポイント
const tokenResource = api.root.addResource('token');
tokenResource.addMethod('POST', new apigateway.LambdaIntegration(mcpHandler));
```

### 設定例

#### Claude Desktop設定例

```toml
[mcpServers.aws-remote-mcp]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-cli", "https://abc123.execute-api.us-east-1.amazonaws.com/prod/mcp"]
env = { JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }

[mcpServers.aws-remote-mcp.auth]
type = "bearer"
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Cursor設定例

```json
{
  "mcpServers": {
    "aws-remote-mcp": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-cli", "https://abc123.execute-api.us-east-1.amazonaws.com/prod/mcp"],
      "env": {
        "JWT_TOKEN": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

### トラブルシューティング

#### よくある問題

1. **認証エラー**: JWTトークンが正しく設定されているか確認
2. **接続エラー**: API Gateway URLが正しいか確認
3. **CORSエラー**: API GatewayのCORS設定を確認
4. **設定反映されない**: アプリケーションの再起動が必要

#### ログ確認

```bash
# CloudWatchログを確認
aws logs tail /aws/lambda/remote-mcpserver-stack-McpHandler --follow
```

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/dcr` | クライアント登録（RFC 7591） |
| POST | `/mcp` | MCPプロトコルリクエスト |
| POST | `/token` | OAuth2.0トークンエンドポイント |
| GET | `/clients/{clientId}` | クライアント情報取得 |
| DELETE | `/clients/{clientId}` | クライアント削除 |

## 開発

### テスト実行

```bash
npm test
```

### ローカル開発

```bash
npm run build
npm run watch
```

### CDK差分確認

```bash
npx cdk diff
```

### デプロイスクリプト使用

```bash
./scripts/deploy.sh
```

### APIテスト

```bash
./scripts/test-api.sh
```

## セキュリティ

### 本番環境での設定

- JWT_SECRETをAWS Secrets Managerで管理
- DynamoDBテーブルの暗号化を有効化
- API GatewayでWAFを設定
- CloudTrailでAPI呼び出しをログ記録

### 追加のセキュリティ対策

- レート制限の実装
- IPアドレス制限
- クライアント証明書認証
- 監査ログの実装

## 監視

### CloudWatchログ確認

```bash
aws logs tail /aws/lambda/remote-mcpserver-stack-McpHandler --follow
```

### アラーム

- Lambda関数エラー率
- Lambda関数実行時間
- API Gatewayエラー率

## トラブルシューティング

### よくある問題

1. **CORSエラー**: API GatewayのCORS設定を確認
2. **権限エラー**: Lambda関数のIAMロールを確認
3. **タイムアウト**: Lambda関数のタイムアウト設定を調整
4. **メモリ不足**: Lambda関数のメモリ設定を増加

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

# Remote MCP Server with AWS Amplify Gen2

AWS Amplify Gen2を使用したリモートMCP（Model Context Protocol）サーバーです。エンドユーザー認証機能を備えたOAuth 2.1準拠の認証システムを提供します。

## 🌟 主な機能

- **OAuth 2.1準拠認証**: Authorization Code Grant、Client Credentials Grant、Refresh Token Grantをサポート
- **エンドユーザー認証**: ユーザー登録・ログイン機能
- **RFC 7591 Dynamic Client Registration (DCR)**: 動的クライアント登録
- **MCP Protocol**: Model Context Protocolの完全実装
- **PKCE**: Proof Key for Code Exchange対応
- **セキュアなJWT**: トークンベース認証
- **モダンなWeb UI**: Next.js + Tailwind CSS

## 🏗️ アーキテクチャ

### AWS Amplify Gen2構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Amplify Auth   │    │  Amplify Data   │
│   (Frontend)    │◄──►│   (Cognito)     │◄──►│   (DynamoDB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  API Gateway    │    │   Lambda        │    │   CloudWatch    │
│  (REST API)     │◄──►│   (MCP Server)  │◄──►│   (Logs)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### データモデル

- **User**: ユーザー情報とパスワード管理
- **Session**: セッション管理
- **McpClient**: MCPクライアント情報
- **AuthorizationCode**: OAuth認証コード
- **RefreshToken**: リフレッシュトークン

## 🚀 セットアップ

### 前提条件

- Node.js 18以上
- AWS CLI設定済み
- Amplify CLIインストール済み

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd remote-mcpserver-aws
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Amplify Gen2の初期化

```bash
npx amplify init --yes
```

### 4. バックエンドのデプロイ

```bash
npx amplify push --yes
```

### 5. フロントエンドの起動

```bash
npm run dev
```

## 📋 使用方法

### 1. ユーザー認証

1. ブラウザでアプリケーションにアクセス
2. ユーザー登録またはログイン
3. 認証成功後、MCPサーバーが利用可能

### 2. MCPクライアントの設定

#### Claude Desktop設定例

```json
{
  "mcpServers": {
    "remote-mcp": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Authorization: Bearer YOUR_JWT_TOKEN",
        "-H", "Content-Type: application/json",
        "-d", "@-",
        "https://your-api-gateway-url/mcp"
      ],
      "env": {}
    }
  }
}
```

#### Cursor設定例

```json
{
  "mcpServers": {
    "remote-mcp": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Authorization: Bearer YOUR_JWT_TOKEN",
        "-H", "Content-Type: application/json",
        "-d", "@-",
        "https://your-api-gateway-url/mcp"
      ]
    }
  }
}
```

### 3. クライアント登録

```bash
# DCRを使用したクライアント登録
curl -X POST https://your-api-gateway-url/dcr \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "My MCP Client",
    "client_uri": "https://example.com",
    "redirect_uris": ["https://example.com/callback"],
    "grant_types": ["authorization_code", "client_credentials"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "client_secret_basic",
    "scope": "mcp"
  }'
```

### 4. トークン取得

```bash
# Client Credentials Grant
curl -X POST https://your-api-gateway-url/token \
  -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```

## 🔧 API エンドポイント

| エンドポイント | メソッド | 説明 | 認証 |
|---------------|---------|------|------|
| `/` | GET | 認証Web UI | - |
| `/mcp` | POST | MCP Protocol | Bearer Token |
| `/dcr` | POST | Dynamic Client Registration | - |
| `/token` | POST | OAuth Token Endpoint | Basic Auth |
| `/oauth/authorize` | GET | OAuth Authorization | User Auth |
| `/oauth/token` | POST | OAuth Token | Basic Auth |
| `/oauth/userinfo` | GET | User Info | Bearer Token |
| `/clients/{clientId}` | GET | Client Info | - |
| `/clients/{clientId}` | DELETE | Client Deletion | - |

## 🔐 セキュリティ機能

- **OAuth 2.1準拠**: 最新のセキュリティ標準
- **PKCE**: Proof Key for Code Exchange
- **JWT**: セキュアなトークン管理
- **HTTPS**: 全通信暗号化
- **CORS**: クロスオリジン制御
- **レート制限**: API保護
- **パスワードセキュリティ**: ハッシュ化・ソルト

## 🧪 テスト

```bash
# ユニットテスト
npm test

# E2Eテスト
npm run test:e2e

# APIテスト
./scripts/test-api.sh
```

## 📊 監視とログ

- **CloudWatch Logs**: Lambda関数のログ
- **CloudWatch Metrics**: API Gateway メトリクス
- **X-Ray**: 分散トレーシング
- **CloudWatch Alarms**: エラー監視

## 🔄 デプロイ

### 自動デプロイ

```bash
./scripts/deploy-amplify.sh
```

### 手動デプロイ

```bash
# バックエンド
npx amplify push

# フロントエンド
npm run build
npx amplify hosting push
```

## 🛠️ 開発

### ローカル開発

```bash
# 開発サーバー起動
npm run dev

# バックエンドサンドボックス
npx amplify sandbox
```

### 環境変数

```bash
# .env.local
NEXT_PUBLIC_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_USER_POOL_CLIENT_ID=your-client-id
NEXT_PUBLIC_GRAPHQL_ENDPOINT=your-graphql-endpoint
NEXT_PUBLIC_AWS_REGION=us-east-1
JWT_SECRET=your-jwt-secret
```

## 📚 ドキュメント

- [アーキテクチャ詳細](doc/architecture.md)
- [ユーザー認証実装](doc/user-authentication.md)
- [シーケンス図](doc/sequence-diagrams.md)
- [API仕様](doc/api-specification.md)

## 🤝 コントリビューション

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🆘 サポート

- [Issues](https://github.com/your-repo/issues)
- [Discussions](https://github.com/your-repo/discussions)
- [Documentation](https://your-docs-url.com)

## 🔄 更新履歴

### v2.0.0 (2024-01-XX)
- AWS Amplify Gen2への移行
- エンドユーザー認証機能追加
- OAuth 2.1完全対応
- Next.jsフロントエンド追加

### v1.0.0 (2024-01-XX)
- 初回リリース
- CDKベースの実装
- 基本的なMCP機能

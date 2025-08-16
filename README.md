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

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/dcr` | クライアント登録（RFC 7591） |
| POST | `/mcp` | MCPプロトコルリクエスト |
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

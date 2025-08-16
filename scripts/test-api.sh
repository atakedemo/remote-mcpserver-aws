#!/bin/bash

# Remote MCP Server API テストスクリプト

set -e

# API Gateway URLを設定（デプロイ後に更新）
API_URL="https://your-api-gateway-url"

echo "🧪 Remote MCP Server API テストを開始します..."
echo "API URL: $API_URL"
echo ""

# 1. クライアント登録テスト
echo "📝 1. クライアント登録テスト"
echo "----------------------------------------"
CLIENT_RESPONSE=$(curl -s -X POST "$API_URL/dcr" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test MCP Client",
    "client_uri": "https://example.com",
    "grant_types": ["client_credentials"],
    "token_endpoint_auth_method": "client_secret_basic"
  }')

echo "レスポンス:"
echo "$CLIENT_RESPONSE" | jq '.'

# クライアントIDとシークレットを抽出
CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.client_id')
CLIENT_SECRET=$(echo "$CLIENT_RESPONSE" | jq -r '.client_secret')

echo ""
echo "クライアントID: $CLIENT_ID"
echo "クライアントシークレット: $CLIENT_SECRET"
echo ""

# 2. クライアント情報取得テスト
echo "📋 2. クライアント情報取得テスト"
echo "----------------------------------------"
curl -s -X GET "$API_URL/clients/$CLIENT_ID" | jq '.'
echo ""

# 3. MCP初期化テスト（JWTトークンが必要）
echo "🔐 3. MCP初期化テスト"
echo "----------------------------------------"
echo "注意: このテストには有効なJWTトークンが必要です"
echo "JWTトークンを生成するには、OAuth2.0トークンエンドポイントを実装する必要があります"
echo ""

# 4. クライアント削除テスト
echo "🗑️  4. クライアント削除テスト"
echo "----------------------------------------"
curl -s -X DELETE "$API_URL/clients/$CLIENT_ID"
echo "クライアントが削除されました"
echo ""

echo "✅ テストが完了しました！"
echo ""
echo "📚 詳細な使用方法は README.md を参照してください" 
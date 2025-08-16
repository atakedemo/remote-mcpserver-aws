#!/bin/bash

# MCP登録テストスクリプト

set -e

# API Gateway URLを設定（デプロイ後に更新）
API_URL="https://your-api-gateway-url"

echo "🧪 MCP登録テストを開始します..."
echo "API URL: $API_URL"
echo ""

# 1. クライアント登録
echo "📝 1. クライアント登録"
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

# 2. JWTトークン取得
echo "🔐 2. JWTトークン取得"
echo "----------------------------------------"
# Basic認証のヘッダーを作成
BASIC_AUTH=$(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)

TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic $BASIC_AUTH" \
  -d "grant_type=client_credentials")

echo "トークンレスポンス:"
echo "$TOKEN_RESPONSE" | jq '.'

# JWTトークンを抽出
JWT_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

echo ""
echo "JWTトークン: $JWT_TOKEN"
echo ""

# 3. MCP初期化テスト
echo "🚀 3. MCP初期化テスト"
echo "----------------------------------------"
MCP_RESPONSE=$(curl -s -X POST "$API_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "Test MCP Client",
        "version": "1.0.0"
      }
    }
  }')

echo "MCP初期化レスポンス:"
echo "$MCP_RESPONSE" | jq '.'
echo ""

# 4. Claude Desktop設定例の生成
echo "📋 4. Claude Desktop設定例"
echo "----------------------------------------"
cat << EOF
# Claude Desktop設定例 (claude_desktop_config.toml)

[mcpServers.aws-remote-mcp]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-cli", "$API_URL/mcp"]
env = { JWT_TOKEN = "$JWT_TOKEN" }

[mcpServers.aws-remote-mcp.auth]
type = "bearer"
token = "$JWT_TOKEN"
EOF
echo ""

# 5. Cursor設定例の生成
echo "📋 5. Cursor設定例"
echo "----------------------------------------"
cat << EOF
# Cursor設定例 (mcp-servers.json)

{
  "mcpServers": {
    "aws-remote-mcp": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-cli", "$API_URL/mcp"],
      "env": {
        "JWT_TOKEN": "$JWT_TOKEN"
      }
    }
  }
}
EOF
echo ""

# 6. クリーンアップ
echo "🗑️  6. クリーンアップ"
echo "----------------------------------------"
curl -s -X DELETE "$API_URL/clients/$CLIENT_ID"
echo "クライアントが削除されました"
echo ""

echo "✅ MCP登録テストが完了しました！"
echo ""
echo "📚 次のステップ:"
echo "1. 上記の設定例をClaude DesktopまたはCursorに適用"
echo "2. アプリケーションを再起動"
echo "3. MCPサーバーが正常に接続されているか確認"
echo ""
echo "📖 詳細な使用方法は README.md を参照してください" 
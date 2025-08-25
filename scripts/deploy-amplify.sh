#!/bin/bash

# Amplify Gen2 MCP Server デプロイスクリプト

set -e

echo "🚀 Starting Amplify Gen2 MCP Server deployment..."

# 依存関係のインストール
echo "📦 Installing dependencies..."
npm install

# Amplify Gen2の初期化
echo "🔧 Initializing Amplify Gen2..."
npx amplify init --yes

# バックエンドのデプロイ
echo "🏗️ Deploying backend..."
npx amplify push --yes

# フロントエンドのビルド
echo "🏠 Building frontend..."
npm run build

# フロントエンドのデプロイ
echo "🚀 Deploying frontend..."
npx amplify hosting push

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your MCP clients with the provided endpoints"
echo "2. Test the authentication flow"
echo "3. Set up your environment variables"
echo ""
echo "🌐 Your application is now live!"

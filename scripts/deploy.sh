#!/bin/bash

# Remote MCP Server AWS デプロイスクリプト

set -e

echo "🚀 Remote MCP Server AWS デプロイを開始します..."

# 依存関係のインストール
echo "📦 依存関係をインストールしています..."
npm install

# TypeScriptのビルド
echo "🔨 TypeScriptをビルドしています..."
npm run build

# CDK差分確認
echo "🔍 CDK差分を確認しています..."
npx cdk diff

# デプロイ確認
read -p "デプロイを続行しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 デプロイを開始します..."
    npx cdk deploy --require-approval never
    
    echo "✅ デプロイが完了しました！"
    echo ""
    echo "📋 次のステップ:"
    echo "1. API Gateway URLを確認: npx cdk describe RemoteMcpServerStack"
    echo "2. クライアント登録をテスト"
    echo "3. MCPリクエストをテスト"
    echo ""
    echo "📚 詳細な使用方法は README.md を参照してください"
else
    echo "❌ デプロイをキャンセルしました"
    exit 1
fi 
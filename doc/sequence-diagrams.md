# シーケンス図

このドキュメントでは、AWS LambdaとAPI Gatewayを使用したリモートMCPサーバーの各種フローのシーケンス図を示します。

## 目次

1. [DCR (Dynamic Client Registration) フロー](#dcr-dynamic-client-registration-フロー)
2. [OAuth 2.1 Authorization Code Grant フロー](#oauth-21-authorization-code-grant-フロー)
3. [OAuth 2.1 Client Credentials Grant フロー](#oauth-21-client-credentials-grant-フロー)
4. [MCPプロトコル通信フロー](#mcpプロトコル通信フロー)
5. [Refresh Token Grant フロー](#refresh-token-grant-フロー)

---

## DCR (Dynamic Client Registration) フロー

RFC 7591に基づくクライアント登録フローです。

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Client->>API: POST /dcr
    Note over Client,API: Content-Type: application/json
    Note over Client,API: {<br/>  "client_name": "My MCP Client",<br/>  "client_uri": "https://example.com",<br/>  "grant_types": ["client_credentials"],<br/>  "token_endpoint_auth_method": "client_secret_basic"<br/>}

    API->>Lambda: Invoke DCR Handler
    Lambda->>DDB: Generate client_id & client_secret
    Lambda->>DDB: Save client information
    DDB-->>Lambda: Success
    Lambda-->>API: 201 Created
    API-->>Client: {<br/>  "client_id": "uuid",<br/>  "client_secret": "random",<br/>  "client_id_issued_at": timestamp,<br/>  "client_secret_expires_at": 0,<br/>  "client_name": "My MCP Client",<br/>  "client_uri": "https://example.com",<br/>  "grant_types": ["client_credentials"],<br/>  "token_endpoint_auth_method": "client_secret_basic"<br/>}
```

---

## OAuth 2.1 Authorization Code Grant フロー

PKCEを使用したOAuth 2.1準拠のAuthorization Code Grantフローです。

```mermaid
sequenceDiagram
    participant User as End User
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Note over User,Client: Step 1: Authorization Request
    Client->>User: Redirect to authorization URL
    User->>API: GET /oauth/authorize
    Note over User,API: ?response_type=code<br/>&client_id=xxx<br/>&redirect_uri=xxx<br/>&state=xxx<br/>&code_challenge=xxx<br/>&code_challenge_method=S256

    API->>Lambda: Invoke OAuth 2.1 Handler
    Lambda->>DDB: Validate client_id
    DDB-->>Lambda: Client info
    Lambda->>DDB: Generate & save authorization code
    DDB-->>Lambda: Success
    Lambda-->>API: 302 Redirect
    API-->>User: Redirect to redirect_uri
    User-->>Client: ?code=xxx&state=xxx

    Note over User,Client: Step 2: Token Exchange
    Client->>API: POST /oauth/token
    Note over Client,API: grant_type=authorization_code<br/>&code=xxx<br/>&redirect_uri=xxx<br/>&client_id=xxx<br/>&client_secret=xxx<br/>&code_verifier=xxx

    API->>Lambda: Invoke Token Handler
    Lambda->>DDB: Validate authorization code
    DDB-->>Lambda: Code info
    Lambda->>Lambda: Verify PKCE (code_verifier)
    Lambda->>DDB: Validate client credentials
    DDB-->>Lambda: Client info
    Lambda->>Lambda: Generate access_token & refresh_token
    Lambda->>DDB: Save refresh_token
    Lambda->>DDB: Delete authorization code
    DDB-->>Lambda: Success
    Lambda-->>API: 200 OK
    API-->>Client: {<br/>  "access_token": "jwt",<br/>  "token_type": "Bearer",<br/>  "expires_in": 3600,<br/>  "refresh_token": "random",<br/>  "scope": "mcp"<br/>}
```

---

## OAuth 2.1 Client Credentials Grant フロー

MCPサーバーで主に使用されるClient Credentials Grantフローです。

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Client->>API: POST /oauth/token
    Note over Client,API: Authorization: Basic base64(client_id:client_secret)<br/>Content-Type: application/x-www-form-urlencoded<br/>grant_type=client_credentials

    API->>Lambda: Invoke Token Handler
    Lambda->>Lambda: Decode Basic Auth
    Lambda->>DDB: Validate client credentials
    DDB-->>Lambda: Client info
    Lambda->>Lambda: Generate access_token
    Lambda-->>API: 200 OK
    API-->>Client: {<br/>  "access_token": "jwt",<br/>  "token_type": "Bearer",<br/>  "expires_in": 3600,<br/>  "scope": "mcp"<br/>}
```

---

## MCPプロトコル通信フロー

JWTトークンを使用したMCPプロトコル通信フローです。

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Note over Client,API: Step 1: MCP Initialize
    Client->>API: POST /mcp
    Note over Client,API: Authorization: Bearer {access_token}<br/>Content-Type: application/json<br/>{<br/>  "jsonrpc": "2.0",<br/>  "id": 1,<br/>  "method": "initialize",<br/>  "params": {<br/>    "protocolVersion": "2024-11-05",<br/>    "capabilities": {},<br/>    "clientInfo": {<br/>      "name": "My Client",<br/>      "version": "1.0.0"<br/>    }<br/>  }<br/>}

    API->>Lambda: Invoke MCP Handler
    Lambda->>Lambda: Verify JWT token
    Lambda->>DDB: Get client information
    DDB-->>Lambda: Client info
    Lambda->>Lambda: Process MCP request
    Lambda-->>API: 200 OK
    API-->>Client: {<br/>  "jsonrpc": "2.0",<br/>  "id": 1,<br/>  "result": {<br/>    "protocolVersion": "2024-11-05",<br/>    "capabilities": {<br/>      "tools": {},<br/>      "resources": {}<br/>    },<br/>    "serverInfo": {<br/>      "name": "Remote MCP Server",<br/>      "version": "1.0.0"<br/>    }<br/>  }<br/>}

    Note over Client,API: Step 2: MCP Tools List
    Client->>API: POST /mcp
    Note over Client,API: Authorization: Bearer {access_token}<br/>{<br/>  "jsonrpc": "2.0",<br/>  "id": 2,<br/>  "method": "tools/list"<br/>}

    API->>Lambda: Invoke MCP Handler
    Lambda->>Lambda: Verify JWT token
    Lambda->>Lambda: Process tools/list request
    Lambda-->>API: 200 OK
    API-->>Client: {<br/>  "jsonrpc": "2.0",<br/>  "id": 2,<br/>  "result": {<br/>    "tools": []<br/>  }<br/>}

    Note over Client,API: Step 3: MCP Tools Call
    Client->>API: POST /mcp
    Note over Client,API: Authorization: Bearer {access_token}<br/>{<br/>  "jsonrpc": "2.0",<br/>  "id": 3,<br/>  "method": "tools/call",<br/>  "params": {<br/>    "name": "example_tool",<br/>    "arguments": {}<br/>  }<br/>}

    API->>Lambda: Invoke MCP Handler
    Lambda->>Lambda: Verify JWT token
    Lambda->>Lambda: Process tools/call request
    Lambda-->>API: 200 OK
    API-->>Client: {<br/>  "jsonrpc": "2.0",<br/>  "id": 3,<br/>  "result": {<br/>    "content": [<br/>      {<br/>        "type": "text",<br/>        "text": "Tool call result"<br/>      }<br/>    ]<br/>  }<br/>}
```

---

## Refresh Token Grant フロー

Access Tokenの更新フローです。

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Client->>API: POST /oauth/token
    Note over Client,API: grant_type=refresh_token<br/>&refresh_token=xxx<br/>&client_id=xxx<br/>&client_secret=xxx

    API->>Lambda: Invoke Token Handler
    Lambda->>DDB: Validate refresh_token
    DDB-->>Lambda: Refresh token info
    Lambda->>DDB: Validate client credentials
    DDB-->>Lambda: Client info
    Lambda->>Lambda: Check refresh token expiration
    Lambda->>Lambda: Generate new access_token
    Lambda-->>API: 200 OK
    API-->>Client: {<br/>  "access_token": "new_jwt",<br/>  "token_type": "Bearer",<br/>  "expires_in": 3600,<br/>  "scope": "mcp"<br/>}
```

---

## エラーハンドリングフロー

認証エラーやバリデーションエラーの処理フローです。

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Note over Client,API: Case 1: Invalid JWT Token
    Client->>API: POST /mcp
    Note over Client,API: Authorization: Bearer invalid_token

    API->>Lambda: Invoke MCP Handler
    Lambda->>Lambda: Verify JWT token (fails)
    Lambda-->>API: 401 Unauthorized
    API-->>Client: {<br/>  "error": "Invalid token"<br/>}

    Note over Client,API: Case 2: Expired Authorization Code
    Client->>API: POST /oauth/token
    Note over Client,API: grant_type=authorization_code<br/>&code=expired_code

    API->>Lambda: Invoke Token Handler
    Lambda->>DDB: Get authorization code
    DDB-->>Lambda: Code info (expired)
    Lambda->>Lambda: Check expiration (fails)
    Lambda-->>API: 400 Bad Request
    API-->>Client: {<br/>  "error": "invalid_grant",<br/>  "error_description": "Authorization code expired"<br/>}

    Note over Client,API: Case 3: Invalid PKCE
    Client->>API: POST /oauth/token
    Note over Client,API: grant_type=authorization_code<br/>&code_verifier=invalid

    API->>Lambda: Invoke Token Handler
    Lambda->>Lambda: Verify PKCE (fails)
    Lambda-->>API: 400 Bad Request
    API-->>Client: {<br/>  "error": "invalid_grant",<br/>  "error_description": "Invalid code_verifier"<br/>}
```

---

## セキュリティフロー

セキュリティ関連の処理フローです。

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB
    participant CloudWatch as CloudWatch

    Note over Client,API: Step 1: Rate Limiting
    Client->>API: Multiple requests
    API->>API: Check rate limits
    API-->>Client: 429 Too Many Requests (if exceeded)

    Note over Client,API: Step 2: Logging & Monitoring
    Client->>API: Valid request
    API->>Lambda: Process request
    Lambda->>CloudWatch: Log request details
    Lambda->>DDB: Database operation
    Lambda->>CloudWatch: Log response details
    Lambda-->>API: Response
    API-->>Client: Success response

    Note over Client,API: Step 3: Error Monitoring
    Client->>API: Invalid request
    API->>Lambda: Process request
    Lambda->>Lambda: Error occurs
    Lambda->>CloudWatch: Log error with stack trace
    Lambda-->>API: 500 Internal Server Error
    API-->>Client: Error response
    CloudWatch->>CloudWatch: Trigger alarm (if configured)
```

---

## 完全な統合フロー

DCRからMCP通信までの完全な統合フローです。

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Note over Client,API: Phase 1: Client Registration
    Client->>API: POST /dcr
    API->>Lambda: DCR Handler
    Lambda->>DDB: Save client
    Lambda-->>API: Client credentials
    API-->>Client: client_id & client_secret

    Note over Client,API: Phase 2: Token Acquisition
    Client->>API: POST /oauth/token
    Note over Client,API: Basic Auth: client_id:client_secret<br/>grant_type=client_credentials
    API->>Lambda: Token Handler
    Lambda->>DDB: Validate client
    Lambda->>Lambda: Generate JWT
    Lambda-->>API: Access token
    API-->>Client: Bearer token

    Note over Client,API: Phase 3: MCP Communication
    Client->>API: POST /mcp
    Note over Client,API: Authorization: Bearer token<br/>MCP initialize request
    API->>Lambda: MCP Handler
    Lambda->>Lambda: Verify JWT
    Lambda->>DDB: Get client info
    Lambda->>Lambda: Process MCP
    Lambda-->>API: MCP response
    API-->>Client: MCP result

    Note over Client,API: Phase 4: Ongoing Communication
    loop MCP Protocol
        Client->>API: POST /mcp
        Note over Client,API: tools/list, tools/call, resources/list, etc.
        API->>Lambda: MCP Handler
        Lambda->>Lambda: Verify & process
        Lambda-->>API: MCP response
        API-->>Client: MCP result
    end

    Note over Client,API: Phase 5: Token Refresh (if needed)
    Client->>API: POST /oauth/token
    Note over Client,API: grant_type=refresh_token
    API->>Lambda: Token Handler
    Lambda->>DDB: Validate refresh token
    Lambda->>Lambda: Generate new access token
    Lambda-->>API: New access token
    API-->>Client: New Bearer token
```

---

## 技術仕様

### エンドポイント一覧

| エンドポイント | メソッド | 説明 | OAuth 2.1準拠 |
|---------------|---------|------|---------------|
| `/dcr` | POST | Dynamic Client Registration | ✅ |
| `/oauth/authorize` | GET | Authorization Endpoint | ✅ |
| `/oauth/token` | POST | Token Endpoint | ✅ |
| `/oauth/userinfo` | GET | UserInfo Endpoint | ✅ |
| `/mcp` | POST | MCP Protocol Endpoint | ✅ |
| `/clients/{clientId}` | GET | Client Information | ✅ |
| `/clients/{clientId}` | DELETE | Client Deletion | ✅ |

### サポートするGrant Types

| Grant Type | 説明 | 実装状況 |
|------------|------|----------|
| `authorization_code` | Authorization Code Grant with PKCE | ✅ |
| `client_credentials` | Client Credentials Grant | ✅ |
| `refresh_token` | Refresh Token Grant | ✅ |

### セキュリティ機能

| 機能 | 説明 | 実装状況 |
|------|------|----------|
| PKCE | Proof Key for Code Exchange | ✅ |
| State Parameter | CSRF攻撃対策 | ✅ |
| JWT Tokens | セキュアなトークン | ✅ |
| HTTPS | 必須通信暗号化 | ✅ |
| Rate Limiting | レート制限 | 🔄 |
| CORS | クロスオリジン制御 | ✅ |

### データベーステーブル

| テーブル名 | 用途 | 主キー |
|-----------|------|--------|
| `mcp-clients` | クライアント情報 | `clientId` |
| `mcp-auth-codes` | Authorization Code | `code` |
| `mcp-refresh-tokens` | Refresh Token | `refreshToken` |

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. 認証エラー (401 Unauthorized)
```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function

    Client->>API: Request with invalid token
    API->>Lambda: Process request
    Lambda->>Lambda: Token verification fails
    Lambda-->>API: 401 Unauthorized
    API-->>Client: { "error": "Unauthorized" }
    
    Note over Client: 解決方法:
    Note over Client: 1. トークンの有効期限を確認
    Note over Client: 2. 正しいclient_idとclient_secretを使用
    Note over Client: 3. 新しいトークンを取得
```

#### 2. PKCE検証エラー (400 Bad Request)
```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function

    Client->>API: Authorization code with invalid code_verifier
    API->>Lambda: Process token request
    Lambda->>Lambda: PKCE verification fails
    Lambda-->>API: 400 Bad Request
    API-->>Client: { "error": "invalid_grant" }
    
    Note over Client: 解決方法:
    Note over Client: 1. code_verifierが正しく生成されているか確認
    Note over Client: 2. code_challenge_methodがS256であることを確認
    Note over Client: 3. 新しいauthorization codeを取得
```

#### 3. データベースエラー (500 Internal Server Error)
```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant API as API Gateway
    participant Lambda as Lambda Function
    participant DDB as DynamoDB

    Client->>API: Request
    API->>Lambda: Process request
    Lambda->>DDB: Database operation
    DDB-->>Lambda: Error (e.g., connection timeout)
    Lambda->>Lambda: Error handling
    Lambda-->>API: 500 Internal Server Error
    API-->>Client: { "error": "Internal Server Error" }
    
    Note over Client: 解決方法:
    Note over Client: 1. CloudWatchログを確認
    Note over Client: 2. DynamoDBの状態を確認
    Note over Client: 3. IAM権限を確認
```

---

## 監視とログ

### CloudWatchメトリクス

```mermaid
graph TD
    A[API Gateway] --> B[CloudWatch Metrics]
    C[Lambda Function] --> B
    D[DynamoDB] --> B
    
    B --> E[Request Count]
    B --> F[Error Rate]
    B --> G[Latency]
    B --> H[Throttle Count]
    
    E --> I[Alarm: High Request Rate]
    F --> J[Alarm: High Error Rate]
    G --> K[Alarm: High Latency]
    H --> L[Alarm: Throttling]
```

### ログ構造

#### API Gateway アクセスログ
```
{
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "request-id",
  "ip": "192.168.1.1",
  "userAgent": "MCP-Client/1.0",
  "requestTime": 100,
  "status": 200,
  "method": "POST",
  "path": "/mcp",
  "protocol": "HTTPS/1.1"
}
```

#### Lambda 実行ログ
```
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO",
  "requestId": "request-id",
  "functionName": "mcp-handler",
  "message": "Processing MCP request",
  "clientId": "client-id",
  "method": "initialize"
}
```

#### エラーログ
```
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "ERROR",
  "requestId": "request-id",
  "functionName": "mcp-handler",
  "error": "Invalid JWT token",
  "stackTrace": "...",
  "clientId": "client-id"
}
```

---

## パフォーマンス考慮事項

### レイテンシー最適化

```mermaid
graph LR
    A[Client Request] --> B[API Gateway]
    B --> C[Lambda Cold Start]
    C --> D[Database Query]
    D --> E[Response]
    
    F[Warm Lambda] --> G[Fast Response]
    
    B --> F
    F --> D
    D --> E
```

### スケーラビリティ

```mermaid
graph TD
    A[High Load] --> B[Auto Scaling]
    B --> C[Multiple Lambda Instances]
    C --> D[DynamoDB Auto Scaling]
    D --> E[Consistent Performance]
    
    F[CloudWatch Alarms] --> G[Auto Scaling Triggers]
    G --> B
```

---

このドキュメントは、AWS LambdaとAPI Gatewayを使用したリモートMCPサーバーの完全なシーケンス図と技術仕様を提供します。各フローはOAuth 2.1準拠で実装されており、セキュリティとパフォーマンスを考慮した設計となっています。 
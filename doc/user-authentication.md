# エンドユーザー認証機能の実装案

## 概要

現在のMCPサーバーにはエンドユーザーによる認証（ID/PWの入力など）が含まれていません。このドキュメントでは、エンドユーザー認証機能を追加する場合の実装案を示します。

## 現在の実装状況

### ❌ 不足している機能

1. **ユーザー認証画面**
   - ログインフォーム
   - ユーザー登録画面
   - パスワードリセット

2. **ユーザー管理**
   - ユーザー情報の保存
   - パスワードハッシュ化
   - セッション管理

3. **認証フロー**
   - エンドユーザーの認証処理
   - 認証後のリダイレクト

## 実装案

### 1. ユーザー管理テーブルの追加

```typescript
// DynamoDB テーブル: mcp-users
{
  userId: string,           // 主キー
  username: string,         // ユーザー名
  email: string,           // メールアドレス
  passwordHash: string,    // ハッシュ化されたパスワード
  salt: string,           // パスワードソルト
  status: string,         // active, inactive, pending
  createdAt: string,      // ISO 8601
  updatedAt: string,      // ISO 8601
  lastLoginAt: string,    // ISO 8601
  failedLoginAttempts: number, // ログイン失敗回数
  lockedUntil: string     // アカウントロック期限
}
```

### 2. 認証エンドポイントの追加

```typescript
// lambda/auth-handler.ts
export class AuthHandler {
  // ログイン画面表示
  static async showLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const queryParams = event.queryStringParameters || {};
    const clientId = queryParams.client_id;
    const redirectUri = queryParams.redirect_uri;
    const state = queryParams.state;
    
    // ログイン画面のHTMLを返す
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: this.generateLoginHtml(clientId, redirectUri, state)
    };
  }

  // ログイン処理
  static async login(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const body = new URLSearchParams(event.body || '');
    const username = body.get('username');
    const password = body.get('password');
    const clientId = body.get('client_id');
    const redirectUri = body.get('redirect_uri');
    const state = body.get('state');

    // ユーザー認証
    const user = await this.authenticateUser(username, password);
    if (!user) {
      return this.showLoginWithError('Invalid credentials');
    }

    // 認証成功 - Authorization Code生成
    const authCode = this.generateAuthorizationCode();
    await this.saveAuthorizationCode({
      code: authCode,
      clientId,
      redirectUri,
      userId: user.userId,
      state,
      expiresAt: Math.floor(Date.now() / 1000) + 600
    });

    // リダイレクト
    const redirectUrl = `${redirectUri}?code=${authCode}&state=${state}`;
    return {
      statusCode: 302,
      headers: { 'Location': redirectUrl },
      body: ''
    };
  }

  // ユーザー登録
  static async register(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const body = JSON.parse(event.body || '{}');
    const { username, email, password } = body;

    // バリデーション
    if (!username || !email || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // ユーザー作成
    const userId = uuidv4();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await this.hashPassword(password, salt);

    await this.saveUser({
      userId,
      username,
      email,
      passwordHash,
      salt,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedLoginAttempts: 0
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'User created successfully' })
    };
  }

  private static async authenticateUser(username: string, password: string) {
    // ユーザー検索
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    // アカウントロックチェック
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return null;
    }

    // パスワード検証
    const isValid = await this.verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      // ログイン失敗回数を増加
      await this.incrementFailedLoginAttempts(user.userId);
      return null;
    }

    // ログイン成功 - 失敗回数をリセット
    await this.resetFailedLoginAttempts(user.userId);
    await this.updateLastLogin(user.userId);

    return user;
  }

  private static async hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString('hex'));
      });
    });
  }

  private static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const computedHash = await this.hashPassword(password, salt);
    return computedHash === hash;
  }

  private static generateLoginHtml(clientId: string, redirectUri: string, state: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>MCP Server Login</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .login-form { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 5px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input[type="text"], input[type="password"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #005a87; }
        .error { color: red; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="login-form">
        <h2>MCP Server Login</h2>
        <form method="POST" action="/auth/login">
            <input type="hidden" name="client_id" value="${clientId}">
            <input type="hidden" name="redirect_uri" value="${redirectUri}">
            <input type="hidden" name="state" value="${state}">
            
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit">Login</button>
        </form>
        
        <p><a href="/auth/register">Create new account</a></p>
    </div>
</body>
</html>`;
  }
}
```

### 3. OAuth 2.1 Authorization Endpointの修正

```typescript
// lambda/oauth21-handler.ts の handleAuthorization メソッドを修正

private static async handleAuthorization(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const queryParams = event.queryStringParameters || {};
  
  // 必須パラメータの検証
  const requiredParams = ['response_type', 'client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method'];
  for (const param of requiredParams) {
    if (!queryParams[param]) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'invalid_request',
          error_description: `Missing required parameter: ${param}` 
        }),
      };
    }
  }

  // クライアント検証
  const client = await this.getClient(queryParams.client_id);
  if (!client) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'unauthorized_client',
        error_description: 'Invalid client_id' 
      }),
    };
  }

  // redirect_uri検証
  if (!client.redirectUris.includes(queryParams.redirect_uri)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri' 
      }),
    };
  }

  // セッション確認（Cookieから）
  const sessionToken = this.getSessionToken(event);
  if (!sessionToken) {
    // 未認証 - ログイン画面にリダイレクト
    const loginUrl = `/auth/login?client_id=${queryParams.client_id}&redirect_uri=${encodeURIComponent(queryParams.redirect_uri)}&state=${queryParams.state}&code_challenge=${queryParams.code_challenge}&code_challenge_method=${queryParams.code_challenge_method}`;
    return {
      statusCode: 302,
      headers: { 'Location': loginUrl },
      body: '',
    };
  }

  // セッション検証
  const session = await this.validateSession(sessionToken);
  if (!session) {
    // 無効なセッション - ログイン画面にリダイレクト
    const loginUrl = `/auth/login?client_id=${queryParams.client_id}&redirect_uri=${encodeURIComponent(queryParams.redirect_uri)}&state=${queryParams.state}&code_challenge=${queryParams.code_challenge}&code_challenge_method=${queryParams.code_challenge_method}`;
    return {
      statusCode: 302,
      headers: { 'Location': loginUrl },
      body: '',
    };
  }

  // 認証済み - Authorization Code生成
  const authCode = this.generateAuthorizationCode();
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10分

  await this.saveAuthorizationCode({
    code: authCode,
    clientId: queryParams.client_id,
    redirectUri: queryParams.redirect_uri,
    userId: session.userId, // ユーザーIDを追加
    codeChallenge: queryParams.code_challenge,
    codeChallengeMethod: queryParams.code_challenge_method,
    state: queryParams.state,
    scope: queryParams.scope || '',
    expiresAt,
  });

  // リダイレクト
  const redirectUrl = `${queryParams.redirect_uri}?code=${authCode}&state=${queryParams.state}`;
  return {
    statusCode: 302,
    headers: { 'Location': redirectUrl },
    body: '',
  };
}
```

### 4. セッション管理の追加

```typescript
// lambda/session-handler.ts
export class SessionHandler {
  static async createSession(userId: string): Promise<string> {
    const sessionId = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1時間

    await this.saveSession({
      sessionId,
      userId,
      expiresAt,
      createdAt: new Date().toISOString()
    });

    return sessionId;
  }

  static async validateSession(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    if (session.expiresAt < Math.floor(Date.now() / 1000)) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  static async deleteSession(sessionId: string) {
    await this.removeSession(sessionId);
  }
}
```

### 5. CDKスタックの更新

```typescript
// lib/remote-mcpserver-stack.ts に追加

// ユーザーテーブル
const userTable = new dynamodb.Table(this, 'McpUserTable', {
  tableName: 'mcp-users',
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  pointInTimeRecovery: true,
});

// セッションテーブル
const sessionTable = new dynamodb.Table(this, 'McpSessionTable', {
  tableName: 'mcp-sessions',
  partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  pointInTimeRecovery: true,
});

// Lambda関数に権限を追加
mcpHandler.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:UpdateItem'],
  resources: [userTable.tableArn, sessionTable.tableArn],
}));

// 環境変数を追加
mcpHandler.addEnvironment('USER_TABLE_NAME', userTable.tableName);
mcpHandler.addEnvironment('SESSION_TABLE_NAME', sessionTable.tableName);
```

### 6. ルーティングの更新

```typescript
// lambda/index.ts に追加

// 認証関連のルーティング
if (path === '/auth/login' && method === 'GET') {
  return await AuthHandler.showLogin(event);
} else if (path === '/auth/login' && method === 'POST') {
  return await AuthHandler.login(event);
} else if (path === '/auth/register' && method === 'POST') {
  return await AuthHandler.register(event);
} else if (path === '/auth/logout' && method === 'POST') {
  return await AuthHandler.logout(event);
}
```

## セキュリティ考慮事項

### 1. パスワードセキュリティ
- PBKDF2を使用したパスワードハッシュ化
- ソルトの使用
- 十分な反復回数（10000回）

### 2. セッションセキュリティ
- セッショントークンのランダム生成
- 適切な有効期限設定
- セッション固定攻撃対策

### 3. アカウントロック
- ログイン失敗回数の制限
- 一時的なアカウントロック
- ブルートフォース攻撃対策

### 4. HTTPS必須
- すべての通信をHTTPSで暗号化
- Secure Cookieの使用

## 実装手順

1. **データベーステーブルの作成**
   - ユーザーテーブル
   - セッションテーブル

2. **認証ハンドラーの実装**
   - ログイン処理
   - ユーザー登録
   - セッション管理

3. **OAuth 2.1 Authorization Endpointの修正**
   - ユーザー認証の統合
   - セッション確認

4. **フロントエンドの実装**
   - ログイン画面
   - ユーザー登録画面

5. **セキュリティテスト**
   - パスワードセキュリティ
   - セッション管理
   - アカウントロック

## 注意事項

- この実装により、MCPサーバーは完全なOAuth 2.1 Authorization Serverになります
- エンドユーザーの認証が必要になるため、MCPクライアント（Claude Desktop、Cursor等）の設定も変更が必要です
- 本格的な運用では、より堅牢なセキュリティ対策が必要です 
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { JwtVerifier } from './jwt-verifier';
import * as crypto from 'crypto';

export class OAuth21Handler {
  static async handle(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    try {
      const path = event.path;
      const method = event.httpMethod;

      if (path === '/oauth/authorize' && method === 'GET') {
        return await this.handleAuthorization(event, client);
      } else if (path === '/oauth/token' && method === 'POST') {
        return await this.handleToken(event, client);
      } else if (path === '/oauth/userinfo' && method === 'GET') {
        return await this.handleUserInfo(event, client);
      }

      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Not Found' }),
      };
    } catch (error) {
      console.error('OAuth 2.1 handler error:', error);
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  // Authorization Endpoint (OAuth 2.1)
  private static async handleAuthorization(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    const queryParams = event.queryStringParameters || {};
    
    // OAuth 2.1必須パラメータの検証
    const requiredParams = ['response_type', 'client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method'];
    for (const param of requiredParams) {
      if (!queryParams[param]) {
        return {
          statusCode: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            error: 'invalid_request',
            error_description: `Missing required parameter: ${param}` 
          }),
        };
      }
    }

    // PKCE検証
    if (queryParams.code_challenge_method !== 'S256') {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_request',
          error_description: 'code_challenge_method must be S256' 
        }),
      };
    }

    // クライアント検証
    const clientData = await this.getClient(queryParams.client_id, client);
    if (!clientData) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'unauthorized_client',
          error_description: 'Invalid client_id' 
        }),
      };
    }

    // redirect_uri検証
    if (!clientData.redirectUris.includes(queryParams.redirect_uri)) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_request',
          error_description: 'Invalid redirect_uri' 
        }),
      };
    }

    // ユーザー認証確認
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        // 未認証 - ログイン画面にリダイレクト
        const loginUrl = `/auth/login?client_id=${queryParams.client_id}&redirect_uri=${encodeURIComponent(queryParams.redirect_uri)}&state=${queryParams.state}&code_challenge=${queryParams.code_challenge}&code_challenge_method=${queryParams.code_challenge_method}`;
        return {
          statusCode: 302,
          headers: { 'Location': loginUrl },
          body: '',
        };
      }

      // Authorization Code生成
      const authCode = this.generateAuthorizationCode();
      const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10分

      // Authorization Code保存
      await this.saveAuthorizationCode({
        code: authCode,
        clientId: queryParams.client_id,
        redirectUri: queryParams.redirect_uri,
        userId: currentUser.userId,
        codeChallenge: queryParams.code_challenge,
        codeChallengeMethod: queryParams.code_challenge_method,
        state: queryParams.state,
        scope: queryParams.scope || '',
        expiresAt,
      }, client);

      // リダイレクト
      const redirectUrl = `${queryParams.redirect_uri}?code=${authCode}&state=${queryParams.state}`;
      return {
        statusCode: 302,
        headers: { 'Location': redirectUrl },
        body: '',
      };
    } catch (error) {
      // 認証エラー - ログイン画面にリダイレクト
      const loginUrl = `/auth/login?client_id=${queryParams.client_id}&redirect_uri=${encodeURIComponent(queryParams.redirect_uri)}&state=${queryParams.state}&code_challenge=${queryParams.code_challenge}&code_challenge_method=${queryParams.code_challenge_method}`;
      return {
        statusCode: 302,
        headers: { 'Location': loginUrl },
        body: '',
      };
    }
  }

  // Token Endpoint (OAuth 2.1)
  private static async handleToken(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    const body = event.body || '';
    const params = new URLSearchParams(body);
    
    const grantType = params.get('grant_type');
    
    if (grantType === 'authorization_code') {
      return await this.handleAuthorizationCodeGrant(params, client);
    } else if (grantType === 'client_credentials') {
      return await this.handleClientCredentialsGrant(event, client);
    } else if (grantType === 'refresh_token') {
      return await this.handleRefreshTokenGrant(params, client);
    }

    return {
      statusCode: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'unsupported_grant_type',
        error_description: 'Unsupported grant type' 
      }),
    };
  }

  // Authorization Code Grant (OAuth 2.1)
  private static async handleAuthorizationCodeGrant(params: URLSearchParams, client: any): Promise<APIGatewayProxyResult> {
    const code = params.get('code');
    const redirectUri = params.get('redirect_uri');
    const codeVerifier = params.get('code_verifier');
    const clientId = params.get('client_id');
    const clientSecret = params.get('client_secret');

    if (!code || !redirectUri || !codeVerifier || !clientId || !clientSecret) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_request',
          error_description: 'Missing required parameters' 
        }),
      };
    }

    // Authorization Code検証
    const authCodeData = await this.getAuthorizationCode(code, client);
    if (!authCodeData) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Invalid authorization code' 
        }),
      };
    }

    // クライアント認証
    const clientData = await this.authenticateClient(clientId, clientSecret, client);
    if (!clientData) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_client',
          error_description: 'Invalid client credentials' 
        }),
      };
    }

    // PKCE検証
    const expectedChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    if (authCodeData.codeChallenge !== expectedChallenge) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Invalid code_verifier' 
        }),
      };
    }

    // トークン生成
    const accessToken = JwtVerifier.generateToken({
      client_id: clientId,
      user_id: authCodeData.userId,
      scope: authCodeData.scope || '',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1時間
    });

    const refreshToken = this.generateRefreshToken();

    // Refresh Token保存
    await this.saveRefreshToken({
      refreshToken,
      clientId,
      userId: authCodeData.userId,
      scope: authCodeData.scope || '',
      expiresAt: Math.floor(Date.now() / 1000) + 2592000, // 30日
    }, client);

    // Authorization Code削除
    await this.deleteAuthorizationCode(code, client);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: authCodeData.scope || '',
      }),
    };
  }

  // Client Credentials Grant (OAuth 2.1)
  private static async handleClientCredentialsGrant(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_client',
          error_description: 'Invalid client credentials' 
        }),
      };
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [clientId, clientSecret] = credentials.split(':');

    const clientData = await this.authenticateClient(clientId, clientSecret, client);
    if (!clientData) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_client',
          error_description: 'Invalid client credentials' 
        }),
      };
    }

    const accessToken = JwtVerifier.generateToken({
      client_id: clientId,
      scope: clientData.scope || '',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1時間
    });

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: clientData.scope || '',
      }),
    };
  }

  // Refresh Token Grant (OAuth 2.1)
  private static async handleRefreshTokenGrant(params: URLSearchParams, client: any): Promise<APIGatewayProxyResult> {
    const refreshToken = params.get('refresh_token');
    const clientId = params.get('client_id');
    const clientSecret = params.get('client_secret');

    if (!refreshToken || !clientId || !clientSecret) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_request',
          error_description: 'Missing required parameters' 
        }),
      };
    }

    // Refresh Token検証
    const refreshTokenData = await this.getRefreshToken(refreshToken, client);
    if (!refreshTokenData) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Invalid refresh token' 
        }),
      };
    }

    // クライアント認証
    const clientData = await this.authenticateClient(clientId, clientSecret, client);
    if (!clientData) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_client',
          error_description: 'Invalid client credentials' 
        }),
      };
    }

    // 新しいトークン生成
    const accessToken = JwtVerifier.generateToken({
      client_id: clientId,
      user_id: refreshTokenData.userId,
      scope: refreshTokenData.scope || '',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1時間
    });

    const newRefreshToken = this.generateRefreshToken();

    // 新しいRefresh Token保存
    await this.saveRefreshToken({
      refreshToken: newRefreshToken,
      clientId,
      userId: refreshTokenData.userId,
      scope: refreshTokenData.scope || '',
      expiresAt: Math.floor(Date.now() / 1000) + 2592000, // 30日
    }, client);

    // 古いRefresh Token削除
    await this.deleteRefreshToken(refreshToken, client);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: newRefreshToken,
        scope: refreshTokenData.scope || '',
      }),
    };
  }

  // UserInfo Endpoint (OAuth 2.1)
  private static async handleUserInfo(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_token',
          error_description: 'Invalid access token' 
        }),
      };
    }

    const token = authHeader.substring(7);
    const payload = await JwtVerifier.verify(token);
    
    if (!payload || !payload.user_id) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_token',
          error_description: 'Invalid access token' 
        }),
      };
    }

    try {
      const currentUser = await getCurrentUser();
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          sub: currentUser.userId,
          username: currentUser.username,
          email: currentUser.signInDetails?.loginId,
        }),
      };
    } catch (error) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_token',
          error_description: 'User not found' 
        }),
      };
    }
  }

  // ヘルパーメソッド
  private static async getClient(clientId: string, client: any) {
    try {
      const { data } = await client.models.McpClient.get({ clientId });
      return data;
    } catch (error) {
      return null;
    }
  }

  private static async authenticateClient(clientId: string, clientSecret: string, client: any) {
    try {
      const { data } = await client.models.McpClient.get({ clientId });
      if (!data || data.clientSecret !== clientSecret) {
        return null;
      }
      return data;
    } catch (error) {
      return null;
    }
  }

  private static async saveAuthorizationCode(authCodeData: any, client: any) {
    await client.models.AuthorizationCode.create(authCodeData);
  }

  private static async getAuthorizationCode(code: string, client: any) {
    try {
      const { data } = await client.models.AuthorizationCode.get({ code });
      return data;
    } catch (error) {
      return null;
    }
  }

  private static async deleteAuthorizationCode(code: string, client: any) {
    await client.models.AuthorizationCode.delete({ code });
  }

  private static async saveRefreshToken(refreshTokenData: any, client: any) {
    await client.models.RefreshToken.create(refreshTokenData);
  }

  private static async getRefreshToken(refreshToken: string, client: any) {
    try {
      const { data } = await client.models.RefreshToken.get({ refreshToken });
      return data;
    } catch (error) {
      return null;
    }
  }

  private static async deleteRefreshToken(refreshToken: string, client: any) {
    await client.models.RefreshToken.delete({ refreshToken });
  }

  private static generateAuthorizationCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

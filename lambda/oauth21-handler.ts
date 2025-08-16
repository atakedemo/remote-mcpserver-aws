import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { JwtVerifier } from './jwt-verifier';
import * as crypto from 'crypto';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class OAuth21Handler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const path = event.path;
      const method = event.httpMethod;

      if (path === '/oauth/authorize' && method === 'GET') {
        return await this.handleAuthorization(event);
      } else if (path === '/oauth/token' && method === 'POST') {
        return await this.handleToken(event);
      } else if (path === '/oauth/userinfo' && method === 'GET') {
        return await this.handleUserInfo(event);
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
  private static async handleAuthorization(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
    const client = await this.getClient(queryParams.client_id);
    if (!client) {
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
    if (!client.redirectUris.includes(queryParams.redirect_uri)) {
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

    // Authorization Code生成
    const authCode = this.generateAuthorizationCode();
    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10分

    // Authorization Code保存
    await this.saveAuthorizationCode({
      code: authCode,
      clientId: queryParams.client_id,
      redirectUri: queryParams.redirect_uri,
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
      headers: { 
        'Location': redirectUrl,
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };
  }

  // Token Endpoint (OAuth 2.1)
  private static async handleToken(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const body = event.body || '';
    const params = new URLSearchParams(body);
    
    const grantType = params.get('grant_type');
    
    if (grantType === 'authorization_code') {
      return await this.handleAuthorizationCodeGrant(params);
    } else if (grantType === 'client_credentials') {
      return await this.handleClientCredentialsGrant(event);
    } else if (grantType === 'refresh_token') {
      return await this.handleRefreshTokenGrant(params);
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
  private static async handleAuthorizationCodeGrant(params: URLSearchParams): Promise<APIGatewayProxyResult> {
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
    const authCodeData = await this.getAuthorizationCode(code);
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
    const client = await this.authenticateClient(clientId, clientSecret);
    if (!client) {
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
    const expectedCodeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    if (authCodeData.codeChallenge !== expectedCodeChallenge) {
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

    // 有効期限チェック
    if (authCodeData.expiresAt < Math.floor(Date.now() / 1000)) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Authorization code expired' 
        }),
      };
    }

    // Access Token生成
    const accessToken = JwtVerifier.generateToken({
      client_id: clientId,
      scope: authCodeData.scope,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1時間
    });

    // Refresh Token生成
    const refreshToken = this.generateRefreshToken();

    // Refresh Token保存
    await this.saveRefreshToken({
      refreshToken,
      clientId,
      scope: authCodeData.scope,
      expiresAt: Math.floor(Date.now() / 1000) + 2592000, // 30日
    });

    // Authorization Code削除（ワンタイム使用）
    await this.deleteAuthorizationCode(code);

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
        scope: authCodeData.scope,
      }),
    };
  }

  // Client Credentials Grant (OAuth 2.1)
  private static async handleClientCredentialsGrant(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
          error_description: 'Missing or invalid authorization header' 
        }),
      };
    }

    // Basic認証のデコード
    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [clientId, clientSecret] = credentials.split(':');

    if (!clientId || !clientSecret) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_client',
          error_description: 'Invalid credentials format' 
        }),
      };
    }

    // クライアント認証
    const client = await this.authenticateClient(clientId, clientSecret);
    if (!client) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_client',
          error_description: 'Invalid credentials' 
        }),
      };
    }

    // Access Token生成
    const accessToken = JwtVerifier.generateToken({
      client_id: clientId,
      scope: client.scope || '',
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
        scope: client.scope || '',
      }),
    };
  }

  // Refresh Token Grant (OAuth 2.1)
  private static async handleRefreshTokenGrant(params: URLSearchParams): Promise<APIGatewayProxyResult> {
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
    const refreshTokenData = await this.getRefreshToken(refreshToken);
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
    const client = await this.authenticateClient(clientId, clientSecret);
    if (!client || client.clientId !== refreshTokenData.clientId) {
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

    // 有効期限チェック
    if (refreshTokenData.expiresAt < Math.floor(Date.now() / 1000)) {
      await this.deleteRefreshToken(refreshToken);
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_grant',
          error_description: 'Refresh token expired' 
        }),
      };
    }

    // 新しいAccess Token生成
    const accessToken = JwtVerifier.generateToken({
      client_id: clientId,
      scope: refreshTokenData.scope,
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
        scope: refreshTokenData.scope,
      }),
    };
  }

  // UserInfo Endpoint (OAuth 2.1)
  private static async handleUserInfo(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
          error_description: 'Missing or invalid authorization header' 
        }),
      };
    }

    const token = authHeader.substring(7);
    const payload = await JwtVerifier.verify(token);
    
    if (!payload) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_token',
          error_description: 'Invalid token' 
        }),
      };
    }

    // クライアント情報取得
    const client = await this.getClient(payload.client_id);
    if (!client) {
      return {
        statusCode: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'invalid_token',
          error_description: 'Client not found' 
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        sub: payload.client_id,
        client_id: payload.client_id,
        client_name: client.clientName,
        scope: payload.scope,
      }),
    };
  }

  // ヘルパーメソッド
  private static generateAuthorizationCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static async getClient(clientId: string) {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );
      return result.Item;
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
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

  private static async saveAuthorizationCode(authCodeData: any) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: process.env.AUTH_CODE_TABLE_NAME || 'mcp-auth-codes',
          Item: {
            code: authCodeData.code,
            clientId: authCodeData.clientId,
            redirectUri: authCodeData.redirectUri,
            codeChallenge: authCodeData.codeChallenge,
            codeChallengeMethod: authCodeData.codeChallengeMethod,
            state: authCodeData.state,
            scope: authCodeData.scope,
            expiresAt: authCodeData.expiresAt,
            createdAt: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Error saving authorization code:', error);
      throw error;
    }
  }

  private static async getAuthorizationCode(code: string) {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.AUTH_CODE_TABLE_NAME || 'mcp-auth-codes',
          Key: { code },
        })
      );
      return result.Item;
    } catch (error) {
      console.error('Error getting authorization code:', error);
      return null;
    }
  }

  private static async deleteAuthorizationCode(code: string) {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: process.env.AUTH_CODE_TABLE_NAME || 'mcp-auth-codes',
          Key: { code },
        })
      );
    } catch (error) {
      console.error('Error deleting authorization code:', error);
    }
  }

  private static async saveRefreshToken(refreshTokenData: any) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: process.env.REFRESH_TOKEN_TABLE_NAME || 'mcp-refresh-tokens',
          Item: {
            refreshToken: refreshTokenData.refreshToken,
            clientId: refreshTokenData.clientId,
            scope: refreshTokenData.scope,
            expiresAt: refreshTokenData.expiresAt,
            createdAt: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw error;
    }
  }

  private static async getRefreshToken(refreshToken: string) {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.REFRESH_TOKEN_TABLE_NAME || 'mcp-refresh-tokens',
          Key: { refreshToken },
        })
      );
      return result.Item;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  private static async deleteRefreshToken(refreshToken: string) {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: process.env.REFRESH_TOKEN_TABLE_NAME || 'mcp-refresh-tokens',
          Key: { refreshToken },
        })
      );
    } catch (error) {
      console.error('Error deleting refresh token:', error);
    }
  }
} 
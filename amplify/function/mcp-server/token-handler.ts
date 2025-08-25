import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { JwtVerifier } from './jwt-verifier';

export class TokenHandler {
  static async handle(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    try {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return {
          statusCode: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Unauthorized' }),
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
          body: JSON.stringify({ error: 'Invalid credentials format' }),
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
          body: JSON.stringify({ error: 'Invalid credentials' }),
        };
      }

      // JWTトークンを生成
      const token = JwtVerifier.generateToken({
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
          access_token: token,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: clientData.scope || '',
        }),
      };
    } catch (error) {
      console.error('Token handler error:', error);
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

  private static async authenticateClient(clientId: string, clientSecret: string, client: any) {
    try {
      const { data } = await client.models.McpClient.get({ clientId });
      
      if (!data || data.clientSecret !== clientSecret) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error authenticating client:', error);
      return null;
    }
  }
}

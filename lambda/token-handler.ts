import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { JwtVerifier } from './jwt-verifier';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class TokenHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
      const client = await this.authenticateClient(clientId, clientSecret);
      if (!client) {
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
          access_token: token,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: client.scope || '',
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
} 
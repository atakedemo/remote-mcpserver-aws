import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { JwtVerifier } from './jwt-verifier';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class McpHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Authorization headerからトークンを取得
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Unauthorized' }),
        };
      }

      const token = authHeader.substring(7);
      
      // JWTトークンを検証
      const payload = await JwtVerifier.verify(token);
      if (!payload) {
        return {
          statusCode: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Invalid token' }),
        };
      }

      // クライアント情報を取得
      const clientId = payload.client_id;
      const client = await this.getClient(clientId);
      if (!client) {
        return {
          statusCode: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Client not found' }),
        };
      }

      // MCPリクエストを処理
      const requestBody = JSON.parse(event.body || '{}');
      const response = await this.processMcpRequest(requestBody, client);

      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(response),
      };
    } catch (error) {
      console.error('MCP handler error:', error);
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

  private static async processMcpRequest(request: any, client: any) {
    // MCPプロトコルに基づいてリクエストを処理
    const { jsonrpc, id, method, params } = request;

    if (jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      };
    }

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'Remote MCP Server',
              version: '1.0.0',
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [],
          },
        };

      case 'tools/call':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: 'Tool call not implemented yet',
              },
            ],
          },
        };

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: [],
          },
        };

      case 'resources/read':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri: params.uri,
                mimeType: 'text/plain',
                text: 'Resource not found',
              },
            ],
          },
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        };
    }
  }
} 
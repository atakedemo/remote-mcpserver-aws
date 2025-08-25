import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { JwtVerifier } from './jwt-verifier';

export class McpHandler {
  static async handle(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
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
      const clientData = await this.getClient(clientId, client);
      if (!clientData) {
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
      const response = await this.processMcpRequest(requestBody, clientData);

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

  private static async getClient(clientId: string, client: any) {
    try {
      const { data } = await client.models.McpClient.get({ clientId });
      return data;
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
    }
  }

  private static async processMcpRequest(requestBody: any, client: any) {
    const { method, params } = requestBody;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: requestBody.id,
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
          id: requestBody.id,
          result: {
            tools: [
              {
                name: 'echo',
                description: 'Echo back the input',
                inputSchema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      description: 'Message to echo',
                    },
                  },
                  required: ['message'],
                },
              },
            ],
          },
        };

      case 'tools/call':
        if (params.name === 'echo') {
          return {
            jsonrpc: '2.0',
            id: requestBody.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Echo: ${params.arguments.message}`,
                },
              ],
            },
          };
        }
        throw new Error(`Unknown tool: ${params.name}`);

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id: requestBody.id,
          result: {
            resources: [
              {
                uri: 'file:///example.txt',
                name: 'Example File',
                description: 'An example file resource',
                mimeType: 'text/plain',
              },
            ],
          },
        };

      case 'resources/read':
        if (params.uri === 'file:///example.txt') {
          return {
            jsonrpc: '2.0',
            id: requestBody.id,
            result: {
              contents: [
                {
                  uri: 'file:///example.txt',
                  mimeType: 'text/plain',
                  text: 'This is an example file content.',
                },
              ],
            },
          };
        }
        throw new Error(`Unknown resource: ${params.uri}`);

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}

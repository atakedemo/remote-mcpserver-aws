import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { McpHandler } from './mcp-handler';
import { DcrHandler } from './dcr-handler';
import { ClientHandler } from './client-handler';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    console.log(`Handling request: ${method} ${path}`);

    // ルーティング
    if (path === '/mcp' && method === 'POST') {
      return await McpHandler.handle(event);
    } else if (path === '/dcr' && method === 'POST') {
      return await DcrHandler.handle(event);
    } else if (path.startsWith('/clients/') && method === 'GET') {
      return await ClientHandler.get(event);
    } else if (path.startsWith('/clients/') && method === 'DELETE') {
      return await ClientHandler.delete(event);
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      },
      body: JSON.stringify({ error: 'Not Found' }),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}; 
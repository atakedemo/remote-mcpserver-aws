import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { McpHandler } from './mcp-handler';
import { DcrHandler } from './dcr-handler';
import { ClientHandler } from './client-handler';
import { TokenHandler } from './token-handler';
import { OAuth21Handler } from './oauth21-handler';

const client = generateClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    console.log(`Handling request: ${method} ${path}`);

    // ルーティング
    if (path === '/mcp' && method === 'POST') {
      return await McpHandler.handle(event, client);
    } else if (path === '/dcr' && method === 'POST') {
      return await DcrHandler.handle(event, client);
    } else if (path === '/token' && method === 'POST') {
      return await TokenHandler.handle(event, client);
    } else if (path.startsWith('/oauth/') && (method === 'GET' || method === 'POST')) {
      return await OAuth21Handler.handle(event, client);
    } else if (path.startsWith('/clients/') && method === 'GET') {
      return await ClientHandler.get(event, client);
    } else if (path.startsWith('/clients/') && method === 'DELETE') {
      return await ClientHandler.delete(event, client);
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

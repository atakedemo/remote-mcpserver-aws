import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';

export class ClientHandler {
  static async get(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    try {
      const clientId = event.pathParameters?.clientId;
      if (!clientId) {
        return {
          statusCode: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Client ID is required' }),
        };
      }

      const { data } = await client.models.McpClient.get({ clientId });
      if (!data) {
        return {
          statusCode: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Client not found' }),
        };
      }

      // clientSecretは返さない
      const { clientSecret, ...clientInfo } = data;

      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(clientInfo),
      };
    } catch (error) {
      console.error('Client handler get error:', error);
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

  static async delete(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    try {
      const clientId = event.pathParameters?.clientId;
      if (!clientId) {
        return {
          statusCode: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Client ID is required' }),
        };
      }

      await client.models.McpClient.delete({ clientId });

      return {
        statusCode: 204,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: '',
      };
    } catch (error) {
      console.error('Client handler delete error:', error);
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
}

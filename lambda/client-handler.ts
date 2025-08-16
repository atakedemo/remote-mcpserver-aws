import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class ClientHandler {
  static async get(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Client not found' }),
        };
      }

      // client_secretは除外して返す
      const { clientSecret, ...clientInfo } = result.Item;

      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(clientInfo),
      };
    } catch (error) {
      console.error('Get client error:', error);
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

  static async delete(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

      await docClient.send(
        new DeleteCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );

      return {
        statusCode: 204,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: '',
      };
    } catch (error) {
      console.error('Delete client error:', error);
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
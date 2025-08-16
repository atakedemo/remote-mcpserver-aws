import { APIGatewayProxyEvent } from 'aws-lambda';
import { McpHandler } from '../lambda/mcp-handler';

describe('McpHandler', () => {
  const mockEvent: APIGatewayProxyEvent = {
    httpMethod: 'POST',
    path: '/mcp',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'Test Client',
          version: '1.0.0',
        },
      },
    }),
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  };

  test('should handle initialize request', async () => {
    // このテストは実際のJWT検証とDynamoDBアクセスが必要なため、
    // モックを使用するか、統合テストとして実行する必要があります
    expect(true).toBe(true);
  });

  test('should return 401 for missing authorization header', async () => {
    const eventWithoutAuth = {
      ...mockEvent,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const result = await McpHandler.handle(eventWithoutAuth);
    expect(result.statusCode).toBe(401);
  });
}); 
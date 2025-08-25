import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export class DcrHandler {
  static async handle(event: APIGatewayProxyEvent, client: any): Promise<APIGatewayProxyResult> {
    try {
      const requestBody = JSON.parse(event.body || '{}');
      
      // RFC 7591に基づくクライアント登録
      const clientId = uuidv4();
      const clientSecret = this.generateClientSecret();
      
      const clientData = {
        clientId,
        clientSecret,
        clientName: requestBody.client_name,
        clientUri: requestBody.client_uri,
        redirectUris: requestBody.redirect_uris || [],
        grantTypes: requestBody.grant_types || ['client_credentials'],
        responseTypes: requestBody.response_types || [],
        tokenEndpointAuthMethod: requestBody.token_endpoint_auth_method || 'client_secret_basic',
        scope: requestBody.scope || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Amplify Dataに保存
      await client.models.McpClient.create(clientData);

      // RFC 7591準拠のレスポンス
      return {
        statusCode: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0, // 無期限
          client_name: clientData.clientName,
          client_uri: clientData.clientUri,
          redirect_uris: clientData.redirectUris,
          grant_types: clientData.grantTypes,
          response_types: clientData.responseTypes,
          token_endpoint_auth_method: clientData.tokenEndpointAuthMethod,
          scope: clientData.scope,
        }),
      };
    } catch (error) {
      console.error('DCR handler error:', error);
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

  private static generateClientSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

import { defineFunction } from '@aws-amplify/backend';

export const mcpServerFunction = defineFunction({
  name: 'mcp-server',
  entry: './handler.ts',
  runtime: 'nodejs18.x',
  timeout: 30,
  memorySize: 512,
  environment: {
    NODE_ENV: 'production',
  },
});

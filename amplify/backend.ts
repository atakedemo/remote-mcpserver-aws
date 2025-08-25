import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { mcpServerFunction } from './function/mcp-server/resource';

export const backend = defineBackend({
  auth,
  data,
  storage,
  mcpServerFunction,
});

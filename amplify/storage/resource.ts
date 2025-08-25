import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'mcp-storage',
  accessControl: {
    authenticated: {
      read: true,
      write: true,
    },
    guest: {
      read: false,
      write: false,
    },
  },
});

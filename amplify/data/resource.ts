import { type ClientSchema, a } from '@aws-amplify/amplify-api-next-alpha';

const schema: ClientSchema = a.schema({
  User: a.model({
    username: a.string().required(),
    email: a.string().required(),
    passwordHash: a.string().required(),
    salt: a.string().required(),
    status: a.string().required(),
    lastLoginAt: a.string(),
    failedLoginAttempts: a.integer(),
    lockedUntil: a.string(),
    createdAt: a.string().required(),
    updatedAt: a.string().required(),
  }).authorization([a.allow.owner()]),

  Session: a.model({
    userId: a.string().required(),
    expiresAt: a.integer().required(),
    createdAt: a.string().required(),
  }).authorization([a.allow.owner()]),

  McpClient: a.model({
    clientId: a.string().required(),
    clientSecret: a.string().required(),
    clientName: a.string(),
    clientUri: a.string(),
    redirectUris: a.list(a.string()),
    grantTypes: a.list(a.string()),
    responseTypes: a.list(a.string()),
    tokenEndpointAuthMethod: a.string(),
    scope: a.string(),
    createdAt: a.string().required(),
    updatedAt: a.string().required(),
  }).authorization([a.allow.owner()]),

  AuthorizationCode: a.model({
    code: a.string().required(),
    clientId: a.string().required(),
    redirectUri: a.string().required(),
    userId: a.string(),
    codeChallenge: a.string(),
    codeChallengeMethod: a.string(),
    state: a.string(),
    scope: a.string(),
    expiresAt: a.integer().required(),
  }).authorization([a.allow.owner()]),

  RefreshToken: a.model({
    refreshToken: a.string().required(),
    clientId: a.string().required(),
    userId: a.string().required(),
    scope: a.string(),
    expiresAt: a.integer().required(),
  }).authorization([a.allow.owner()]),
});

export type Schema = typeof schema;

export const data = a.data({
  schema,
});

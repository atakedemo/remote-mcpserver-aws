'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    try {
      setError('');
      await signIn({ username, password });
      await checkUser();
    } catch (error: any) {
      setError(error.message);
    }
  }

  async function handleSignUp() {
    try {
      setError('');
      await signIn({ username, password, options: { userAttributes: { email } } });
      await checkUser();
    } catch (error: any) {
      setError(error.message);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
    } catch (error: any) {
      setError(error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {user.username}!
              </h2>
              <p className="text-gray-600">
                You are successfully authenticated with the MCP Server.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">User Information</h3>
                <p className="text-sm text-gray-600">
                  <strong>Username:</strong> {user.username}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>User ID:</strong> {user.userId}
                </p>
                {user.signInDetails?.loginId && (
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {user.signInDetails.loginId}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">MCP Server Status</h3>
                <p className="text-sm text-blue-700">
                  Your authentication is ready for MCP client applications.
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  Use your credentials to configure Claude Desktop or Cursor.
                </p>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              MCP Server Authentication
            </h2>
            <p className="text-gray-600">
              Sign in to access the MCP server with user authentication.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={isSignUp ? handleSignUp : handleSignIn}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">About MCP Server</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                This is a remote MCP (Model Context Protocol) server with OAuth 2.1 authentication.
              </p>
              <p>
                After signing in, you can configure MCP clients like Claude Desktop or Cursor to use this server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

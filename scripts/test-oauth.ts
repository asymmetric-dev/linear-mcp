import { LinearAuth } from '../src/auth.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  const auth = new LinearAuth();
  auth.initialize({
    type: 'oauth',
    clientId: process.env.LINEAR_CLIENT_ID!,
    clientSecret: process.env.LINEAR_CLIENT_SECRET!,
    redirectUri: process.env.LINEAR_REDIRECT_URI!,
  });

  // Use the auth code from the previous attempt
  const authCode = '48bccb50098c98c6f56d452a5096baf56bf4ef805cc3781d0529fb234e18e32c';

  try {
    // Exchange code for tokens
    await auth.handleCallback(authCode);

    // Get user info to verify authentication
    const client = auth.getClient();
    const viewer = await client.viewer;

    console.log('\nOAuth Authentication successful!');
    console.log(`Connected as: ${viewer.name} (${viewer.email})`);
    console.log('\nTest Credentials:\n');

    // Get tokens from auth instance
    const tokenData = (auth as any).tokenData;
    if (tokenData?.refreshToken) {
      console.log(`LINEAR_AUTH_CODE=${authCode}`);
      console.log(`LINEAR_REFRESH_TOKEN=${tokenData.refreshToken}`);
    }
  } catch (error) {
    console.error('Token exchange failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

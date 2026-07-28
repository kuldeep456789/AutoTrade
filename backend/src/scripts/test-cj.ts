import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function testCJAuth() {
  const apiKey = process.env.CJ_API_KEY;
  const baseUrl =
    process.env.CJ_API_BASE_URL ||
    'https://developers.cjdropshipping.com/api2.0';

  console.log(`Using Base URL: ${baseUrl}`);
  console.log(
    `Using API Key: ${apiKey ? apiKey.substring(0, 15) + '...' : 'MISSING'}`,
  );

  if (!apiKey) {
    console.error('❌ CJ_API_KEY is not set in .env');
    process.exit(1);
  }

  try {
    const response = await axios.post(
      `${baseUrl}/v1/authentication/getAccessToken`,
      {
        apiKey,
      },
    );

    if (response.data && response.data.result) {
      console.log('✅ CJ ID is WORKING!');
      console.log('Token received successfully.');
    } else {
      console.log('❌ CJ API returned an error:');
      console.log(response.data);
    }
  } catch (error: any) {
    console.error('❌ Request failed:');
    console.error(error.response?.data || error.message);
  }
}

testCJAuth();

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Default port from environment variable or fallback to 8080
const port = process.env.PORT || 8080;
const baseUrl = `http://localhost:${port}`;

async function testServer() {
  console.log(`Testing server at ${baseUrl}...`);
  
  try {
    // Test 1: Check if the server is running
    console.log('\nTest 1: Checking if server is running...');
    const homeResponse = await fetch(baseUrl);
    if (homeResponse.ok) {
      console.log('✅ Server is running and responding to requests.');
    } else {
      console.error(`❌ Server returned status ${homeResponse.status}: ${homeResponse.statusText}`);
      return;
    }
    
    // Test 2: Check if the template endpoint is working
    console.log('\nTest 2: Checking template endpoint...');
    try {
      const templateResponse = await fetch(`${baseUrl}/template`);
      if (templateResponse.ok) {
        console.log('✅ Template endpoint is working.');
      } else {
        console.error(`❌ Template endpoint returned status ${templateResponse.status}: ${templateResponse.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error accessing template endpoint:', error.message);
    }
    
    // Test 3: Check if the sign page is accessible
    console.log('\nTest 3: Checking sign page...');
    try {
      const signResponse = await fetch(`${baseUrl}/sign`);
      if (signResponse.ok) {
        console.log('✅ Sign page is accessible.');
      } else {
        console.error(`❌ Sign page returned status ${signResponse.status}: ${signResponse.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error accessing sign page:', error.message);
    }
    
    // Test 4: Check health endpoint
    console.log('\nTest 4: Checking health endpoint...');
    try {
      const healthResponse = await fetch(`${baseUrl}/_health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Health endpoint is working.');
        console.log('Health status:', healthData);
      } else {
        console.error(`❌ Health endpoint returned status ${healthResponse.status}: ${healthResponse.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error accessing health endpoint:', error.message);
    }
    
    console.log('\nServer test completed.');
  } catch (error) {
    console.error('❌ Error testing server:', error.message);
    console.error('Make sure the server is running with "npm start" in another terminal.');
  }
}

testServer();

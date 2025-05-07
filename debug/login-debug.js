/**
 * A utility script to debug login issues
 */

import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookieFactory from 'fetch-cookie';

function getCookieJar() {
  return new CookieJar();
}

async function login(username, password, userType) {
  const jar = getCookieJar();
  const fetchWithCookies = fetchCookie(fetch, jar);
  
  console.log(`Attempting to login with username: ${username}, userType: ${userType}`);
  
  try {
    const response = await fetchWithCookies('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password, userType }),
    });
    
    const responseBody = await response.json();
    console.log('Login response status:', response.status);
    console.log('Login response body:', responseBody);
    
    if (response.ok) {
      console.log('Login successful');
      console.log('Session cookies:', await jar.getCookies('http://localhost:5000'));
      
      // Try to get user info with the session
      const meResponse = await fetchWithCookies('http://localhost:5000/api/auth/me');
      const meBody = await meResponse.json();
      console.log('Auth check response status:', meResponse.status);
      console.log('Auth check response body:', meBody);
      
      return { success: true, user: responseBody, cookies: await jar.getCookies('http://localhost:5000') };
    } else {
      console.log('Login failed');
      return { success: false, error: responseBody };
    }
  } catch (error) {
    console.error('Error during login:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  // Test driver login
  console.log('\n=== TESTING DRIVER LOGIN ===');
  const driverResult = await login('driver1', 'password123', 'driver');
  
  // Test rider login
  console.log('\n=== TESTING RIDER LOGIN ===');
  const riderResult = await login('rider1', 'password123', 'rider');
  
  console.log('\n=== SUMMARY ===');
  console.log('Driver login success:', driverResult.success);
  console.log('Rider login success:', riderResult.success);
}

main().catch(console.error);
/**
 * A utility script to test authentication flows
 */

const apiUrl = 'http://localhost:5000/api';

// Function to create a cookie jar
function CookieJar() {
  this.cookies = {};
  
  this.setCookie = function(setCookieHeader) {
    const parts = setCookieHeader.split(';')[0].split('=');
    const name = parts[0].trim();
    const value = parts[1].trim();
    this.cookies[name] = value;
  };
  
  this.getCookieHeader = function() {
    return Object.keys(this.cookies)
      .map(name => `${name}=${this.cookies[name]}`)
      .join('; ');
  };
}

// Create a session by logging in
async function testLogin(username, password, userType) {
  console.log(`Logging in as ${username} (${userType})...`);
  
  const jar = new CookieJar();
  
  try {
    const loginResponse = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password, userType }),
      redirect: 'manual'
    });
    
    // Store cookies
    const setCookie = loginResponse.headers.get('set-cookie');
    if (setCookie) {
      jar.setCookie(setCookie);
    }
    
    console.log('Login response status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return null;
    }
    
    const userData = await loginResponse.json();
    console.log('Login successful, user data:', userData);
    
    // Now test the /me endpoint
    console.log('\nTesting /api/auth/me endpoint...');
    const meResponse = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        'Cookie': jar.getCookieHeader()
      }
    });
    
    console.log('/me response status:', meResponse.status);
    
    if (!meResponse.ok) {
      console.error('/me request failed:', await meResponse.text());
      return null;
    }
    
    const meData = await meResponse.json();
    console.log('/me response:', meData);
    
    return { jar, userData };
  } catch (error) {
    console.error('Error during auth test:', error);
    return null;
  }
}

// Run the tests
async function runTests() {
  console.log('=== Testing driver login ===');
  const driverSession = await testLogin('driver1', 'password123', 'driver');
  
  console.log('\n=== Testing employee login ===');
  const employeeSession = await testLogin('rider1', 'password123', 'rider');
  
  console.log('\n=== Tests complete ===');
}

// Run the tests
runTests().catch(err => console.error('Test runner error:', err));
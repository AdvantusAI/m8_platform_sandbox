async function testServer() {
  try {
    console.log('Testing server health...');
    const response = await fetch('http://localhost:3001/api/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running:', data);
    } else {
      console.log('❌ Server responded with error:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot connect to server:', error.message);
    console.log('Make sure the server is running with: node server.mjs');
  }

  try {
    console.log('\nTesting database connection...');
    const testUser = {
      email: 'test@example.com',
      password: '123456'
    };

    const response = await fetch('http://localhost:3001/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    console.log('Sign-in response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authentication working:', data.user);
    } else {
      const errorText = await response.text();
      console.log('❌ Authentication failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
  }
}

testServer();

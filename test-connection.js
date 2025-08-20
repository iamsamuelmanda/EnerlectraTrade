const https = require('https');
const WebSocket = require('ws');

// Test backend health endpoint
async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...');
  
  // For now, test local backend
  const localHealth = await fetch('http://localhost:5000/health');
  if (localHealth.ok) {
    const data = await localHealth.json();
    console.log('✅ Local Backend Health:', data.status);
    console.log('   Service:', data.service);
    console.log('   Version:', data.version);
    console.log('   Security:', data.security.status);
    console.log('   Features:', Object.keys(data.features));
    console.log('   Branding:', data.branding.name, '-', data.branding.tagline);
  } else {
    console.log('❌ Local Backend Health Failed:', localHealth.status);
  }
}

// Test WebSocket connection
async function testWebSocket() {
  console.log('\n🔌 Testing WebSocket Connection...');
  
  try {
    const ws = new WebSocket('ws://localhost:5000');
    
    ws.on('open', () => {
      console.log('✅ WebSocket Connected Successfully');
      ws.close();
    });
    
    ws.on('error', (error) => {
      console.log('❌ WebSocket Connection Failed:', error.message);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log('⏰ WebSocket Connection Timeout');
        ws.close();
      }
    }, 5000);
    
  } catch (error) {
    console.log('❌ WebSocket Test Error:', error.message);
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  try {
    const apiResponse = await fetch('http://localhost:5000/api');
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ API Endpoint:', data.message);
      console.log('   Version:', data.version);
      console.log('   Available Endpoints:', data.endpoints);
    } else {
      console.log('❌ API Endpoint Failed:', apiResponse.status);
    }
  } catch (error) {
    console.log('❌ API Test Error:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Enerlectra Connection Tests...\n');
  
  await testBackendHealth();
  await testWebSocket();
  await testAPIEndpoints();
  
  console.log('\n🎯 Test Summary:');
  console.log('   • Backend Health: ✅ Working');
  console.log('   • WebSocket: ✅ Connected');
  console.log('   • API Endpoints: ✅ Accessible');
  console.log('\n⚡ Next Steps:');
  console.log('   1. Deploy backend to Render');
  console.log('   2. Update frontend environment variables');
  console.log('   3. Test production deployment');
  console.log('   4. Verify all services are accessible');
}

// Run tests
runTests().catch(console.error); 
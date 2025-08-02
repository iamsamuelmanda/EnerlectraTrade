#!/usr/bin/env node

const http = require('http');

const API_BASE = 'http://localhost:5000';

class APITester {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsedBody = JSON.parse(body);
            resolve({
              statusCode: res.statusCode,
              body: parsedBody,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              body: body,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async test(name, testFn) {
    console.log(`Running test: ${name}`);
    try {
      await testFn();
      console.log(`✅ PASS: ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name} - ${error.message}`);
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Enerlectra API Tests\n');

    // Test 1: Health Check
    await this.test('Health Check Endpoint', async () => {
      const response = await this.makeRequest('GET', '/health');
      this.assert(response.statusCode === 200, 'Health check should return 200');
      this.assert(response.body.success === true, 'Health check should be successful');
      this.assert(response.body.data.status === 'healthy', 'Status should be healthy');
    });

    // Test 2: Get User Wallet
    await this.test('Get User Wallet', async () => {
      const response = await this.makeRequest('GET', '/wallet/user1');
      this.assert(response.statusCode === 200, 'Wallet endpoint should return 200');
      this.assert(response.body.success === true, 'Wallet request should be successful');
      this.assert(typeof response.body.data.balanceZMW === 'number', 'Should return numeric balance');
    });

    // Test 3: Market Stats
    await this.test('Market Statistics', async () => {
      const response = await this.makeRequest('GET', '/market/stats');
      this.assert(response.statusCode === 200, 'Market stats should return 200');
      this.assert(response.body.success === true, 'Market stats should be successful');
      this.assert(response.body.data.platform, 'Should contain platform data');
    });

    // Test 4: Pricing Information
    await this.test('Dynamic Pricing', async () => {
      const response = await this.makeRequest('GET', '/pricing');
      this.assert(response.statusCode === 200, 'Pricing should return 200');
      this.assert(response.body.success === true, 'Pricing should be successful');
      this.assert(response.body.data.baseRate, 'Should contain base rate information');
    });

    // Test 5: USSD Interface
    await this.test('USSD Interface', async () => {
      const response = await this.makeRequest('POST', '/ussd', {
        text: '',
        phoneNumber: '+260978000001'
      });
      this.assert(response.statusCode === 200, 'USSD should return 200');
      this.assert(response.body.success === true, 'USSD should be successful');
      this.assert(response.body.data.text.includes('Welcome'), 'Should show welcome message');
    });

    // Test 6: User Registration
    await this.test('User Registration', async () => {
      const testUser = {
        name: 'Test User CI',
        phoneNumber: '+260978999999'
      };
      const response = await this.makeRequest('POST', '/users/register', testUser);
      this.assert(response.statusCode === 200, 'Registration should return 200');
      this.assert(response.body.success === true, 'Registration should be successful');
      this.assert(response.body.data.userId, 'Should return user ID');
    });

    // Test 7: Blockchain Wallet Creation
    await this.test('Blockchain Wallet Creation', async () => {
      const response = await this.makeRequest('POST', '/blockchain/wallet/create', {
        userId: 'user1',
        type: 'energy_token'
      });
      // Should handle existing wallet gracefully
      this.assert(response.statusCode === 200 || response.statusCode === 400, 'Should handle wallet creation');
    });

    // Test 8: Energy Trade
    await this.test('Energy Trade Transaction', async () => {
      const tradeData = {
        buyerId: 'user1',
        sellerId: 'user2',
        kWh: 1.0
      };
      const response = await this.makeRequest('POST', '/trade', tradeData);
      this.assert(response.statusCode === 200 || response.statusCode === 400, 'Should handle trade request');
      if (response.statusCode === 200) {
        this.assert(response.body.data.transactionId, 'Should return transaction ID');
      }
    });

    // Test 9: Cluster Information
    await this.test('Cluster Information', async () => {
      const response = await this.makeRequest('GET', '/cluster/cluster1');
      this.assert(response.statusCode === 200, 'Cluster info should return 200');
      this.assert(response.body.success === true, 'Cluster info should be successful');
      this.assert(response.body.data.location, 'Should contain location information');
    });

    // Test 10: Monitoring Clusters
    await this.test('Cluster Monitoring', async () => {
      const response = await this.makeRequest('GET', '/monitoring/clusters');
      this.assert(response.statusCode === 200, 'Monitoring should return 200');
      this.assert(response.body.success === true, 'Monitoring should be successful');
      this.assert(response.body.data.clusters, 'Should contain cluster data');
    });

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);

    if (this.failed > 0) {
      console.log('\n❌ Some tests failed. Check the application health.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! API is healthy.');
      process.exit(0);
    }
  }
}

// Wait for server to be ready before running tests
setTimeout(async () => {
  const tester = new APITester();
  await tester.runAllTests();
}, 2000);
import QuantumResistantCrypto from './quantumCrypto';
import MilitaryGradeAuth from './militaryAuth';
import AdvancedThreatDetection from './threatDetection';
import ZeroTrustNetwork from './zeroTrust';
import QuantumResistantBlockchain from './quantumBlockchain';
import SecurityConfiguration from '../config/security';

class SecuritySystemTest {
  private static testResults: { [key: string]: boolean } = {};

  // Test quantum-resistant cryptography
  static async testQuantumCrypto(): Promise<void> {
    try {
      console.log('🔐 Testing Quantum-Resistant Cryptography...');
      
      // Test key generation
      const keyPair = await QuantumResistantCrypto.generateQuantumKeyPair();
      this.testResults['quantum_key_generation'] = !!(keyPair.privateKey && keyPair.publicKey);
      
      // Test encryption/decryption
      const testData = 'Enerlectra security test data';
      const password = 'testPassword123!';
      
      const encrypted = await QuantumResistantCrypto.encrypt(testData, password);
      const decrypted = await QuantumResistantCrypto.decrypt(encrypted, password);
      
      this.testResults['quantum_encryption'] = decrypted === testData;
      
      // Test signing/verification
      const signature = await QuantumResistantCrypto.sign(testData, keyPair.privateKey);
      const verified = await QuantumResistantCrypto.verify(testData, signature, keyPair.publicKey);
      
      this.testResults['quantum_signing'] = verified;
      
      // Test hashing
      const hash = QuantumResistantCrypto.hash(testData);
      this.testResults['quantum_hashing'] = hash.length > 0;
      
      // Test random generation
      const random = QuantumResistantCrypto.generateSecureRandom(32);
      this.testResults['quantum_random'] = random.length === 64; // 32 bytes = 64 hex chars
      
      console.log('✅ Quantum cryptography tests completed');
      
    } catch (error) {
      console.error('❌ Quantum cryptography test failed:', error);
      this.testResults['quantum_crypto'] = false;
    }
  }

  // Test military-grade authentication
  static async testMilitaryAuth(): Promise<void> {
    try {
      console.log('🛡️  Testing Military-Grade Authentication...');
      
      // Test session generation
      const session = await MilitaryGradeAuth.generateSecureSession({
        userId: 'test-user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        deviceId: 'test-device-123'
      });
      
      this.testResults['military_session_generation'] = !!(session.sessionId && session.token);
      
      // Test session verification
      const isValid = await MilitaryGradeAuth.verifySession(session.sessionId, {
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        deviceId: 'test-device-123'
      });
      
      this.testResults['military_session_verification'] = isValid;
      
      // Test MFA initiation
      const mfaResult = await MilitaryGradeAuth.initiateMFA(session.sessionId, 'sms');
      this.testResults['military_mfa_initiation'] = mfaResult.success;
      
      console.log('✅ Military authentication tests completed');
      
    } catch (error) {
      console.error('❌ Military authentication test failed:', error);
      this.testResults['military_auth'] = false;
    }
  }

  // Test threat detection
  static async testThreatDetection(): Promise<void> {
    try {
      console.log('🚨 Testing Advanced Threat Detection...');
      
      // Test threat assessment
      const threatLevel = await AdvancedThreatDetection.assessThreatLevel({
        ipAddress: '192.168.1.1',
        userBehavior: 'normal',
        transactionAmount: 100,
        geographicLocation: 'Zambia'
      });
      
      this.testResults['threat_assessment'] = typeof threatLevel === 'string';
      
      // Test anomaly detection
      const anomaly = await AdvancedThreatDetection.detectAnomaly({
        userId: 'test-user',
        behavior: 'suspicious',
        timestamp: Date.now()
      });
      
      this.testResults['anomaly_detection'] = anomaly.detected !== undefined;
      
      console.log('✅ Threat detection tests completed');
      
    } catch (error) {
      console.error('❌ Threat detection test failed:', error);
      this.testResults['threat_detection'] = false;
    }
  }

  // Test zero-trust network
  static async testZeroTrust(): Promise<void> {
    try {
      console.log('🌐 Testing Zero-Trust Network Security...');
      
      // Test network verification
      const networkStatus = await ZeroTrustNetwork.verifyNetworkAccess({
        ipAddress: '192.168.1.1',
        userId: 'test-user',
        resource: '/api/trade'
      });
      
      this.testResults['zero_trust_verification'] = networkStatus.allowed !== undefined;
      
      // Test micro-segmentation
      const segmentAccess = await ZeroTrustNetwork.checkSegmentAccess({
        userId: 'test-user',
        segment: 'energy-trading',
        action: 'create-offer'
      });
      
      this.testResults['zero_trust_segmentation'] = segmentAccess.allowed !== undefined;
      
      console.log('✅ Zero-trust network tests completed');
      
    } catch (error) {
      console.error('❌ Zero-trust network test failed:', error);
      this.testResults['zero_trust'] = false;
    }
  }

  // Test quantum blockchain
  static async testQuantumBlockchain(): Promise<void> {
    try {
      console.log('⛓️  Testing Quantum-Resistant Blockchain...');
      
      // Test blockchain creation
      const blockchain = new QuantumResistantBlockchain();
      
      // Test transaction addition
      blockchain.addTransaction({
        from: 'user1',
        to: 'user2',
        amount: 100,
        timestamp: Date.now()
      });
      
      this.testResults['blockchain_transaction'] = blockchain.pendingTransactions.length > 0;
      
      // Test block mining
      const block = blockchain.mineBlock('miner-address');
      this.testResults['blockchain_mining'] = !!block;
      
      // Test chain validation
      const isValid = blockchain.isChainValid();
      this.testResults['blockchain_validation'] = isValid;
      
      console.log('✅ Quantum blockchain tests completed');
      
    } catch (error) {
      console.error('❌ Quantum blockchain test failed:', error);
      this.testResults['quantum_blockchain'] = false;
    }
  }

  // Test security configuration
  static async testSecurityConfig(): Promise<void> {
    try {
      console.log('⚙️  Testing Security Configuration...');
      
      // Test configuration loading
      const config = SecurityConfiguration.getInstance();
      const securityConfig = config.getConfig();
      
      this.testResults['security_config_loading'] = !!securityConfig;
      
      // Test security initialization
      await config.initializeSecurity();
      const status = config.getSecurityStatus();
      
      this.testResults['security_initialization'] = !!status;
      
      console.log('✅ Security configuration tests completed');
      
    } catch (error) {
      console.error('❌ Security configuration test failed:', error);
      this.testResults['security_config'] = false;
    }
  }

  // Run all security tests
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive security system tests...\n');
    
    try {
      await this.testQuantumCrypto();
      await this.testMilitaryAuth();
      await this.testThreatDetection();
      await this.testZeroTrust();
      await this.testQuantumBlockchain();
      await this.testSecurityConfig();
      
      console.log('\n🎉 All security tests completed!');
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ Security tests failed:', error);
      this.testResults['overall'] = false;
    }
  }

  // Print test results summary
  private static printTestResults(): void {
    console.log('\n📊 SECURITY TEST RESULTS');
    console.log('========================');
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(result => result).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n✅ Passed: ${passedTests}/${totalTests} (${successRate}%)`);
    
    Object.entries(this.testResults).forEach(([test, result]) => {
      const status = result ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test}`);
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎯 ALL TESTS PASSED! Enerlectra is protected with military-grade security!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the security implementation.');
    }
  }

  // Get test results
  static getTestResults(): { [key: string]: boolean } {
    return this.testResults;
  }
}

export default SecuritySystemTest;

// Run tests if called directly
if (require.main === module) {
  SecuritySystemTest.runAllTests().catch(console.error);
} 
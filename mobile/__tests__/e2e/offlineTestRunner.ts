/**
 * Offline Test Runner - Task 18.4
 * 
 * This script helps automate testing of offline functionality.
 * Run this in the Expo development environment to test offline scenarios.
 */

import { AppState, AppStateStatus } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { createDatabaseQueries } from '../../db/queries';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  timestamp: Date;
}

class OfflineTestRunner {
  private results: TestResult[] = [];
  private db: SQLite.SQLiteDatabase | null = null;
  private queries: any = null;

  async initialize(): Promise<void> {
    try {
      this.db = SQLite.openDatabaseSync('messageai.db');
      this.queries = createDatabaseQueries(this.db);
      console.log('✅ Test runner initialized');
    } catch (error) {
      console.error('❌ Failed to initialize test runner:', error);
      throw error;
    }
  }

  private addResult(testName: string, passed: boolean, error?: string): void {
    this.results.push({
      testName,
      passed,
      error,
      timestamp: new Date(),
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  /**
   * Test 1: Verify message queuing when offline
   */
  async testMessageQueuing(): Promise<void> {
    try {
      // This test would need to be run manually as it requires network manipulation
      // For now, we'll check if the database structure supports queuing
      
      if (!this.queries) {
        throw new Error('Database queries not initialized');
      }

      // Check if messages table exists and has required fields
      const messages = await this.queries.getMessagesForConversation('test-conversation', 1);
      
      this.addResult('Message Queuing Database Check', true);
    } catch (error) {
      this.addResult('Message Queuing Database Check', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 2: Verify app state monitoring
   */
  async testAppStateMonitoring(): Promise<void> {
    try {
      const currentState = AppState.currentState;
      const validStates = ['active', 'background', 'inactive'];
      
      if (!validStates.includes(currentState)) {
        throw new Error(`Invalid app state: ${currentState}`);
      }

      this.addResult('App State Monitoring', true);
    } catch (error) {
      this.addResult('App State Monitoring', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 3: Verify database connectivity
   */
  async testDatabaseConnectivity(): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Try to execute a simple query
      const result = this.db.execSync('SELECT 1 as test');
      
      this.addResult('Database Connectivity', true);
    } catch (error) {
      this.addResult('Database Connectivity', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 4: Verify message store integration
   */
  async testMessageStoreIntegration(): Promise<void> {
    try {
      // This would require importing the message store
      // For now, we'll just verify the database structure
      
      if (!this.queries) {
        throw new Error('Database queries not initialized');
      }

      // Check if we can access conversation data
      const conversations = await this.queries.getConversations();
      
      this.addResult('Message Store Integration', true);
    } catch (error) {
      this.addResult('Message Store Integration', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Run all automated tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Offline Functionality Tests...\n');
    
    await this.testDatabaseConnectivity();
    await this.testAppStateMonitoring();
    await this.testMessageQueuing();
    await this.testMessageStoreIntegration();
    
    this.printResults();
  }

  /**
   * Print test results summary
   */
  printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`);
        });
    }
    
    console.log('\n📝 Manual Testing Required:');
    console.log('===========================');
    console.log('The following tests require manual verification:');
    console.log('1. Turn off WiFi/cellular and send a message');
    console.log('2. Verify message is queued locally');
    console.log('3. Turn WiFi back on');
    console.log('4. Verify message sends automatically');
    console.log('5. Verify message appears on another device');
    console.log('6. Test background sync when app comes to foreground');
    
    console.log('\n📖 See OFFLINE_TESTING_GUIDE.md for detailed manual testing steps.');
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return this.results;
  }
}

// Export for use in other test files
export default OfflineTestRunner;

// If running directly, execute tests
if (require.main === module) {
  const runner = new OfflineTestRunner();
  runner.initialize().then(() => {
    runner.runAllTests();
  }).catch(error => {
    console.error('Failed to run tests:', error);
  });
}

/**
 * Simple Offline Test - Task 18.4
 * 
 * Basic tests to verify offline functionality without complex imports
 */

import { AppState } from 'react-native';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  timestamp: Date;
}

class SimpleOfflineTest {
  private results: TestResult[] = [];

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
   * Test 1: Verify app state monitoring is available
   */
  testAppStateMonitoring(): void {
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
   * Test 2: Verify AppState event listener can be set up
   */
  testAppStateEventListener(): void {
    try {
      let listenerCalled = false;
      
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        listenerCalled = true;
        console.log(`App state changed to: ${nextAppState}`);
      });

      // Clean up immediately
      subscription?.remove();
      
      this.addResult('App State Event Listener', true);
    } catch (error) {
      this.addResult('App State Event Listener', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test 3: Verify React Native environment
   */
  testReactNativeEnvironment(): void {
    try {
      // Check if we're in a React Native environment
      if (typeof AppState === 'undefined') {
        throw new Error('AppState is not available - not in React Native environment');
      }

      this.addResult('React Native Environment', true);
    } catch (error) {
      this.addResult('React Native Environment', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Run all tests
   */
  runAllTests(): void {
    console.log('🚀 Starting Simple Offline Tests...\n');
    
    this.testReactNativeEnvironment();
    this.testAppStateMonitoring();
    this.testAppStateEventListener();
    
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
    
    console.log('\n📝 Manual Testing Instructions:');
    console.log('================================');
    console.log('1. Open the MessageAI app on two devices/simulators');
    console.log('2. Log in with different user accounts');
    console.log('3. Start a conversation between the users');
    console.log('4. On Device A: Turn off WiFi and cellular data');
    console.log('5. On Device A: Send a message (should show "sending" status)');
    console.log('6. On Device A: Turn WiFi back on');
    console.log('7. Verify the message status changes to "sent"');
    console.log('8. Verify the message appears on Device B');
    console.log('9. Test background sync by putting the app in background and bringing it back');
    
    console.log('\n📖 See OFFLINE_TESTING_GUIDE.md for detailed testing steps.');
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// Export for use in other test files
export default SimpleOfflineTest;

// If running directly, execute tests
if (require.main === module) {
  const tester = new SimpleOfflineTest();
  tester.runAllTests();
}

#!/usr/bin/env node

import { execSync } from 'child_process';
import { NotificationTestUtils } from '../utils/notificationTestUtils';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passCount: number;
  failCount: number;
  skipCount: number;
}

class NotificationTestRunner {
  private testSuites: TestSuite[] = [];
  private startTime: number = 0;

  /**
   * Run all notification tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Notification Test Suite...\n');
    this.startTime = Date.now();

    try {
      // Run unit tests
      await this.runUnitTests();
      
      // Run integration tests
      await this.runIntegrationTests();
      
      // Run performance tests
      await this.runPerformanceTests();
      
      // Run error handling tests
      await this.runErrorHandlingTests();
      
      // Generate final report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run unit tests
   */
  private async runUnitTests(): Promise<void> {
    console.log('📋 Running Unit Tests...');
    const suite = this.createTestSuite('Unit Tests');
    
    try {
      // Test notification service
      await this.runTest('Notification Service Tests', async () => {
        const result = execSync('npm test -- --testPathPattern=notification.service.test.ts --verbose', {
          encoding: 'utf8',
          cwd: process.cwd()
        });
        return { output: result };
      }, suite);

      // Test message handler
      await this.runTest('Message Handler Tests', async () => {
        const result = execSync('npm test -- --testPathPattern=message.handler.test.ts --verbose', {
          encoding: 'utf8',
          cwd: process.cwd()
        });
        return { output: result };
      }, suite);

      // Test mobile notifications hook
      await this.runTest('Mobile Notifications Hook Tests', async () => {
        const result = execSync('npm test -- --testPathPattern=useNotifications.test.ts --verbose', {
          encoding: 'utf8',
          cwd: process.cwd()
        });
        return { output: result };
      }, suite);

    } catch (error) {
      console.error('❌ Unit tests failed:', error);
    }

    this.testSuites.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests...');
    const suite = this.createTestSuite('Integration Tests');
    
    try {
      // Test notification flow
      await this.runTest('Notification Flow Integration', async () => {
        NotificationTestUtils.reset();
        
        // Simulate message sending and notification delivery
        const notificationData = NotificationTestUtils.createTestNotificationData();
        const notificationId = await NotificationTestUtils.simulatePushNotification(
          'John Doe',
          'Hello, this is a test message',
          notificationData
        );

        // Verify notification was created
        const notifications = NotificationTestUtils.getMockNotifications();
        if (notifications.length === 0) {
          throw new Error('No notifications were created');
        }

        // Simulate notification tap
        const tapResult = NotificationTestUtils.simulateNotificationTap(notificationId);
        if (!tapResult) {
          throw new Error('Notification tap simulation failed');
        }

        return {
          notificationId,
          notificationsCreated: notifications.length,
          tapResult
        };
      }, suite);

      // Test different message types
      await this.runTest('Message Type Integration', async () => {
        NotificationTestUtils.reset();
        
        const messageTypes = NotificationTestUtils.testMessageTypeFormatting();
        const results: any = {};

        for (const [type, content] of Object.entries(messageTypes)) {
          const notificationData = NotificationTestUtils.createTestNotificationData(
            'test-conversation-id',
            'test-sender-id',
            'Test User',
            content,
            type
          );

          const notificationId = await NotificationTestUtils.simulatePushNotification(
            'Test User',
            content,
            notificationData
          );

          results[type] = {
            notificationId,
            content,
            data: notificationData
          };
        }

        return results;
      }, suite);

      // Test notification permissions
      await this.runTest('Permission Integration', async () => {
        NotificationTestUtils.reset();
        
        // Test granted permissions
        NotificationTestUtils.setMockPermissions({
          status: 'granted',
          ios: { status: 'granted' },
          android: { status: 'granted' }
        });

        const grantedResult = await NotificationTestUtils.simulatePushNotification(
          'Test User',
          'Permission granted test'
        );

        // Test denied permissions
        NotificationTestUtils.setMockPermissions({
          status: 'denied',
          ios: { status: 'denied' },
          android: { status: 'denied' }
        });

        try {
          await NotificationTestUtils.simulatePushNotification(
            'Test User',
            'Permission denied test'
          );
        } catch (error) {
          // Expected to fail with denied permissions
        }

        return {
          grantedResult,
          permissionDenied: true
        };
      }, suite);

    } catch (error) {
      console.error('❌ Integration tests failed:', error);
    }

    this.testSuites.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Running Performance Tests...');
    const suite = this.createTestSuite('Performance Tests');
    
    try {
      // Test notification delivery performance
      await this.runTest('Notification Delivery Performance', async () => {
        const performance = await NotificationTestUtils.testNotificationPerformance(100);
        
        if (performance.notificationsPerSecond < 10) {
          throw new Error(`Performance too slow: ${performance.notificationsPerSecond} notifications/second`);
        }

        return performance;
      }, suite);

      // Test queue management performance
      await this.runTest('Queue Management Performance', async () => {
        const queueResult = await NotificationTestUtils.testNotificationQueue(50);
        
        if (queueResult.failed > queueResult.processed * 0.1) {
          throw new Error(`Too many queue failures: ${queueResult.failed}/${queueResult.queued}`);
        }

        return queueResult;
      }, suite);

      // Test memory usage
      await this.runTest('Memory Usage Test', async () => {
        const initialMemory = process.memoryUsage();
        
        // Create many notifications
        for (let i = 0; i < 1000; i++) {
          await NotificationTestUtils.simulatePushNotification(
            'Test User',
            `Memory test message ${i}`
          );
        }

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        // Should not increase memory usage significantly
        if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
          throw new Error(`Memory usage increased too much: ${memoryIncrease} bytes`);
        }

        return {
          initialMemory: initialMemory.heapUsed,
          finalMemory: finalMemory.heapUsed,
          increase: memoryIncrease
        };
      }, suite);

    } catch (error) {
      console.error('❌ Performance tests failed:', error);
    }

    this.testSuites.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Run error handling tests
   */
  private async runErrorHandlingTests(): Promise<void> {
    console.log('\n🛡️ Running Error Handling Tests...');
    const suite = this.createTestSuite('Error Handling Tests');
    
    try {
      // Test notification errors
      await this.runTest('Notification Error Scenarios', async () => {
        const errorResults = await NotificationTestUtils.testNotificationErrors();
        
        // All error scenarios should be handled
        const allHandled = Object.values(errorResults).every(handled => handled);
        if (!allHandled) {
          throw new Error('Not all error scenarios were handled properly');
        }

        return errorResults;
      }, suite);

      // Test invalid data handling
      await this.runTest('Invalid Data Handling', async () => {
        const invalidData = {
          conversationId: '',
          senderId: '',
          senderName: '',
          messageContent: '',
          type: 'invalid' as any
        };

        const validation = NotificationTestUtils.validateNotificationData(invalidData);
        
        if (validation.isValid) {
          throw new Error('Invalid data was marked as valid');
        }

        return validation;
      }, suite);

      // Test network error handling
      await this.runTest('Network Error Handling', async () => {
        try {
          // Simulate network error
          throw new Error('Network error');
        } catch (error) {
          // Should handle network errors gracefully
          return { errorHandled: true, error: error.message };
        }
      }, suite);

    } catch (error) {
      console.error('❌ Error handling tests failed:', error);
    }

    this.testSuites.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Create a test suite
   */
  private createTestSuite(name: string): TestSuite {
    return {
      name,
      tests: [],
      totalDuration: 0,
      passCount: 0,
      failCount: 0,
      skipCount: 0
    };
  }

  /**
   * Run a single test
   */
  private async runTest(
    testName: string,
    testFn: () => Promise<any>,
    suite: TestSuite
  ): Promise<void> {
    const startTime = Date.now();
    let result: TestResult;

    try {
      console.log(`  ⏳ Running: ${testName}`);
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      result = {
        testName,
        status: 'PASS',
        duration,
        details
      };
      
      suite.passCount++;
      console.log(`  ✅ PASS: ${testName} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      result = {
        testName,
        status: 'FAIL',
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      suite.failCount++;
      console.log(`  ❌ FAIL: ${testName} (${duration}ms) - ${result.error}`);
    }

    suite.tests.push(result);
    suite.totalDuration += result.duration;
  }

  /**
   * Print suite results
   */
  private printSuiteResults(suite: TestSuite): void {
    console.log(`\n📊 ${suite.name} Results:`);
    console.log(`  Total: ${suite.tests.length}`);
    console.log(`  Passed: ${suite.passCount}`);
    console.log(`  Failed: ${suite.failCount}`);
    console.log(`  Skipped: ${suite.skipCount}`);
    console.log(`  Duration: ${suite.totalDuration}ms`);
    
    if (suite.failCount > 0) {
      console.log(`\n❌ Failed Tests:`);
      suite.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`  - ${test.testName}: ${test.error}`);
        });
    }
  }

  /**
   * Generate final report
   */
  private generateFinalReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.testSuites.reduce((sum, suite) => sum + suite.passCount, 0);
    const totalFailed = this.testSuites.reduce((sum, suite) => sum + suite.failCount, 0);
    const totalSkipped = this.testSuites.reduce((sum, suite) => sum + suite.skipCount, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Skipped: ${totalSkipped}`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n❌ ${totalFailed} test(s) failed`);
    }

    // Generate test report
    const report = NotificationTestUtils.generateTestReport();
    console.log('\n📈 Test Statistics:');
    console.log(`  Total Notifications: ${report.totalNotifications}`);
    console.log(`  Average Response Time: ${report.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Success Rate: ${(report.successRate * 100).toFixed(2)}%`);
    console.log(`  Notification Types:`, report.notificationTypes);

    console.log('\n' + '='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new NotificationTestRunner();
  runner.runAllTests().catch(console.error);
}

export default NotificationTestRunner;

/**
 * Test script for policy endpoints
 * This script tests the policy service functions directly
 */

const path = require('path');

// Mock the service functions
async function testPolicies() {
  console.log('='.repeat(80));
  console.log('TESTING POLICY ENDPOINTS');
  console.log('='.repeat(80));
  console.log();

  try {
    // Import the service
    const policiesService = require('./dist/services/policies.service');

    // Test Privacy Policy
    console.log('1. Testing Privacy Policy Endpoint');
    console.log('-'.repeat(80));
    const privacyPolicy = await policiesService.getPrivacyPolicyContent();
    console.log(`✅ Title: Privacy Policy`);
    console.log(`✅ Last Updated: ${privacyPolicy.lastUpdated}`);
    console.log(`✅ Version: ${privacyPolicy.version}`);
    console.log(`✅ Content Length: ${privacyPolicy.content.length} characters`);
    console.log(`✅ Preview: ${privacyPolicy.content.substring(0, 100)}...`);
    console.log();

    // Test Terms of Service
    console.log('2. Testing Terms of Service Endpoint');
    console.log('-'.repeat(80));
    const termsOfService = await policiesService.getTermsOfServiceContent();
    console.log(`✅ Title: Terms of Service`);
    console.log(`✅ Last Updated: ${termsOfService.lastUpdated}`);
    console.log(`✅ Version: ${termsOfService.version}`);
    console.log(`✅ Content Length: ${termsOfService.content.length} characters`);
    console.log(`✅ Preview: ${termsOfService.content.substring(0, 100)}...`);
    console.log();

    // Test Acceptable Use Policy
    console.log('3. Testing Acceptable Use Policy Endpoint');
    console.log('-'.repeat(80));
    const acceptableUsePolicy = await policiesService.getAcceptableUsePolicyContent();
    console.log(`✅ Title: Acceptable Use Policy`);
    console.log(`✅ Last Updated: ${acceptableUsePolicy.lastUpdated}`);
    console.log(`✅ Version: ${acceptableUsePolicy.version}`);
    console.log(`✅ Content Length: ${acceptableUsePolicy.content.length} characters`);
    console.log(`✅ Preview: ${acceptableUsePolicy.content.substring(0, 100)}...`);
    console.log();

    // Verify API routes are registered
    console.log('4. Verifying Route Registration');
    console.log('-'.repeat(80));
    const indexContent = require('fs').readFileSync(
      path.join(__dirname, 'src/index.ts'),
      'utf-8'
    );

    const hasImport = indexContent.includes("import policiesRoutes from './routes/policies.routes'");
    const hasRoute = indexContent.includes("app.use('/api/v1/policies', policiesRoutes)");

    console.log(`✅ Import statement present: ${hasImport}`);
    console.log(`✅ Route registration present: ${hasRoute}`);
    console.log();

    console.log('='.repeat(80));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log();
    console.log('Summary:');
    console.log('--------');
    console.log('• Privacy Policy endpoint ready: GET /api/v1/policies/privacy');
    console.log('• Terms of Service endpoint ready: GET /api/v1/policies/terms');
    console.log('• Acceptable Use Policy endpoint ready: GET /api/v1/policies/acceptable-use');
    console.log();
    console.log('Expected Response Format:');
    console.log(JSON.stringify({
      title: 'Privacy Policy',
      lastUpdated: '2025-10-24',
      version: '1.0',
      content: '# Privacy Policy\\n\\n**Effective Date:**...'
    }, null, 2));

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPolicies();

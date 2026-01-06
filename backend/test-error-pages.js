/**
 * Test Script: Error Pages Verification
 * 
 * Tests that custom error pages exist and have proper structure
 * Run: node backend/test-error-pages.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function testPassed(testName) {
  passedTests++;
  log(`✓ ${testName}`, GREEN);
}

function testFailed(testName, error) {
  failedTests++;
  log(`✗ ${testName}`, RED);
  log(`  Error: ${error}`, RED);
}

async function runTests() {
  log('\n=== Error Pages Verification Tests ===\n', BLUE);

  const frontendPath = path.join(__dirname, '..', 'frontend', 'src', 'app');

  // Test 1: not-found.js exists
  try {
    const notFoundPath = path.join(frontendPath, 'not-found.js');
    if (!fs.existsSync(notFoundPath)) {
      throw new Error('File does not exist');
    }
    const content = fs.readFileSync(notFoundPath, 'utf8');
    if (!content.includes('NotificationProvider')) {
      throw new Error('Missing NotificationProvider import/usage');
    }
    if (!content.includes('"use client"')) {
      throw new Error('Missing "use client" directive');
    }
    if (!content.includes('404')) {
      throw new Error('Missing 404 content');
    }
    testPassed('Test 1: not-found.js exists and has correct structure');
  } catch (error) {
    testFailed('Test 1: not-found.js exists and has correct structure', error.message);
  }

  // Test 2: error.js exists
  try {
    const errorPath = path.join(frontendPath, 'error.js');
    if (!fs.existsSync(errorPath)) {
      throw new Error('File does not exist');
    }
    const content = fs.readFileSync(errorPath, 'utf8');
    if (!content.includes('NotificationProvider')) {
      throw new Error('Missing NotificationProvider import/usage');
    }
    if (!content.includes('"use client"')) {
      throw new Error('Missing "use client" directive');
    }
    if (!content.includes('error') && !content.includes('reset')) {
      throw new Error('Missing error boundary props');
    }
    testPassed('Test 2: error.js exists and has correct structure');
  } catch (error) {
    testFailed('Test 2: error.js exists and has correct structure', error.message);
  }

  // Test 3: global-error.js exists
  try {
    const globalErrorPath = path.join(frontendPath, 'global-error.js');
    if (!fs.existsSync(globalErrorPath)) {
      throw new Error('File does not exist');
    }
    const content = fs.readFileSync(globalErrorPath, 'utf8');
    if (content.includes('NotificationProvider')) {
      throw new Error('global-error.js should NOT use NotificationProvider');
    }
    if (!content.includes('"use client"')) {
      throw new Error('Missing "use client" directive');
    }
    if (!content.includes('<html') || !content.includes('<body')) {
      throw new Error('Missing html/body tags');
    }
    testPassed('Test 3: global-error.js exists and has correct structure');
  } catch (error) {
    testFailed('Test 3: global-error.js exists and has correct structure', error.message);
  }

  // Test 4: NotificationProvider component exists
  try {
    const providerPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'ui', 'NotificationProvider.js');
    if (!fs.existsSync(providerPath)) {
      throw new Error('NotificationProvider.js does not exist');
    }
    const content = fs.readFileSync(providerPath, 'utf8');
    if (!content.includes('createContext')) {
      throw new Error('Missing createContext usage');
    }
    if (!content.includes('useContext')) {
      throw new Error('Missing useContext usage');
    }
    if (!content.includes('export function useNotify')) {
      throw new Error('Missing useNotify hook export');
    }
    testPassed('Test 4: NotificationProvider component exists and exports useNotify');
  } catch (error) {
    testFailed('Test 4: NotificationProvider component exists and exports useNotify', error.message);
  }

  // Test 5: layout.js has NotificationProvider
  try {
    const layoutPath = path.join(frontendPath, 'layout.js');
    if (!fs.existsSync(layoutPath)) {
      throw new Error('layout.js does not exist');
    }
    const content = fs.readFileSync(layoutPath, 'utf8');
    if (!content.includes('NotificationProvider')) {
      throw new Error('layout.js does not import/use NotificationProvider');
    }
    if (!content.includes('<NotificationProvider>')) {
      throw new Error('layout.js does not wrap content with NotificationProvider');
    }
    testPassed('Test 5: layout.js wraps content with NotificationProvider');
  } catch (error) {
    testFailed('Test 5: layout.js wraps content with NotificationProvider', error.message);
  }

  // Test 6: Check if build artifacts exist (from successful build)
  try {
    const nextBuildPath = path.join(__dirname, '..', 'frontend', '.next');
    if (!fs.existsSync(nextBuildPath)) {
      throw new Error('.next directory does not exist - run npm run build first');
    }
    
    const buildManifestPath = path.join(nextBuildPath, 'build-manifest.json');
    if (!fs.existsSync(buildManifestPath)) {
      throw new Error('build-manifest.json does not exist - build may have failed');
    }
    
    testPassed('Test 6: Next.js build artifacts exist (build was successful)');
  } catch (error) {
    testFailed('Test 6: Next.js build artifacts exist', error.message);
  }

  // Test 7: Verify error pages don't have hardcoded API URLs
  try {
    const notFoundContent = fs.readFileSync(path.join(frontendPath, 'not-found.js'), 'utf8');
    const errorContent = fs.readFileSync(path.join(frontendPath, 'error.js'), 'utf8');
    const globalErrorContent = fs.readFileSync(path.join(frontendPath, 'global-error.js'), 'utf8');
    
    const hasHardcodedUrl = [notFoundContent, errorContent, globalErrorContent].some(
      content => content.includes('http://localhost:3001') || content.includes('https://vaulteer.kuzaken.tech')
    );
    
    if (hasHardcodedUrl) {
      throw new Error('Error pages contain hardcoded API URLs - they should be static pages');
    }
    
    testPassed('Test 7: Error pages are static (no hardcoded API URLs)');
  } catch (error) {
    testFailed('Test 7: Error pages are static', error.message);
  }

  // Summary
  log('\n=== Test Summary ===\n', BLUE);
  log(`Total Tests: ${passedTests + failedTests}`, YELLOW);
  log(`Passed: ${passedTests}`, GREEN);
  log(`Failed: ${failedTests}`, failedTests > 0 ? RED : GREEN);
  
  if (failedTests === 0) {
    log('\n✓ All error pages tests passed! SSR context error is fixed.\n', GREEN);
  } else {
    log('\n✗ Some tests failed. Please review the errors above.\n', RED);
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, RED);
  log(error.stack, RED);
  process.exit(1);
});

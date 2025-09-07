
import { promises as fs } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import path from 'path';
import './setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// Global test function
global.test = async function(description, testFn) {
    try {
        await testFn();
        testResults.passed++;
        console.log(`${colors.green}✓${colors.reset} ${description}`);
    } catch (error) {
        testResults.failed++;
        console.log(`${colors.red}✗${colors.reset} ${description}`);
        console.log(`  ${colors.red}${error.message}${colors.reset}`);
        testResults.errors.push({ test: description, error });
    }
};

// Run all test files
async function runTests() {
    const testDir = __dirname;
    const files = await fs.readdir(testDir);
    const testFiles = files.filter(f => f.endsWith('.test.js'));
    
    console.log(`Running ${testFiles.length} test files...\n`);
    
    for (const file of testFiles) {
        console.log(`${colors.yellow}${file}:${colors.reset}`);
        const filePath = path.join(testDir, file);
        await import(pathToFileURL(filePath).href);
        console.log('');
    }
    
    // Print summary
    console.log('='.repeat(50));
    console.log(`Tests: ${colors.green}${testResults.passed} passed${colors.reset}, ${colors.red}${testResults.failed} failed${colors.reset}, ${testResults.passed + testResults.failed} total`);
    
    // Exit with error code if tests failed
    if (testResults.failed > 0) {
        process.exit(1);
    }
}

await runTests().catch(console.error);

const fs = require('fs');
const path = require('path');

// Paths
const testResultsDir = 'ordino-report';
const mochaDir = path.join(testResultsDir, 'mochawesome');
const reportDir = path.join(testResultsDir, 'mochawesome-report');

// Configuration for test code extraction
const CODE_EXTRACTION_CONFIG = {
  // Common test patterns to include (can be customized)
  includePatterns: [
    '.',           // Method calls (page.method())
    '(',           // Function calls
    'expect',      // Assertions
    'assert',      // Assertions
    'should',      // Assertions
    'click',       // Common actions
    'fill',        // Common actions
    'type',        // Common actions
    'navigate',    // Navigation
    'wait',        // Wait statements
    'get',         // Element getters
    'find',        // Element finders
    'select',      // Element selectors
    'check',       // Checkbox actions
    'verify',      // Verification
    'validate'     // Validation
  ],
  // Patterns to exclude (can be customized)
  excludePatterns: [
    'import',      // Import statements
    'const',       // Variable declarations (unless they're test steps)
    'let',         // Variable declarations (unless they're test steps)
    'var',         // Variable declarations (unless they're test steps)
    '//',          // Comments
    '/*',          // Block comments
    '*/'           // Block comments
  ]
};

// Ensure directories exist
[testResultsDir, mochaDir, reportDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Read Playwright results
const playwrightResultsPath = path.join(testResultsDir, 'test-results.json');
console.log(`Converting Playwright results to Mochawesome format...`);

if (!fs.existsSync(playwrightResultsPath)) {
  console.error(`ERROR: Playwright results file not found: ${playwrightResultsPath}`);
  console.log('Please run tests first to generate results.');
  process.exit(1);
}

let playwrightResults;
try {
  const data = fs.readFileSync(playwrightResultsPath, 'utf8');
  playwrightResults = JSON.parse(data);
  console.log('✓ Successfully loaded Playwright results');
} catch (error) {
  console.error('Error reading Playwright results:', error.message);
  process.exit(1);
}

// Initialize Mochawesome report structure
const startTime = new Date(playwrightResults.stats?.startTime || Date.now());
const endTime = new Date(startTime.getTime() + (playwrightResults.stats?.duration || 0));
const duration = Math.round(playwrightResults.stats?.duration || 0);

const mochawesomeReport = {
  stats: {
    suites: 0,
    tests: 0,
    passes: 0,
    pending: 0,
    failures: 0,
    testsRegistered: 0,
    passPercent: 0,
    pendingPercent: 0,
    other: 0,
    hasOther: false,
    skipped: 0,
    hasSkipped: false,
    start: startTime.toISOString(),
    end: endTime.toISOString(),
    duration: duration
  },
  results: []
};

// Helper function to generate simple UUID-like string
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to extract test code from source file
function extractTestCode(filePath, startLine, endLine) {
  try {
    // Construct the full path to the test file
    const fullPath = path.join('ordino/e2e', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: Test file not found: ${fullPath}`);
      return `// Test file not found: ${filePath}`;
    }
    
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Find the test function boundaries starting from the given line
    let testStartLine = startLine - 1; // Convert to 0-based index
    let testEndLine = testStartLine;
    
    // Look for the test function start (going backwards if needed)
    while (testStartLine > 0 && !lines[testStartLine].trim().includes('test(')) {
      testStartLine--;
    }
    
    // Find the end of the test function (look for closing brace)
    let braceCount = 0;
    let foundStart = false;
    
    for (let i = testStartLine; i < lines.length; i++) {
      const line = lines[i];
      
      // Count opening and closing braces
      for (let char of line) {
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      // We found the matching closing brace when count returns to 0 after finding the start
      if (foundStart && braceCount === 0) {
        testEndLine = i;
        break;
      }
    }
    
    // Extract the test code (focus on the test body, skip the test declaration line)
    const testLines = [];
    let insideTestBody = false;
    
    for (let i = testStartLine; i <= testEndLine; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//')) continue;
      
      // Start collecting after we find the test function with opening brace
      if (trimmedLine.includes('test(')) {
        // Check if the opening brace is on the same line or next line
        if (trimmedLine.includes('{')) {
          insideTestBody = true;
        } else {
          // Look for opening brace on next lines
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim().includes('{')) {
              insideTestBody = true;
              i = j; // Skip to the brace line
              break;
            }
          }
        }
        continue;
      }
      
      // Skip the final closing brace
      if (trimmedLine === '}' && i === testEndLine) {
        break;
      }
      
      if (insideTestBody) {
        // Clean up the line - remove 'await' and semicolons for cleaner display
        let cleanLine = trimmedLine
          .replace(/^await\s+/, '')
          .replace(/;$/, '');
        
        // Check if line should be excluded first
        const shouldExclude = CODE_EXTRACTION_CONFIG.excludePatterns.some(pattern => 
          cleanLine.includes(pattern)
        );
        
        if (!shouldExclude) {
          // Check if line matches any include patterns
          const shouldInclude = CODE_EXTRACTION_CONFIG.includePatterns.some(pattern => 
            cleanLine.includes(pattern)
          ) || cleanLine.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/); // Variable assignments
          
          if (shouldInclude && cleanLine.length > 0) {
            testLines.push(cleanLine);
          }
        }
      }
    }
    
    // Join the test steps with proper formatting
    if (testLines.length > 0) {
      // Check if we can format as method chain (all lines have the same object)
      const firstLine = testLines[0];
      const objectMatch = firstLine.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\./);
      
      if (objectMatch && testLines.length > 1) {
        const objectName = objectMatch[1];
        // Check if all lines start with the same object
        const allSameObject = testLines.every(line => line.startsWith(objectName + '.'));
        
        if (allSameObject) {
          // Format as method chain with indentation (Cypress style)
          const formattedLines = testLines.map((line, index) => {
            if (index === 0) {
              return line; // First line without indentation
            } else {
              // Extract method call (remove object name)
              const method = line.substring(objectName.length);
              return `    ${method}`; // Add 4 spaces for indentation
            }
          });
          return formattedLines.join('\n');
        } else {
          // Mixed objects (Playwright style) - add semicolons to all lines
          const formattedLines = testLines.map((line, index) => {
            // Add semicolon unless it's the last line (we'll add it separately)
            // or if it already has one
            if (!line.endsWith(';')) {
              return line + ';';
            }
            return line;
          });
          
          return formattedLines.join('\n');
        }
      }
      
      // Default: join with newlines (for non-chainable code)
      const formattedCode = testLines.join('\n');
      return formattedCode;
    } else {
      return `// No test steps found in ${filePath} at line ${startLine}`;
    }
    
  } catch (error) {
    console.warn(`Warning: Could not extract test code from ${filePath}:`, error.message);
    return `// Error reading test file: ${filePath}`;
  }
}

// Process all suites - EXACT STRUCTURE MATCH
if (playwrightResults.suites && playwrightResults.suites.length > 0) {
  playwrightResults.suites.forEach(suite => {
    // Create root suite with empty title (matches your example exactly)
    const fullFilePath = suite.file ? `ordino/e2e/${suite.file}` : '';
    const rootSuite = {
      uuid: generateUUID(),
      title: "", // Empty title as per your example
      fullFile: fullFilePath,
      file: fullFilePath,
      beforeHooks: [],
      afterHooks: [],
      tests: [],
      suites: [],
      passes: [],
      failures: [],
      pending: [],
      skipped: [],
      duration: 0,
      root: true,
      rootEmpty: true,
      _timeout: 2000
    };

    // Process describe blocks directly as immediate suites (NO extra nesting)
    if (suite.suites && suite.suites.length > 0) {
      suite.suites.forEach(describeSuite => {
        // Create suite for describe block - this goes DIRECTLY into root.suites
        const mochaDescribeSuite = {
          uuid: generateUUID(),
          title: describeSuite.title || '', // Just the describe name (e.g., "OrangeHRM Home Dashboard - Test Suite")
          fullFile: "", // Empty as per your example
          file: "", // Empty as per your example
          beforeHooks: [],
          afterHooks: [],
          tests: [],
          suites: [], // This should be empty - no further nesting
          passes: [],
          failures: [],
          pending: [],
          skipped: [],
          duration: 0,
          root: false,
          rootEmpty: false,
          _timeout: 2000
        };

        let suiteDuration = 0;

        // Process individual tests - these go DIRECTLY into describeSuite.tests
        if (describeSuite.specs && describeSuite.specs.length > 0) {
          describeSuite.specs.forEach(spec => {
            spec.tests?.forEach(test => {
              const testResult = test.results?.[0];
              const duration = testResult?.duration || 0;
              suiteDuration += duration;
              
              // Extract actual test code
              const testCode = extractTestCode(describeSuite.file, spec.line, spec.column);
              
              const mochaTest = {
                title: spec.title,
                fullTitle: `${describeSuite.title} ${spec.title}`, // Format: "OrangeHRM Home Dashboard - Test Suite Test - Verify Profile Logout"
                timedOut: null,
                duration: duration,
                state: null,
                speed: null,
                pass: false,
                fail: false,
                pending: false,
                context: null,
                code: testCode,
                err: {},
                uuid: generateUUID(),
                parentUUID: mochaDescribeSuite.uuid,
                isHook: false,
                skipped: false
              };

              mochaDescribeSuite.tests.push(mochaTest);
              mochawesomeReport.stats.tests++;
              mochawesomeReport.stats.testsRegistered++;

              // Set test status
              const status = testResult?.status;
              if (status === 'passed') {
                mochaTest.pass = true;
                mochaTest.state = 'passed';
                if (duration < 5000) {
                  mochaTest.speed = 'fast';
                } else if (duration < 10000) {
                  mochaTest.speed = 'medium';
                } else {
                  mochaTest.speed = 'slow';
                }
                mochaDescribeSuite.passes.push(mochaTest.uuid);
                mochawesomeReport.stats.passes++;
              } else if (status === 'failed' || status === 'unexpected' || status === 'timedOut') {
                mochaTest.fail = true;
                mochaTest.state = 'failed';
                mochaTest.speed = null;
                const errors = testResult.errors || [];
                if (errors.length > 0) {
                  mochaTest.err = {
                    message: errors[0].message || 'Test failed',
                    stack: errors[0].stack || '',
                    diff: ''
                  };
                } else {
                  mochaTest.err = {
                    message: 'Test failed',
                    stack: '',
                    diff: ''
                  };
                }
                mochaDescribeSuite.failures.push(mochaTest.uuid);
                mochawesomeReport.stats.failures++;
              } else if (status === 'skipped') {
                mochaTest.pending = true;
                mochaTest.skipped = true;
                mochaTest.state = 'pending';
                mochaTest.speed = null;
                mochaDescribeSuite.skipped.push(mochaTest.uuid);
                mochaDescribeSuite.pending.push(mochaTest.uuid);
                mochawesomeReport.stats.pending++;
                mochawesomeReport.stats.skipped++;
              } else {
                // Handle any other status as failed
                console.warn(`Unknown test status: ${status}, treating as failed`);
                mochaTest.fail = true;
                mochaTest.state = 'failed';
                mochaTest.speed = null;
                mochaTest.err = {
                  message: `Test status: ${status}`,
                  stack: '',
                  diff: ''
                };
                mochaDescribeSuite.failures.push(mochaTest.uuid);
                mochawesomeReport.stats.failures++;
              }
            });
          });
        }

        mochaDescribeSuite.duration = suiteDuration;
        
        // Add describe suite DIRECTLY to root suite - NO extra nesting levels
        rootSuite.suites.push(mochaDescribeSuite);
        rootSuite.duration += suiteDuration;
      });
    }
    
    mochawesomeReport.results.push(rootSuite);
    mochawesomeReport.stats.suites++;
  });
}

// Update final stats
if (playwrightResults.stats) {
  mochawesomeReport.stats.tests = playwrightResults.stats.expected + playwrightResults.stats.unexpected;
  mochawesomeReport.stats.testsRegistered = mochawesomeReport.stats.tests;
  mochawesomeReport.stats.passes = playwrightResults.stats.expected;
  mochawesomeReport.stats.failures = playwrightResults.stats.unexpected;
  mochawesomeReport.stats.pending = playwrightResults.stats.skipped || 0;
  mochawesomeReport.stats.skipped = playwrightResults.stats.skipped || 0;
}

// Calculate percentages
if (mochawesomeReport.stats.tests > 0) {
  mochawesomeReport.stats.passPercent = Math.round((mochawesomeReport.stats.passes / mochawesomeReport.stats.tests) * 100);
  mochawesomeReport.stats.pendingPercent = Math.round((mochawesomeReport.stats.pending / mochawesomeReport.stats.tests) * 100);
}

mochawesomeReport.stats.hasSkipped = mochawesomeReport.stats.skipped > 0;
mochawesomeReport.stats.hasOther = mochawesomeReport.stats.other > 0;

// Add meta information
mochawesomeReport.meta = {
  mocha: {
    version: "1.56.0"
  },
  mochawesome: {
    options: {
      quiet: false,
      reportFilename: "mochawesome",
      saveHtml: true,
      saveJson: true,
      consoleReporter: "spec",
      useInlineDiffs: false,
      code: true
    },
    version: "7.1.4"
  },
  marge: {
    options: {
      reportDir: "ordino-report/mochawesome-report",
      reportFilename: "mochawesome",
      timestamp: "yyyy-mm-dd-HH-MM",
      overwrite: true,
      html: true,
      json: true
    },
    version: "6.3.0"
  }
};

// Write Mochawesome JSON
const mochawesomeJsonPath = path.join(mochaDir, 'mochawesome.json');
fs.writeFileSync(mochawesomeJsonPath, JSON.stringify(mochawesomeReport, null, 2));
console.log(`✓ Mochawesome JSON created: ${mochawesomeJsonPath}`);

// Generate HTML report
try {
  const { execSync } = require('child_process');
  const htmlOutputPath = path.join(reportDir, 'mochawesome.html');
  
  execSync(`npx mochawesome-report-generator ${mochawesomeJsonPath} --reportDir ${reportDir} --reportFilename mochawesome`, {
    stdio: 'inherit'
  });
  
  console.log(`✓ Mochawesome HTML report generated: ${htmlOutputPath}`);
  console.log(`\nTest Summary:`);
  console.log(`  Total: ${mochawesomeReport.stats.tests}`);
  console.log(`  Passed: ${mochawesomeReport.stats.passes}`);
  console.log(`  Failed: ${mochawesomeReport.stats.failures}`);
  console.log(`  Pending: ${mochawesomeReport.stats.pending}`);
  console.log(`\nOpen the report: ${htmlOutputPath}`);
  
} catch (error) {
  console.error('Error generating HTML report:', error.message);
  console.log('You can manually generate it using: npx mochawesome-report-generator ' + mochawesomeJsonPath);
}

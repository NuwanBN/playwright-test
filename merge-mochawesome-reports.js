#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Mochawesome JSON Report Merger ===');

// Configuration
const reportDir = 'ordino-report/mochawesome';
const outputFile = path.join(reportDir, 'mochawesome-merged.json');

// Check if report directory exists
if (!fs.existsSync(reportDir)) {
  console.error('❌ Report directory does not exist:', reportDir);
  process.exit(1);
}

// Find all mochawesome JSON files (excluding the merged output)
const jsonFiles = [];
const files = fs.readdirSync(reportDir);
files.forEach(file => {
  if (file.endsWith('.json') && file !== 'mochawesome-merged.json') {
    jsonFiles.push(path.join(reportDir, file));
  }
});

console.log(`Found ${jsonFiles.length} JSON files to merge:`, jsonFiles.map(f => path.basename(f)));

if (jsonFiles.length === 0) {
  console.error('❌ No JSON files found to merge');
  process.exit(1);
}

if (jsonFiles.length === 1) {
  console.log('ℹ️ Only one file found, copying as merged report...');
  const singleFile = fs.readFileSync(jsonFiles[0], 'utf8');
  fs.writeFileSync(outputFile, singleFile);
  console.log(`✅ Single report copied to: ${outputFile}`);
  process.exit(0);
}

// Read and parse all JSON files
const reports = [];
jsonFiles.forEach((file, index) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const report = JSON.parse(content);
    reports.push(report);
    console.log(`✅ Loaded report ${index + 1}: ${path.basename(file)}`);
    console.log(`   Tests: ${report.stats?.tests || 0}`);
    console.log(`   Passes: ${report.stats?.passes || 0}`);
    console.log(`   Failures: ${report.stats?.failures || 0}`);
    console.log(`   Suites: ${report.stats?.suites || 0}`);
  } catch (error) {
    console.error(`❌ Error reading ${file}:`, error.message);
  }
});

if (reports.length === 0) {
  console.error('❌ No valid reports loaded');
  process.exit(1);
}

// Initialize merged report with the structure from the first report
const firstReport = reports[0];
const merged = {
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
    start: null,
    end: null,
    duration: 0
  },
  results: [],
  meta: firstReport.meta || {}
};

// Process each report
reports.forEach((report, index) => {
  console.log(`\nProcessing report ${index + 1}:`);
  console.log(`  Tests: ${report.stats?.tests || 0}`);
  console.log(`  Passes: ${report.stats?.passes || 0}`);
  console.log(`  Failures: ${report.stats?.failures || 0}`);
  console.log(`  Suites: ${report.stats?.suites || 0}`);
  
  // Sum basic stats
  merged.stats.suites += report.stats?.suites || 0;
  merged.stats.tests += report.stats?.tests || 0;
  merged.stats.passes += report.stats?.passes || 0;
  merged.stats.pending += report.stats?.pending || 0;
  merged.stats.failures += report.stats?.failures || 0;
  merged.stats.testsRegistered += report.stats?.testsRegistered || 0;
  merged.stats.duration += report.stats?.duration || 0;
  merged.stats.other += report.stats?.other || 0;
  merged.stats.skipped += report.stats?.skipped || 0;
  
  // Update boolean flags
  if (report.stats?.hasOther) merged.stats.hasOther = true;
  if (report.stats?.hasSkipped) merged.stats.hasSkipped = true;
  
  // Set start/end times
  if (report.stats?.start) {
    if (!merged.stats.start || new Date(report.stats.start) < new Date(merged.stats.start)) {
      merged.stats.start = report.stats.start;
    }
  }
  if (report.stats?.end) {
    if (!merged.stats.end || new Date(report.stats.end) > new Date(merged.stats.end)) {
      merged.stats.end = report.stats.end;
    }
  }
  
  // Combine results
  if (report.results && Array.isArray(report.results)) {
    merged.results = merged.results.concat(report.results);
  }
});

// Calculate percentages
if (merged.stats.tests > 0) {
  merged.stats.passPercent = Math.round((merged.stats.passes / merged.stats.tests) * 100);
  merged.stats.pendingPercent = Math.round((merged.stats.pending / merged.stats.tests) * 100);
}

console.log('\n=== Merged Results Summary ===');
console.log(`Total suites: ${merged.stats.suites}`);
console.log(`Total tests: ${merged.stats.tests}`);
console.log(`Total passes: ${merged.stats.passes}`);
console.log(`Total failures: ${merged.stats.failures}`);
console.log(`Total pending: ${merged.stats.pending}`);
console.log(`Total skipped: ${merged.stats.skipped}`);
console.log(`Pass percentage: ${merged.stats.passPercent}%`);
console.log(`Pending percentage: ${merged.stats.pendingPercent}%`);
console.log(`Duration: ${merged.stats.duration}ms`);
console.log(`Start: ${merged.stats.start}`);
console.log(`End: ${merged.stats.end}`);

// Write merged report
try {
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));
  console.log(`\n✅ Merged report written to: ${outputFile}`);
  
  // Verify the output
  const outputSize = fs.statSync(outputFile).size;
  console.log(`📊 Output file size: ${outputSize} bytes`);
  
} catch (error) {
  console.error('❌ Error writing merged report:', error.message);
  process.exit(1);
}

// Show detailed breakdown by suite
console.log('\n=== Test Suite Breakdown ===');
merged.results.forEach((result, index) => {
  if (result.file) {
    console.log(`\n📁 File: ${result.file}`);
  }
  
  if (result.suites && Array.isArray(result.suites)) {
    result.suites.forEach(suite => {
      if (suite.title && suite.tests && suite.tests.length > 0) {
        const passes = suite.passes ? suite.passes.length : 0;
        const failures = suite.failures ? suite.failures.length : 0;
        const pending = suite.pending ? suite.pending.length : 0;
        const skipped = suite.skipped ? suite.skipped.length : 0;
        
        console.log(`  📋 ${suite.title}:`);
        console.log(`     Tests: ${suite.tests.length}, Passes: ${passes}, Failures: ${failures}, Pending: ${pending}, Skipped: ${skipped}`);
        
        // Show individual test results
        suite.tests.forEach(test => {
          const status = test.state === 'passed' ? '✅' : 
                        test.state === 'failed' ? '❌' : 
                        test.pending ? '⏳' : 
                        test.skipped ? '⏭️' : 
                        test.state === null ? '⚠️ ' : '❓';
          const statusText = test.state === null ? ' (null state - needs fixing)' : '';
          console.log(`       ${status} ${test.title} (${test.duration}ms)${statusText}`);
        });
      }
    });
  }
});

console.log('\n✅ Mochawesome report merging completed successfully!');

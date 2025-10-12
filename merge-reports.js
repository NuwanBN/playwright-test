#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== JSON Report Merger ===');

// Configuration
const shardDir = 'ordino-report/mochawesome';
const outputFile = path.join(shardDir, 'mochawesome.json');

// Check if shard directory exists
if (!fs.existsSync(shardDir)) {
  console.error('❌ Shard directory does not exist:', shardDir);
  process.exit(1);
}

// Find all shard files
const shardFiles = [];
const files = fs.readdirSync(shardDir);
files.forEach(file => {
  if (file.startsWith('mochawesome-shard-') && file.endsWith('.json')) {
    shardFiles.push(path.join(shardDir, file));
  }
});

console.log(`Found ${shardFiles.length} shard files:`, shardFiles);

if (shardFiles.length === 0) {
  console.error('❌ No shard files found');
  process.exit(1);
}

// Read and parse all shard files
const reports = [];
shardFiles.forEach((file, index) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const report = JSON.parse(content);
    reports.push(report);
    console.log(`✅ Loaded shard ${index + 1}: ${file}`);
    console.log(`   Tests: ${report.stats?.tests || 0}`);
    console.log(`   Passes: ${report.stats?.passes || 0}`);
    console.log(`   Suites: ${report.stats?.suites || 0}`);
  } catch (error) {
    console.error(`❌ Error reading ${file}:`, error.message);
  }
});

if (reports.length === 0) {
  console.error('❌ No valid reports loaded');
  process.exit(1);
}

// Initialize merged report
const merged = {
  stats: {
    suites: 0,
    tests: 0,
    passes: 0,
    pending: 0,
    failures: 0,
    start: null,
    end: null,
    duration: 0
  },
  results: []
};

// Process each report
reports.forEach((report, index) => {
  console.log(`Processing report ${index + 1}:`);
  console.log(`  Tests: ${report.stats?.tests || 0}`);
  console.log(`  Passes: ${report.stats?.passes || 0}`);
  console.log(`  Suites: ${report.stats?.suites || 0}`);
  
  // Sum stats
  merged.stats.suites += report.stats?.suites || 0;
  merged.stats.tests += report.stats?.tests || 0;
  merged.stats.passes += report.stats?.passes || 0;
  merged.stats.pending += report.stats?.pending || 0;
  merged.stats.failures += report.stats?.failures || 0;
  merged.stats.duration += report.stats?.duration || 0;
  
  // Set start/end times
  if (report.stats?.start) {
    if (!merged.stats.start || report.stats.start < merged.stats.start) {
      merged.stats.start = report.stats.start;
    }
  }
  if (report.stats?.end) {
    if (!merged.stats.end || report.stats.end > merged.stats.end) {
      merged.stats.end = report.stats.end;
    }
  }
  
  // Combine results
  if (report.results && Array.isArray(report.results)) {
    merged.results = merged.results.concat(report.results);
  }
});

console.log('=== Merged Results ===');
console.log(`Total tests: ${merged.stats.tests}`);
console.log(`Total passes: ${merged.stats.passes}`);
console.log(`Total suites: ${merged.stats.suites}`);
console.log(`Total failures: ${merged.stats.failures}`);
console.log(`Total pending: ${merged.stats.pending}`);
console.log(`Duration: ${merged.stats.duration}ms`);
console.log(`Start: ${merged.stats.start}`);
console.log(`End: ${merged.stats.end}`);

// Write merged report
fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));
console.log(`✅ Merged report written to: ${outputFile}`);

// Verify the output
const outputSize = fs.statSync(outputFile).size;
console.log(`📊 Output file size: ${outputSize} bytes`);

// Show detailed breakdown
console.log('=== Detailed Test Breakdown ===');
merged.results.forEach((result, index) => {
  if (result.suites && Array.isArray(result.suites)) {
    result.suites.forEach(suite => {
      if (suite.tests && suite.tests.length > 0) {
        console.log(`  - ${suite.title}: ${suite.tests.length} tests, ${suite.passes?.length || 0} passes, ${suite.failures?.length || 0} failures`);
      }
    });
  }
});

console.log('✅ Report merging completed successfully!');
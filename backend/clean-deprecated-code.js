/**
 * Script to remove all deprecated functions from textractService.js
 * This removes:
 * - QUERY_ALIAS_MAP constant
 * - All QUERIES API functions
 * - All deprecated extraction functions
 * - parseHTSFormData
 * - analyzeHTSFormEnhanced
 * 
 * Keeps only:
 * - analyzeHTSFormWithForms (nested structure)
 * - Supporting functions: extract TextLines, extractKeyValuePairs, mapTextractKeysToHTSFields
 * - processEncryptedHTSForm
 * - analyzeDocument (low-level wrapper)
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'textractService.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Define deprecated function start lines and their approximate end lines
const deprecatedSections = [
  // QUERY_ALIAS_MAP constant (lines 547-740)
  { name: 'QUERY_ALIAS_MAP', start: 546, pattern: /^const QUERY_ALIAS_MAP = {/, endPattern: /^};$/ },
  
  // analyzeDocumentWithQueries (lines 397-428)
  { name: 'analyzeDocumentWithQueries', start: 396, pattern: /^async function analyzeDocumentWithQueries/, endPattern: /^}$/ },
  
  // extractFromQueryResults (lines 433-477)
  { name: 'extractFromQueryResults', start: 432, pattern: /^function extractFromQueryResults/, endPattern: /^}$/ },
  
  // batchQueries (lines 483-492)
  { name: 'batchQueries', start: 482, pattern: /^function batchQueries/, endPattern: /^}$/ },
  
  // processBatchQueries (lines 499-538)
  { name: 'processBatchQueries', start: 498, pattern: /^async function processBatchQueries/, endPattern: /^}$/ },
  
  // generateHTSFormQueries (lines 745-927)
  { name: 'generateHTSFormQueries', start: 744, pattern: /^function generateHTSFormQueries/, endPattern: /^}$/ },
  
  // All extraction helper functions (lines 257-1650)
  // These include extractFieldWithFallback, extractByKeyword, extractCheckboxes, etc.
  { name: 'extraction-helpers', start: 256, pattern: /^function extractFieldWithFallback/, endLine: 1650 },
  
  // parseHTSFormData (lines 1657-1805)
  { name: 'parseHTSFormData', start: 1656, pattern: /^function parseHTSFormData/, endLine: 1805 },
  
  // analyzeHTSFormEnhanced (lines 1811-2785)
  { name: 'analyzeHTSFormEnhanced', start: 1810, pattern: /^async function analyzeHTSFormEnhanced/, endLine: 2785 },
  
  // Helper functions for enhanced extraction (lines 2789-3925)
  { name: 'enhanced-helpers', start: 2788, pattern: /^function extractRegionFromBlock/, endLine: 3925 }
];

// Strategy: Work from bottom to top to preserve line numbers
// For now, let's use a simple approach: parse and identify function boundaries

console.log('🔍 Analyzing textractService.js...');
console.log(`📄 Total lines: ${lines.length}`);

// Function to find the end of a function starting at a given line
function findFunctionEnd(startLine) {
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track braces
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          return i;
        }
      }
    }
  }
  
  return -1; // Not found
}

// Identify functions to keep (these are NOT deprecated)
const functionsToKeep = [
  'analyzeHTSFormWithForms',
  'mapTextractKeysToHTSFields',
  'extractTextLines',
  'extractKeyValuePairs',
  'processEncryptedHTSForm',
  'analyzeDocument'
];

// Parse function definitions
const functions = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^(async )?function ([a-zA-Z0-9_]+)\(/);
  
  if (match) {
    const funcName = match[2];
    const endLine = findFunctionEnd(i);
    
    if (endLine !== -1) {
      functions.push({
        name: funcName,
        start: i,
        end: endLine,
        keep: functionsToKeep.includes(funcName)
      });
      
      console.log(`${functionsToKeep.includes(funcName) ? '✅ KEEP' : '❌ DELETE'}: ${funcName} (lines ${i+1}-${endLine+1})`);
    }
  }
}

// Also find QUERY_ALIAS_MAP
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('const QUERY_ALIAS_MAP')) {
    let endLine = i;
    let braceCount = 0;
    let started = false;
    
    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j]) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            endLine = j;
            break;
          }
        }
      }
      if (endLine !== i) break;
    }
    
    console.log(`❌ DELETE: QUERY_ALIAS_MAP (lines ${i+1}-${endLine+1})`);
    functions.push({ name: 'QUERY_ALIAS_MAP', start: i, end: endLine, keep: false });
    break;
  }
}

// Sort by start line (descending) to delete from bottom up
functions.sort((a, b) => b.start - a.start);

// Create new content by removing deprecated functions
let newLines = [...lines];
let deletedCount = 0;
let deletedLines = 0;

for (const func of functions) {
  if (!func.keep) {
    const lineCount = func.end - func.start + 1;
    // Remove lines including the function documentation comment above it
    let docStart = func.start;
    
    // Look for /** comment block above
    for (let i = func.start - 1; i >= 0 && i >= func.start - 10; i--) {
      if (lines[i].trim() === '/**' || lines[i].trim().startsWith('/**')) {
        docStart = i;
        break;
      }
      if (lines[i].trim() !== '' && !lines[i].trim().startsWith('*') && !lines[i].trim() === '*/') {
        break;
      }
    }
    
    const totalLines = func.end - docStart + 1;
    newLines.splice(docStart, totalLines);
    
    console.log(`🗑️  Removed ${func.name}: ${totalLines} lines (including docs)`);
    deletedCount++;
    deletedLines += totalLines;
  }
}

// Write the cleaned file
const newContent = newLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log(`\n✅ Cleanup complete!`);
console.log(`📊 Deleted ${deletedCount} deprecated functions/constants`);
console.log(`📉 Removed ${deletedLines} lines of code`);
console.log(`📄 New file size: ${newLines.length} lines (was ${lines.length})`);
console.log(`\n🔍 Verify the changes with: git diff services/textractService.js`);

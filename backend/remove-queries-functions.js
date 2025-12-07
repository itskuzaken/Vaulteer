/**
 * Simple script to remove specific deprecated QUERIES API functions
 * by line number ranges
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'textractService.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`📄 Original file: ${lines.length} lines`);

// Define line ranges to DELETE (inclusive, 1-indexed)
const rangesToDelete = [
  // generateHTSFormQueries function + docs (lines 737-936)
  { start: 737, end: 936, name: 'generateHTSFormQueries' },
  
  // QUERY_ALIAS_MAP constant + docs (lines 547-735)
  { start: 547, end: 735, name: 'QUERY_ALIAS_MAP' },
  
  // processBatchQueries function + docs (lines 493-541)
  { start: 493, end: 541, name: 'processBatchQueries' },
  
  // batchQueries function + docs (lines 476-491)
  { start: 476, end: 491, name: 'batchQueries' },
  
  // extractFromQueryResults function + docs (lines 427-474)
  { start: 427, end: 474, name: 'extractFromQueryResults' },
  
  // analyzeDocumentWithQueries function + docs (lines 387-425)
  { start: 387, end: 425, name: 'analyzeDocumentWithQueries' }
];

// Sort by start line descending to delete from bottom up (preserves line numbers)
rangesToDelete.sort((a, b) => b.start - a.start);

let newLines = [...lines];
let totalDeleted = 0;

for (const range of rangesToDelete) {
  // Convert 1-indexed to 0-indexed
  const startIdx = range.start - 1;
  const count = range.end - range.start + 1;
  
  newLines.splice(startIdx, count);
  totalDeleted += count;
  
  console.log(`🗑️  Deleted ${range.name}: lines ${range.start}-${range.end} (${count} lines)`);
}

// Write the cleaned file
const newContent = newLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log(`\n✅ Cleanup complete!`);
console.log(`📉 Removed ${totalDeleted} lines`);
console.log(`📄 New file: ${newLines.length} lines`);
console.log(`\n🔍 Verify with: git diff backend/services/textractService.js`);

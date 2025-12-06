/**
 * Backup current ocrMapping structure before migration
 * Preserves all calibrated coordinate regions for rollback capability
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
const BACKUP_DIR = path.join(__dirname, '../assets/form-templates/hts/backups');
const BACKUP_FILE = `ocrMapping-pre-migration-${new Date().toISOString().split('T')[0]}.json`;

function backupOcrMapping() {
  console.log('📦 Starting ocrMapping backup...\n');

  // Read current template
  const templateMetadata = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

  if (!templateMetadata.ocrMapping) {
    console.error('❌ No ocrMapping found in template-metadata.json');
    process.exit(1);
  }

  // Create backup object
  const backup = {
    templateId: templateMetadata.templateId,
    version: templateMetadata.version,
    mappingVersion: templateMetadata.mappingVersion,
    backupDate: new Date().toISOString(),
    backupReason: 'Pre-migration to structured format',
    ocrMapping: templateMetadata.ocrMapping,
    stats: {
      frontFields: Object.keys(templateMetadata.ocrMapping.front.fields).length,
      backFields: Object.keys(templateMetadata.ocrMapping.back.fields).length,
      totalFields: Object.keys(templateMetadata.ocrMapping.front.fields).length + 
                   Object.keys(templateMetadata.ocrMapping.back.fields).length
    }
  };

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Write backup
  const backupPath = path.join(BACKUP_DIR, BACKUP_FILE);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log('✅ Backup created successfully!');
  console.log(`   File: ${backupPath}`);
  console.log(`   Front fields: ${backup.stats.frontFields}`);
  console.log(`   Back fields: ${backup.stats.backFields}`);
  console.log(`   Total: ${backup.stats.totalFields}\n`);

  return backupPath;
}

if (require.main === module) {
  backupOcrMapping();
}

module.exports = { backupOcrMapping };

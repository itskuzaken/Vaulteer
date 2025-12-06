/**
 * Template Manager - Singleton
 * Manages HTS form template metadata with calibration persistence (JSON-based)
 * Ensures all services use the same template instance
 */

const fs = require('fs');
const path = require('path');

class TemplateManager {
  constructor() {
    if (TemplateManager.instance) {
      return TemplateManager.instance;
    }

    this.templatePath = path.join(__dirname, '../assets/form-templates/hts/template-metadata.json');
    this.backupDir = path.join(__dirname, '../assets/form-templates/hts/backups');
    this.template = null;
    this.version = null;
    this.calibrationCount = 0;
    this.lastSaved = null;
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    this.loadTemplate();
    
    TemplateManager.instance = this;
  }

  /**
   * Load template from JSON file
   */
  loadTemplate() {
    try {
      this.template = JSON.parse(fs.readFileSync(this.templatePath, 'utf8'));
      this.version = this.template.version || '1.0.0';
      this.calibrationCount = this.template.calibrationCount || 0;
      this.lastSaved = this.template.lastCalibrated ? new Date(this.template.lastCalibrated) : null;
      
      console.log(`✅ [TemplateManager] Loaded template: ${this.template.name} v${this.version}`);
      console.log(`✅ [TemplateManager] Calibration count: ${this.calibrationCount}, last saved: ${this.lastSaved || 'never'}`);
    } catch (error) {
      console.error('❌ [TemplateManager] Failed to load template:', error.message);
      throw error;
    }
  }

  /**
   * Get template instance (read-only clone to prevent accidental mutations)
   */
  getTemplate() {
    return JSON.parse(JSON.stringify(this.template));
  }

  /**
   * Get template reference (for direct modification by calibrator)
   */
  getTemplateReference() {
    return this.template;
  }

  /**
   * Update field region coordinates
   * HYBRID MODE: Updates both ocrMapping (legacy) AND structure (new)
   */
  updateFieldRegion(page, fieldName, newRegion) {
    let updated = false;

    // Update legacy ocrMapping
    if (this.template.ocrMapping && 
        this.template.ocrMapping[page] && 
        this.template.ocrMapping[page].fields &&
        this.template.ocrMapping[page].fields[fieldName]) {
      this.template.ocrMapping[page].fields[fieldName].region = newRegion;
      updated = true;
      console.log(`🔧 [TemplateManager] Updated ocrMapping.${page}.${fieldName}: (${newRegion.x.toFixed(3)}, ${newRegion.y.toFixed(3)})`);
    }

    // Update new structure format
    if (this.template.structure && this.template.structure[page]) {
      const sections = this.template.structure[page].sections;
      
      for (const [sectionName, sectionData] of Object.entries(sections)) {
        const fieldUpdated = this.updateFieldInSection(sectionData.fields, fieldName, newRegion);
        
        if (fieldUpdated) {
          updated = true;
          console.log(`🔧 [TemplateManager] Updated structure.${page}.${sectionName}.${fieldName}`);
        }
      }
    }

    if (!updated) {
      throw new Error(`Field ${fieldName} not found in ${page} (checked both ocrMapping and structure)`);
    }

    this.calibrationCount++;
  }

  /**
   * Recursively update field region in nested structure
   */
  updateFieldInSection(fields, fieldName, newRegion) {
    if (!Array.isArray(fields)) return false;

    for (const field of fields) {
      if (typeof field === 'object' && field !== null) {
        // Direct match
        if (field.name === fieldName) {
          field.region = newRegion;
          return true;
        }

        // Check subfields
        if (Array.isArray(field.subfields)) {
          if (this.updateFieldInSection(field.subfields, fieldName, newRegion)) {
            return true;
          }
        }

        // Check options
        if (Array.isArray(field.options)) {
          if (this.updateFieldInSection(field.options, fieldName, newRegion)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Migrate template from flat ocrMapping to nested structure format
   * Preserves all calibrated regions during migration
   */
  migrateToStructuredFormat() {
    console.log('🔄 [TemplateManager] Starting migration to structured format...');

    if (!this.template.structure) {
      throw new Error('Template missing structure section - cannot migrate');
    }

    if (!this.template.ocrMapping) {
      throw new Error('Template missing ocrMapping section - nothing to migrate');
    }

    let migratedCount = 0;

    // Migrate front page
    if (this.template.structure.front && this.template.ocrMapping.front) {
      for (const [sectionName, sectionData] of Object.entries(this.template.structure.front.sections)) {
        migratedCount += this.migrateFieldsInSection(
          sectionData.fields,
          this.template.ocrMapping.front.fields
        );
      }
    }

    // Migrate back page
    if (this.template.structure.back && this.template.ocrMapping.back) {
      for (const [sectionName, sectionData] of Object.entries(this.template.structure.back.sections)) {
        migratedCount += this.migrateFieldsInSection(
          sectionData.fields,
          this.template.ocrMapping.back.fields
        );
      }
    }

    // Mark as hybrid format
    this.template.mappingFormat = 'hybrid-v1';
    this.template.migrationDate = new Date().toISOString();

    // Mark ocrMapping as deprecated
    this.template.ocrMapping.deprecated = true;
    this.template.ocrMapping.deprecationReason = 'Migrated to structure.sections format. Use adapter layer for access.';

    console.log(`✅ [TemplateManager] Migration completed: ${migratedCount} fields migrated`);
    
    return migratedCount;
  }

  /**
   * Recursively migrate field coordinates from ocrMapping to structure
   */
  migrateFieldsInSection(fields, ocrFields) {
    let count = 0;

    if (!Array.isArray(fields)) return count;

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];

      if (typeof field === 'string') {
        // Convert string to object with coordinates
        const fieldName = field;
        if (ocrFields[fieldName]) {
          fields[i] = {
            name: fieldName,
            ...ocrFields[fieldName]
          };
          count++;
        }
      } else if (typeof field === 'object' && field !== null) {
        // Embed coordinates into existing object
        if (field.name && ocrFields[field.name]) {
          Object.assign(field, {
            region: ocrFields[field.name].region,
            label: ocrFields[field.name].label,
            extractionMethod: ocrFields[field.name].extractionMethod,
            ...(ocrFields[field.name].query && { query: ocrFields[field.name].query })
          });
          count++;
        }

        // Recursively process subfields
        if (Array.isArray(field.subfields)) {
          count += this.migrateFieldsInSection(field.subfields, ocrFields);
        }

        // Recursively process options
        if (Array.isArray(field.options)) {
          count += this.migrateFieldsInSection(field.options, ocrFields);
        }
      }
    }

    return count;
  }

  /**
   * Apply batch of calibration updates
   */
  applyCalibrationUpdates(updates) {
    let totalUpdated = 0;

    for (const [pageName, pageUpdates] of Object.entries(updates)) {
      for (const [fieldName, newRegion] of Object.entries(pageUpdates)) {
        try {
          this.updateFieldRegion(pageName, fieldName, newRegion);
          totalUpdated++;
        } catch (error) {
          console.warn(`⚠️ [TemplateManager] Failed to update ${pageName}.${fieldName}:`, error.message);
        }
      }
    }

    return totalUpdated;
  }

  /**
   * Save template to JSON file (with atomic write + backup)
   * Auto-saves after every N calibrations (default: 10)
   */
  async saveTemplate(options = {}) {
    const { force = false, autoSaveThreshold = 10 } = options;

    // Check if auto-save threshold reached
    if (!force && this.calibrationCount < autoSaveThreshold) {
      console.log(`📊 [TemplateManager] Calibration count: ${this.calibrationCount}/${autoSaveThreshold} (not saving yet)`);
      return false;
    }

    try {
      // Increment version patch number
      const versionParts = this.version.split('.');
      const patchNumber = parseInt(versionParts[2]) || 0;
      versionParts[2] = patchNumber + 1;
      this.version = versionParts.join('.');
      this.template.version = this.version;
      this.template.lastCalibrated = new Date().toISOString();
      this.template.calibrationCount = this.calibrationCount;

      const templateJson = JSON.stringify(this.template, null, 2);
      
      // Create backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupPath = path.join(this.backupDir, `template-v${this.version.replace(/\./g, '-')}-${timestamp}.json`);
      fs.writeFileSync(backupPath, templateJson, 'utf8');

      // Atomic write: write to temp file, then rename
      const tempPath = this.templatePath + '.tmp';
      fs.writeFileSync(tempPath, templateJson, 'utf8');
      fs.renameSync(tempPath, this.templatePath);

      console.log(`✅ [TemplateManager] Template saved: v${this.version}`);
      console.log(`📦 [TemplateManager] Backup: ${path.basename(backupPath)}`);

      this.lastSaved = new Date();
      
      // Clean up old backups (keep last 20)
      this.cleanupOldBackups(20);
      
      return true;
    } catch (error) {
      console.error('❌ [TemplateManager] Failed to save template:', error.message);
      throw error;
    }
  }

  /**
   * Clean up old backup files, keeping only the most recent N
   */
  cleanupOldBackups(keepCount = 20) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('template-v') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f),
          mtime: fs.statSync(path.join(this.backupDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > keepCount) {
        const toDelete = files.slice(keepCount);
        toDelete.forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`🗑️ [TemplateManager] Deleted old backup: ${file.name}`);
        });
      }
    } catch (error) {
      console.warn('⚠️ [TemplateManager] Backup cleanup failed:', error.message);
    }
  }

  /**
   * Get calibration statistics
   */
  getStats() {
    return {
      version: this.version,
      calibrationCount: this.calibrationCount,
      lastSaved: this.lastSaved,
      templateId: this.template.templateId,
      name: this.template.name
    };
  }

  /**
   * Reset singleton (for testing)
   */
  static reset() {
    TemplateManager.instance = null;
  }
}

// Export singleton instance
module.exports = new TemplateManager();

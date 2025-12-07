const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'assets', 'form-templates', 'hts', 'template-metadata.json');
const backupPath = filePath + '.bak';

console.log('Reading template file:', filePath);
const raw = fs.readFileSync(filePath, 'utf8');
const json = JSON.parse(raw);

// Backup
fs.writeFileSync(backupPath, JSON.stringify(json, null, 2), 'utf8');
console.log('Backup created at:', backupPath);

const ocr = json.ocrMapping;
if (!ocr) {
  console.log('No ocrMapping found; nothing to migrate.');
  process.exit(0);
}

// Create maps
const frontMap = ocr.front && ocr.front.fields ? ocr.front.fields : {};
const backMap = ocr.back && ocr.back.fields ? ocr.back.fields : {};

function mergeField(targetField, sourceField) {
  if (!sourceField) return targetField;
  // Copy over region, query, label, type, extractionMethod, priority, pattern, options etc. if not present
  const keysToCopy = ['region','boundingBox','label','type','required','priority','extractionMethod','query','pattern','options','nearbyLabel','format','expectedValues','condition','conditionalOn','options'];
  keysToCopy.forEach(k => {
    if (sourceField[k] !== undefined && (targetField[k] === undefined || targetField[k] === null || (typeof targetField[k] === 'string' && targetField[k].trim()===''))) {
      targetField[k] = sourceField[k];
    }
  });
  return targetField;
}

// Helper to normalize fields arrays: ensure each field is an object with name prop
function ensureFieldsArray(section) {
  if (!section.fields) section.fields = [];
  section.fields = section.fields.map(f => {
    if (typeof f === 'string') return { name: f };
    return f;
  });
}

// Migrate function: for all sections under front/back, merge matching fields
function migrateSide(side, map) {
  const sideObj = json.structure && json.structure[side];
  if (!sideObj) return;
  const sections = sideObj.sections || {};
  Object.keys(sections).forEach(sectionName => {
    const section = sections[sectionName];
    ensureFieldsArray(section);
    for (let i = 0; i < section.fields.length; i++) {
      const field = section.fields[i];
      const name = field.name || field.value || field.label;
      if (!name) continue;
      const key = Object.keys(map).find(k => k.toLowerCase() === name.toLowerCase() || k.toLowerCase() === name.toLowerCase());
      const source = key ? map[key] : map[name];
      if (source) {
        section.fields[i] = mergeField(field, source);
        // Copy actual canonical field name if not set
        if (!section.fields[i].name) section.fields[i].name = key || name;
      }
    }
  });
}

console.log('Migrating front side...');
migrateSide('front', frontMap);
console.log('Migrating back side...');
migrateSide('back', backMap);

// Collect remaining fields that were not in structure
function collectUnmapped(map) {
  const mapped = new Set();
  const sections = json.structure.front.sections || {};
  Object.values(sections).forEach(section => {
    if (!section.fields) return;
    section.fields.forEach(f => mapped.add(f.name));
  });
  const backSections = json.structure.back.sections || {};
  Object.values(backSections).forEach(section => {
    if (!section.fields) return;
    section.fields.forEach(f => mapped.add(f.name));
  });

  const leftovers = [];
  Object.keys(map).forEach(k => {
    if (!mapped.has(k)) leftovers.push({ name: k, ...map[k] });
  });
  return leftovers;
}

const leftFront = collectUnmapped(frontMap);
const leftBack = collectUnmapped(backMap);

// Add leftovers to a new 'Deprecated migrated fields' section to keep them safe
if (!json.structure.front.sections['MIGRATED FLAT FIELDS'] && leftFront.length) {
  json.structure.front.sections['MIGRATED FLAT FIELDS'] = { fields: leftFront.map(f => ({ name: f.name, ...f })) };
  console.log('Added MIGRATED FLAT FIELDS to front:', leftFront.length);
}
if (!json.structure.back.sections['MIGRATED FLAT FIELDS'] && leftBack.length) {
  json.structure.back.sections['MIGRATED FLAT FIELDS'] = { fields: leftBack.map(f => ({ name: f.name, ...f })) };
  console.log('Added MIGRATED FLAT FIELDS to back:', leftBack.length);
}

// Remove ocrMapping
delete json.ocrMapping;

// Remove deprecated flag if exists for old mapping
if (json.deprecated) delete json.deprecated;

// Save modified file
fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
console.log('Migration complete. Saved updated template-metadata.json');

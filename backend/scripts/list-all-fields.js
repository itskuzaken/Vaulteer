const template = require('../assets/form-templates/hts/template-metadata.json');

const getAllFields = (sections) => {
  const result = {};
  Object.entries(sections).forEach(([name, data]) => {
    result[name] = data.fields.map(f => typeof f === 'string' ? f : f.name).filter(Boolean);
  });
  return result;
};

const frontFields = getAllFields(template.structure.front.sections);
const backFields = getAllFields(template.structure.back.sections);

console.log('FRONT PAGE SECTIONS:\n');
Object.entries(frontFields).forEach(([name, fields]) => {
  console.log(`${name} (${fields.length} fields):`);
  console.log(`  ${fields.join(', ')}\n`);
});

console.log('\nBACK PAGE SECTIONS:\n');
Object.entries(backFields).forEach(([name, fields]) => {
  console.log(`${name} (${fields.length} fields):`);
  console.log(`  ${fields.join(', ')}\n`);
});

console.log('\n=== SUMMARY ===');
const totalFront = Object.values(frontFields).reduce((sum, arr) => sum + arr.length, 0);
const totalBack = Object.values(backFields).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Front page total: ${totalFront} fields`);
console.log(`Back page total: ${totalBack} fields`);
console.log(`Grand total: ${totalFront + totalBack} fields`);

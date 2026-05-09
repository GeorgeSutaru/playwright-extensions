const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

// Copy references
const refsSrc = path.join(srcDir, 'references');
const refsDist = path.join(distDir, 'references');
if (fs.existsSync(refsSrc)) {
  if (!fs.existsSync(refsDist)) {
    fs.mkdirSync(refsDist, { recursive: true });
  }
  fs.readdirSync(refsSrc).forEach(file => {
    fs.copyFileSync(path.join(refsSrc, file), path.join(refsDist, file));
  });
  console.log('  Copied references/ to dist/references/');
}

// Copy templates
const templatesSrc = path.join(srcDir, 'templates');
const templatesDist = path.join(distDir, 'templates');
if (fs.existsSync(templatesSrc)) {
  if (!fs.existsSync(templatesDist)) {
    fs.mkdirSync(templatesDist, { recursive: true });
  }
  fs.readdirSync(templatesSrc).forEach(file => {
    fs.copyFileSync(path.join(templatesSrc, file), path.join(templatesDist, file));
  });
  console.log('  Copied templates/ to dist/templates/');
}

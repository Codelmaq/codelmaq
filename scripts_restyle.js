const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Replace Hex Colors
  content = content.replace(/#7c4ff0/g, '#eab308');
  content = content.replace(/#a17af0/g, '#eab308');
  content = content.replace(/#b08df3/g, '#ca8a04');
  
  // Replace Tailwind Colors
  content = content.replace(/bg-purple-/g, 'bg-yellow-');
  content = content.replace(/text-purple-/g, 'text-yellow-');
  content = content.replace(/border-purple-/g, 'border-yellow-');
  content = content.replace(/ring-purple-/g, 'ring-yellow-');
  content = content.replace(/shadow-purple-/g, 'shadow-yellow-');
  content = content.replace(/from-purple-/g, 'from-yellow-');
  content = content.replace(/via-purple-/g, 'via-yellow-');
  content = content.replace(/to-purple-/g, 'to-yellow-');
  
  content = content.replace(/bg-indigo-/g, 'bg-yellow-');
  content = content.replace(/text-indigo-/g, 'text-yellow-');
  content = content.replace(/border-indigo-/g, 'border-yellow-');
  content = content.replace(/ring-indigo-/g, 'ring-yellow-');
  content = content.replace(/shadow-indigo-/g, 'shadow-yellow-');
  content = content.replace(/from-indigo-/g, 'from-yellow-');
  content = content.replace(/via-indigo-/g, 'via-yellow-');
  content = content.replace(/to-indigo-/g, 'to-yellow-');

  content = content.replace(/font-rajdhani/g, 'font-sans font-bold');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated: ' + filePath);
  }
}

['./components', './app', './src', './lib'].forEach(dir => walk(dir, processFile));

console.log('Restyle complete.');

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

  // Backgrounds
  content = content.replace(/(?<!dark:)bg-white/g, 'bg-white dark:bg-[#151515]');
  content = content.replace(/(?<!dark:)bg-gray-50/g, 'bg-gray-50 dark:bg-[#101010]');
  content = content.replace(/(?<!dark:)bg-gray-100/g, 'bg-gray-100 dark:bg-[#1e1e1e]');
  
  // Texts
  content = content.replace(/(?<!dark:)text-gray-800/g, 'text-gray-800 dark:text-gray-100');
  content = content.replace(/(?<!dark:)text-gray-900/g, 'text-gray-900 dark:text-gray-50');
  content = content.replace(/(?<!dark:)text-gray-700/g, 'text-gray-700 dark:text-gray-200');
  content = content.replace(/(?<!dark:)text-gray-600/g, 'text-gray-600 dark:text-gray-300');
  content = content.replace(/(?<!dark:)text-gray-500/g, 'text-gray-500 dark:text-gray-400');
  
  // Borders
  content = content.replace(/(?<!dark:)border-gray-200/g, 'border-gray-200 dark:border-white/10');
  content = content.replace(/(?<!dark:)border-gray-100/g, 'border-gray-100 dark:border-white/5');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Added dark mode utilities: ' + filePath);
  }
}

['./components', './app', './src'].forEach(dir => walk(dir, processFile));

console.log('Dark mode classes applied.');

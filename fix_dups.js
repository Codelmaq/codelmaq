const fs = require('fs');

const path = './components/FleetManager.tsx';
let txt = fs.readFileSync(path, 'utf8');

txt = txt.replace(/bg-white dark:bg-\[#151515\] dark:bg-\[#101010\]/g, 'bg-white dark:bg-[#101010]');
txt = txt.replace(/border-gray-200 dark:border-white\/10 dark:border-white\/5/g, 'border-gray-200 dark:border-white/5');
txt = txt.replace(/text-gray-800 dark:text-gray-100 dark:text-white/g, 'text-gray-800 dark:text-white');
txt = txt.replace(/text-gray-700 dark:text-gray-200 dark:text-gray-300/g, 'text-gray-700 dark:text-gray-300');

fs.writeFileSync(path, txt);
console.log('Fixed');

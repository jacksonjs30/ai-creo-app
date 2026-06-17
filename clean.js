const fs = require('fs');
let code = fs.readFileSync('src/lib/prompts.ts', 'utf8');

code = code.split('\\$').join('$');
code = code.split('\\`').join('`');

fs.writeFileSync('src/lib/prompts.ts', code);

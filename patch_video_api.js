const fs = require('fs');

// 1. Update route.ts
const routeFile = 'src/app/api/video/generate/route.ts';
let routeCode = fs.readFileSync(routeFile, 'utf8');
routeCode = routeCode.replace(
  /const \{ scriptText, scriptId, projectId \} = await req.json\(\);/,
  "const { scriptText, scriptId, projectId, logoUrl, logoPosition } = await req.json();"
);
routeCode = routeCode.replace(
  /const videoUrl = await generateVideo\(scriptText\);/,
  "const videoUrl = await generateVideo(scriptText, logoUrl, logoPosition);"
);
fs.writeFileSync(routeFile, routeCode);

// 2. Update ScriptStudio.tsx handleGenerateVideo
const scriptFile = 'src/components/workspace/ScriptStudio.tsx';
let scriptCode = fs.readFileSync(scriptFile, 'utf8');
scriptCode = scriptCode.replace(
  /body: JSON\.stringify\(\{\n\s*projectId: id,\n\s*scriptId: script\.id,\n\s*scriptText: script\.content,\n\s*\}\)/,
  "body: JSON.stringify({\n          projectId: id,\n          scriptId: script.id,\n          scriptText: script.content,\n          logoUrl: project?.logoUrl,\n          logoPosition: project?.logoPosition\n        })"
);
fs.writeFileSync(scriptFile, scriptCode);

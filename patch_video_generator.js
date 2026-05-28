const fs = require('fs');

const file = 'src/lib/video-generator.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Update generateVideo signature and add logo download logic
code = code.replace(
  /export async function generateVideo\(scriptText: string\): Promise<string> \{/,
  `export async function generateVideo(scriptText: string, logoUrl?: string, logoPosition?: string): Promise<string> {`
);

const logoDownloadLogic = `
  let localLogoPath = '';
  if (logoUrl) {
    try {
      console.log('Downloading logo for video overlay...');
      const res = await fetch(logoUrl);
      if (res.ok) {
        localLogoPath = path.join(tmpDir, \`logo_\${Date.now()}.png\`);
        const arrayBuffer = await res.arrayBuffer();
        fs.writeFileSync(localLogoPath, Buffer.from(arrayBuffer));
      }
    } catch (e) {
      console.error('Failed to download logo:', e);
    }
  }

  // Парсим JSON сценария
`;
code = code.replace(/  \/\/ Парсим JSON сценария/, logoDownloadLogic);


// 2. Update renderScene signature
code = code.replace(
  /async function renderScene\(videoPath: string, audioPath: string, overlayText: string, outputPath: string\): Promise<void> \{/,
  "async function renderScene(videoPath: string, audioPath: string, overlayText: string, outputPath: string, logoPath?: string, logoPos?: string): Promise<void> {"
);


// 3. Update renderScene call
code = code.replace(
  /await renderScene\(rawVideoPath, audioPath, scene\.overlay_text, scenePath\);/,
  "await renderScene(rawVideoPath, audioPath, scene.overlay_text, scenePath, localLogoPath, logoPosition);"
);


// 4. Add logo filter graph in renderScene
const filterGraphUpdate = `
    // Добавляем текст, если есть
    let filterGraph = '';
    const filters: string[] = [];
    
    if (overlayText && fs.existsSync(fontPath)) {
      const safeText = overlayText.replace(/'/g, "\\\\\\'").replace(/:/g, '\\\\:');
      filters.push(\`drawtext=fontfile='\${fontPath}':text='\${safeText}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=15:x=(w-text_w)/2:y=h-(h/4)\`);
    }

    if (logoPath && fs.existsSync(logoPath)) {
      command = command.input(logoPath); // 2nd input
      const padding = 40;
      let overlayCoord = 'x=W-w-40:y=H-h-40'; // BR
      if (logoPos === 'TL') overlayCoord = 'x=40:y=40';
      if (logoPos === 'TR') overlayCoord = 'x=W-w-40:y=40';
      if (logoPos === 'BL') overlayCoord = 'x=40:y=H-h-40';
      
      // scale logo to max 150px
      filters.push(\`[1:v]scale=150:-1[logo];[0:v][logo]overlay=\${overlayCoord}\`);
    } else {
       if (filters.length > 0) {
          // If only drawtext, we just apply it to video stream
          filterGraph = filters[0];
       }
    }

    if (logoPath && fs.existsSync(logoPath)) {
      if (overlayText) {
        // Complex filter with both
        const safeText = overlayText.replace(/'/g, "\\\\\\'").replace(/:/g, '\\\\:');
        command = command.complexFilter([
          \`[1:v]scale=150:-1[logo]\`,
          \`[0:v][logo]overlay=\${logoPos === 'TL' ? '40:40' : logoPos === 'TR' ? 'W-w-40:40' : logoPos === 'BL' ? '40:H-h-40' : 'W-w-40:H-h-40'}[v1]\`,
          \`[v1]drawtext=fontfile='\${fontPath}':text='\${safeText}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=15:x=(w-text_w)/2:y=h-(h/4)[v2]\`
        ], 'v2');
      } else {
        // Only logo
        command = command.complexFilter([
          \`[1:v]scale=150:-1[logo]\`,
          \`[0:v][logo]overlay=\${logoPos === 'TL' ? '40:40' : logoPos === 'TR' ? 'W-w-40:40' : logoPos === 'BL' ? '40:H-h-40' : 'W-w-40:H-h-40'}[v1]\`
        ], 'v1');
      }
    } else if (filters.length > 0) {
      // Only text
      command = command.videoFilters(filterGraph);
    }
`;

code = code.replace(/\/\/ Добавляем текст, если есть[\s\S]*?if \(filterGraph\) \{\n\s*command = command\.videoFilters\(filterGraph\);\n\s*\}/, filterGraphUpdate);

fs.writeFileSync(file, code);

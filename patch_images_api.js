const fs = require('fs');
const file = 'src/app/api/images/generate/route.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import sharp")) {
  code = code.replace(/import OpenAI from 'openai';/, "import OpenAI from 'openai';\nimport sharp from 'sharp';");
}

code = code.replace(/userNotes\n\s*\} = await req\.json\(\);/, "userNotes,\n      logoUrl,\n      logoPosition = 'BR'\n    } = await req.json();");

const overlayLogic = `
      let buffer = Buffer.from(b64ImageData, 'base64');

      if (logoUrl) {
        try {
          const logoRes = await fetch(logoUrl);
          if (logoRes.ok) {
            const logoArrayBuffer = await logoRes.arrayBuffer();
            const logoBuffer = Buffer.from(logoArrayBuffer);
            
            // Resize logo
            const resizedLogo = await sharp(logoBuffer)
              .resize({ width: 180, height: 180, fit: 'inside' })
              .toBuffer();

            const imageMeta = await sharp(buffer).metadata();
            const { width = 1024, height = 1024 } = imageMeta;
            
            const padding = 40;
            const logoMeta = await sharp(resizedLogo).metadata();
            const lw = logoMeta.width || 180;
            const lh = logoMeta.height || 180;

            let top = padding;
            let left = padding;
            
            if (logoPosition === 'TR') {
               left = width - lw - padding;
            } else if (logoPosition === 'BL') {
               top = height - lh - padding;
            } else if (logoPosition === 'BR') {
               top = height - lh - padding;
               left = width - lw - padding;
            }

            buffer = await sharp(buffer)
              .composite([{ input: resizedLogo, top: Math.round(top), left: Math.round(left) }])
              .png()
              .toBuffer();
          }
        } catch (logoErr) {
          console.error('Failed to overlay logo:', logoErr);
        }
      }
`;

code = code.replace(/const buffer = Buffer\.from\(b64ImageData, 'base64'\);/, overlayLogic);

fs.writeFileSync(file, code);

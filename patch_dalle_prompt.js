const fs = require('fs');
const file = 'src/app/api/images/generate/route.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `– SAFE MARGINS (MANDATORY TO PREVENT CROPPING):
  • You MUST explicitly instruct the image generator to use a "zoomed out", "wide-angle shot", with "generous negative space around all edges".
  • Specify that there is an "invisible inner frame" 15% away from the edges, and all text MUST be kept strictly inside this inner frame.
  • Tell the image generator: "NO TEXT OR ICONS MAY TOUCH OR BE CROPPED BY THE CANVAS BORDERS. Leave plenty of empty padding on all four sides."

==================================================
EXACT TEXT RULES (CRITICAL – DO NOT TRANSLATE)
==================================================

– You MUST keep the EXACT LANGUAGE of all text fragments provided in the brief.
  If the brief text is in English, keep English.
  If it is in Ukrainian or Russian, keep Ukrainian/Russian.
  DO NOT TRANSLATE OR REWRITE THE LANGUAGE.

– Enforce very short text:
  • Headline: maximum 3 words.
  • Subheadline: maximum 4 words.
  • Bullet labels (for DIRECT SALE format only): maximum 2–3 words each.
  • CTA button: maximum 2 words.
  • Badge (optional): for example "-20%".

– Every piece of text MUST be quoted exactly and clearly instructed. For example:
  "Render the text exactly as '...' with perfect spelling and kerning."

==================================================
OUTPUT
==================================================

Produce ONE long, coherent, visually descriptive prompt in English for the image model.

The prompt MUST:
– Explicitly describe the chosen layout (split versus full-bleed),
– Respect the format logic above (bullets ONLY for DIRECT SALE; NO bullets for REAL-PHOTO),
– CRITICAL: Explicitly include exact keywords like "zoomed out composition", "wide-angle", "generous negative space around all edges", and "all text is strictly confined to the inner center, away from borders" to force the image model to prevent text cropping.
– Emphasize the main message, supporting text, and CTA as the primary focal points of the banner.`;

const replacement = `– SAFE MARGINS (MANDATORY TO PREVENT CROPPING):
  • You MUST explicitly instruct the image generator to use a "zoomed out", "wide-angle shot", with "generous negative space around all edges".
  • Specify that there is an "invisible inner frame" 25% away from the edges, and all text MUST be kept strictly inside this inner frame.
  • Tell the image generator: "NO TEXT OR ICONS MAY TOUCH OR BE CROPPED BY THE CANVAS BORDERS. Leave massive empty padding on all four sides."
  • Instruct the image generator to "use a moderate, small-to-medium font size, NOT giant text."

==================================================
EXACT TEXT RULES (CRITICAL – DO NOT CROWD THE IMAGE)
==================================================

– You MUST keep the EXACT LANGUAGE (no translation).
– HOWEVER, DALL-E cannot handle long text. You MUST EXTRACT ONLY THE ABSOLUTE SHORTEST 1-2 PHRASES from the brief. Ignore all long sentences!
– If the brief has a long headline, DO NOT use it all. Extract only 2-4 words maximum.
– LIMIT VISIBLE TEXT:
  • Headline: STRICT MAXIMUM of 3-4 words.
  • Subheadline or CTA: STRICT MAXIMUM of 2-3 words.
  • DO NOT add any other text! Less text = better quality.

– Every piece of text MUST be quoted exactly and clearly instructed. For example:
  "Render the text exactly as '...' with perfect spelling and kerning."

==================================================
OUTPUT
==================================================

Produce ONE long, coherent, visually descriptive prompt in English for the image model.

The prompt MUST:
– Explicitly describe the chosen layout (split versus full-bleed),
– Respect the format logic above (bullets ONLY for DIRECT SALE; NO bullets for REAL-PHOTO),
– CRITICAL: Explicitly include exact keywords like "zoomed out composition", "wide-angle", "massive negative space around all edges", "small-to-medium font size", and "all text is strictly confined to the inner center, away from borders" to force the image model to prevent text cropping.
– Restrict the requested text to ONLY 1-2 very short phrases.
– Emphasize the main message, supporting text, and CTA as the primary focal points of the banner.`;

if (code.includes(target)) {
  fs.writeFileSync(file, code.replace(target, replacement));
  console.log("Success");
} else {
  console.log("Failed to find target string in file.");
}

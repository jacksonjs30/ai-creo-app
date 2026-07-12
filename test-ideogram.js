const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const res = await fetch('https://api.ideogram.ai/v1/ideogram-v4/generate', {
    method: 'POST',
    headers: {
      'Api-Key': process.env.IDEOGRAM_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text_prompt: "a cat",
      aspect_ratio: "1:1"
    })
  });
  const data = await res.json();
  console.log("With '1:1':", JSON.stringify(data).substring(0, 200));

  const res2 = await fetch('https://api.ideogram.ai/v1/ideogram-v4/generate', {
    method: 'POST',
    headers: {
      'Api-Key': process.env.IDEOGRAM_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text_prompt: "a cat",
      aspect_ratio: "ASPECT_RATIO_1_1"
    })
  });
  const data2 = await res2.json();
  console.log("With 'ASPECT_RATIO_1_1':", JSON.stringify(data2).substring(0, 200));
}
run();

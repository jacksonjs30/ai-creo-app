import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.log("No API key");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // We can't directly list models with the SDK easily if we just want to fetch the REST API.
  // Let's use fetch.
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  if (data.models) {
    console.log(data.models.map(m => m.name).join("\n"));
  } else {
    console.log(data);
  }
}
run();

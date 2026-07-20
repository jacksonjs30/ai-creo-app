const { mockFeedbackData } = require('./src/lib/mockFeedbackData.js');

async function test() {
  console.log("Mock data exists:", !!mockFeedbackData);
  // Actually, I can just hit the local API since `npm run dev` might be running.
  // Let me just test the prompt generation.
}
test();

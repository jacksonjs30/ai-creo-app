
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI("AIzaSyAM5Vc3EaNlQvl-qHLMLHXvn5l1qJR927Q");
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAM5Vc3EaNlQvl-qHLMLHXvn5l1qJR927Q');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  }
}

listModels();

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";

// Загружаем .env.local вручную
const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim().replace(/^["']|["']$/g, '') : null;

if (!apiKey) {
    console.error("❌ Ключ не найден в .env.local");
    process.exit(1);
}

console.log("🔑 Использую ключ (начало):", apiKey.substring(0, 8) + "...");

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Попробуем сделать самый простой запрос к Flash (она почти всегда есть)
        console.log("📡 Пробую тестовый запрос к gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("✅ Ответ получен:", result.response.text());
        console.log("\n🚀 КЛЮЧ РАБОТАЕТ. Проблема была в конкретно выбранной модели или её версии.");
    } catch (error) {
        console.error("❌ ОШИБКА:");
        console.error("Status Code:", error.status);
        console.error("Message:", error.message);
        
        if (error.message.includes("404")) {
            console.log("\n💡 РЕШЕНИЕ: Модель gemini-1.5-flash не найдена. Значит ваш аккаунт использует другой набор моделей.");
        }
    }
}

listModels();

/**
 * A-to-A EXCLUSIVE PROMPTS LIBRARY
 * Строго заточено под JSON-ответы и "живой" язык аудитории.
 * Оптимизировано для Gemini: фокус на психологической глубине и технической стабильности.
 */

export const PROMPTS = {
  /**
   * 0. БЫСТРЫЙ ПОИСК СЕГМЕНТОВ
   * Генерирует 10 черновых сегментов на основе брифа.
   */
  IDENTIFY_SEGMENTS: (brief: any) => {
    return `
ТЫ — ВЕДУЩИЙ МАРКЕТИНГОВЫЙ СТРАТЕГ И ИССЛЕДОВАТЕЛЬ ЦЕЛЕВОЙ АУДИТОРИИ.
Продукт: "${brief.productName || 'данный продукт'}".
ДАННЫЕ БРИФА: ${JSON.stringify(brief)}

### ЗАДАЧА:
Проанализируй бриф и предложи 10 РАЗНООБРАЗНЫХ и наиболее перспективных сегментов целевой аудитории. 
Сегменты должны существенно различаться по:
1. Ключевому "Симптому" (что заставляет их искать решение прямо сейчас).
2. Жизненному контексту и роли (кто они в жизни, в какой ситуации находятся).
3. Скрытой мотивации (чего они боятся или вожделеют на самом деле).

### СТИЛИСТИКА НАЗВАНИЙ (КРИТИЧНО):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать слова: «Жертвы», «Заложницы», «Воины», «Искатели», «Пленники» и любые другие драматические эпитеты.
- Названия должны быть "приземленными", как заголовок темы на форуме или описание в кабинете врача.
- Используй живой, человеческий язык. Название должно определять конкретную жизненную ситуацию или поведенческий паттерн.
- ПРИМЕРЫ ЭТАЛОНОВ: 
  ✅ «Вечно худеющие со стажем 10+ лет» (вместо «Ветеранов сопротивления»)
  ✅ «Мамы, которые не могут "вернуться в тело" после родов» (вместо «Заложниц шлейфа»)
  ✅ «Те, кому 45+ и вес просто "встал"» (вместо «Жертв метаболизма»)
  ✅ «Перегоревшие от бесконечных тренировок и залов» (вместо «Жертв изнурения»)

ТРЕБОВАНИЯ К ОТВЕТУ (СТРОГО):
- Пиши СТРОГО ТОЛЬКО JSON.
- Никаких вводных слов или пояснений вне JSON.
- Не используй реальные переводы строк внутри значений (только символ "\\n" при необходимости).

ФОРМАТ ОТВЕТА:
{
  "segments": [
    {
      "segmentName": "Название сегмента (ёмко, образно, 2–5 слов)",
      "summary": "Почему этот сегмент важен для продукта? В чем их уникальная боль? 1–2 предложения."
    }
  ]
}
(ровно 10 объектов в массиве)
`;
  },

  /**
   * 1. ГЛУБОКОЕ ИССЛЕДОВАНИЕ КОНКРЕТНОГО СЕГМЕНТА
   * Используется для полной распаковки аватара. Максимальная детализация.
   */
  RESEARCH_SEGMENT: (segment: any, brief: any) => {
    return `
ТЫ — МИКС ПСИХОЛОГА-ИССЛЕДОВАТЕЛЯ, АНТРОПОЛОГА И ТОПОВОГО КОПИРАЙТЕРА.
Твоя задача — провести ГЛУБОКОЕ исследование для сегмента "${segment.segmentName}" (${segment.summary}).
Продукт: "${brief.productName || 'данный продукт'}".
${brief.productBullets && brief.productBullets.length > 0 ? `\nКЛЮЧЕВЫЕ ОСОБЕННОСТИ ПРОДУКТА:\n${brief.productBullets.map((b: string) => `- ${b}`).join('\n')}\nУчти эти особенности. Используй их как возможные решения ('howToRemove') для возражений аватара или как аргументы в достижении его целей.\n` : ''}

### ПРАВИЛА «ЖИВОГО» ЯЗЫКА (КРИТИЧНО):
- ЗАПРЕЩЕНО использовать маркетинговые штампы ("эффективность", "инновационный") и любые выдуманные "пластиковые" цитаты. 
- Представь, что ты копируешь реальные сообщения с форумов Reddit, Telegram-чатов и Facebook-групп. Используй язык, на котором люди реально жалуются (включая профессиональный сленг: сводные, дашборд, ВПР, факап, отвалился).
- Если персонаж злится — покажи это через слова. Если он в отчаянии — пусть текст будет эмоциональным.
- Прямые цитаты должны звучать как реальная речь: со сленгом, эмоциями и деталями. Никакого академизма.

### СТИЛИСТИКА ОПРЕДЕЛЕНИЙ:
- Исключи "высокие эпитеты", драму и слова вроде «Жертвы», «Заложницы». 
- Название сегмента должно быть приземленным и четким, как заголовок на форуме.
- ПРИМЕРЫ: «Вечно худеющие со стажем», «Мамы, застрявшие в декрете».

### ТЕХНИЧЕСКИЕ ПРАВИЛА (ДЛЯ СТАБИЛЬНОСТИ JSON):
- Пиши СТРОГО ТОЛЬКО JSON.
- Для любой прямой речи или цитат внутри значений используй ТОЛЬКО кавычки-ёлочки « » (например: "context": "Он сказал «я так больше не могу»").
- ЗАПРЕЩЕНО использовать двойные кавычки " внутри строковых значений JSON.
- НЕ ИСПОЛЬЗУЙ реальные переносы строк (используй символ "\\n" для разделения).
- Ограничение объема: ~7000 символов.

### ДЕТАЛЬНАЯ ЗАДАЧА ПО РАЗДЕЛАМ:

1. portrait (ПОРТРЕТ):
   - Обязательно включи: примерный возраст/пол, должность, стиль работы, интересы, как принимает решения и ключевой триггер к покупке. Пиши плотным текстом без абзацев (6–8 предложений). 
   - Опиши их "точку кипения": что их бесит прямо сейчас? Какие мелкие детали их окружают? (шум в офисе, остывший кофе, бесконечные чаты). Пиши максимально образно и "живо".

2. jtbd (ЗАДАЧИ):
   - 7–10 ситуаций, когда человек "нанимает" продукт.
   - Используй знания о реальных обсуждениях. Формат: "job" — суть задачи, "context" — ПРЯМАЯ цитата клиента («Хочу, чтобы эта чертова штука просто работала сама...»).

3. outcomes (РЕЗУЛЬТАТЫ):
   - mainPromise — главное эмоциональное обещание по-человечески.
   - items — 7–10 конкретных результатов в формате: "outcome" — результат, "explanation" — краткое пояснение было → стало (конкретно и измеримо).

4. pains (БОЛИ):
   - 7–10 ОСТРЫХ болей. Только живой язык и ПРЯМЫЕ цитаты. 

5. fears (СТРАХИ):
   - 7–10 глубоких тревог. Фокусируйся на: страх перед заменой ИИ / потерей работы, критических ошибок в отчетах перед руководством, потери клиентов/репутации, неспособности освоить новые инструменты, финансовых потерь.

6. symptoms (СИМПТОМЫ):
   - 7–10 проявлений боли в рутине. Что человек делает физически, когда страдает? (гуглит до 3 утра, срывается на коллег, пьет лишний кофе, чтобы не заснуть).

7. behaviorMarkers (МАРКЕРЫ ПОВЕДЕНИЯ):
   - 7–10 привычек, фраз, типичных действий. По чем мы узнаем его в толпе? («Я всегда проверяю трижды...», «Без этого не начинаю день...»).

8. motivations (МОТИВАЦИЯ):
   - 5–7 эмоционально сильных целей. Что человек хочет ПОЧУВСТВОВАТЬ? (контроль, спокойствие, гордость, облегчение, тишину).

9. objections (ВОЗРАЖЕНИЯ):
   - 7–10 внутренних барьеров («Очередной развод», «У меня нет времени это учить», «Это слишком сложно»). 
   - Прямые цитаты + howToRemove: как продукт снимает это возражение (конкретное обещание).

10. cjm (СЦЕНАРИЙ "ДО" - ПЕТЛИ БОЛИ):
    - Сгенерируй 4-5 сценариев CJM, но только если они описывают фундаментально разные жизненные ситуации. Не повторяйся. Если сильных петель только 3 — напиши 3.
    - Каждый сценарий должен описывать конкретную 'петлю боли' — повторяющийся рутинный процесс, где человек бегает по кругу (например: выгрузка -> ошибка -> поиск -> злость -> переделывание).
    - Для каждого сценария пропиши 5-7 шагов. Каждый шаг: Действие (цитата) [Эмоция]. Используй "\\n" для разделения шагов внутри одного сценария.

ВАЖНО ПРО ЧАСТОТУ УПОМИНАНИЙ (frequency_rating):
Для ВСЕХ списков (jtbd, pains, fears, symptoms, behaviorMarkers, motivations, objections) ты обязан добавить поле "frequency_rating" (число от 1 до 5).
Сгенерируй до 10 пунктов, но ТОЛЬКО если они реально острые и частые (рейтинг 4-5). Если сильных проблем только 7 — напиши 7, не выдумывай слабые ради количества.
Генерируй ТОЛЬКО самые массовые, частые и критические проблемы. Если проблема тянет на 1, 2 или 3 звезды — НЕ ПИШИ ЕЁ ВООБЩЕ. Ищи в базе только те сценарии, которые заслуживают рейтинга 4 или 5.
ОБЯЗАТЕЛЬНО отсортируй каждый массив по убыванию поля frequency_rating (сначала 5, потом 4).

ФОРМАТ ОТВЕТА:
{
  "segmentName": "${segment.segmentName}",
  "summary": "${segment.summary}",
  "portrait": "...",
  "jtbd": [
    { "job": "ситуация", "context": "цитата в елочках", "frequency_rating": 5 }
  ],
  "outcomes": { 
    "mainPromise": "обещание", 
    "items": [{ "outcome": "результат", "explanation": "было → стало" }] 
  },
  "pains": [{ "pain": "суть", "context": "цитата", "frequency_rating": 4 }],
  "fears": [{ "fear": "суть", "context": "цитата", "frequency_rating": 3 }],
  "symptoms": [{ "symptom": "суть", "context": "цитата", "frequency_rating": 4 }],
  "behaviorMarkers": [{ "marker": "фраза", "context": "цитата", "frequency_rating": 3 }],
  "motivations": [{ "motivation": "цель", "context": "цитата", "frequency_rating": 5 }],
  "objections": [{ "objection": "барьер", "context": "цитата", "howToRemove": "обещание", "frequency_rating": 2 }],
  "cjm": [
    { "title": "название петли боли 1", "scenario": "Шаг 1...\\nШаг 2..." },
    { "title": "название петли боли 2", "scenario": "Шаг 1...\\nШаг 2..." },
    { "title": "название петли боли 3", "scenario": "Шаг 1...\\nШаг 2..." },
    { "title": "название петли боли 4 (опционально)", "scenario": "Шаг 1...\\nШаг 2..." }
  ]
}

ДАННЫЕ БРИФА: ${JSON.stringify(brief)}
`;
  },

  /**
   * 2. ПОЛНЫЙ ПАЙПЛАЙН (All-in-one)
   * Используется для генерации нескольких аватаров за один вызов.
   */
  AVATAR_SYSTEM_PIPELINE: (brief: any) => {
    const manualSegments = brief.targetSegments?.filter((s: string) => s.trim() !== '');
    const targetCount = manualSegments && manualSegments.length > 0 ? manualSegments.length : 3;

    return `
ТЫ — ВЕДУЩИЙ МАРКЕТИНГОВЫЙ СТРАТЕГ И ГЛУБОКИЙ ИССЛЕДОВАТЕЛЬ. 
Твоя задача — на основе брифа создать ${targetCount} детальных портрета целевой аудитории для продукта "${brief.productName}".
${brief.productBullets && brief.productBullets.length > 0 ? `\nКЛЮЧЕВЫЕ ОСОБЕННОСТИ ПРОДУКТА:\n${brief.productBullets.map((b: string) => `- ${b}`).join('\n')}\nУчти эти особенности. Используй их как возможные решения ('howToRemove') для возражений аватара или как аргументы в достижении его целей.\n` : ''}

### МЕТОДОЛОГИЯ АНАЛИЗА:
1. Проанализируй продукт: характеристики, преимущества, ценность.
2. Проведи сегментацию: выдели ${targetCount} уникальных ролей.
3. Для каждого сегмента проработай: JTBD, Результаты, Боли, Страхи, Симптомы, Маркеры, Мотивации, Возражения и CJM.

### СТИЛИСТИКА НАЗВАНИЙ (КРИТИЧНО):
- Исключи "высокие эпитеты", драму и слова «Жертвы», «Заложницы». Названия должны быть приземленными, как на форуме.
- ПРИМЕРЫ: «Вечно худеющие со стажем», «Мамы, застрявшие в декрете», «Те, кому 45+ и вес просто встал».

### ТРЕБОВАНИЯ К ОТВЕТУ (СТРОГО):
- СОЗДАЙ РОВНО ${targetCount} СЕГМЕНТА.
- ПИШИ СТРОГО ТОЛЬКО JSON. Объект с ключом "segments", в котором РОВНО ${targetCount} объектов.
- Используй «елочки» для цитат. ЗАПРЕЩЕНО использовать двойные кавычки " внутри значений.
- ЗАПРЕЩЕНО использовать выдуманные цитаты и штампы. Пиши живым языком форумов (Reddit, Telegram), используй профессиональный сленг (сводные, дашборд, ВПР, факап).
- Портрет должен включать: возраст, должность, стиль работы, интересы, триггер к покупке.
- В Страхах фокусируйся на замене ИИ, ошибках в данных, потере репутации/клиентов.
- В CJM обязательно верни 4-5 сценариев (петли боли), но только если они фундаментально разные (иначе оставь 3). Каждый по 5-7 шагов.

ФОРМАТ ОТВЕТА:
{
  "segments": [
    {
      "segmentName": "название (2-5 слов)",
      "summary": "краткая суть",
      "portrait": "живой рассказ на 6-8 предложений",
      "jtbd": [{ "job": "задача", "context": "цитата", "frequency_rating": 5 }],
      "outcomes": { "mainPromise": "обещание", "items": [{ "outcome": "результат", "explanation": "было → стало" }] },
      "pains": [{ "pain": "суть", "context": "цитата", "frequency_rating": 4 }],
      "fears": [{ "fear": "суть", "context": "цитата", "frequency_rating": 3 }],
      "symptoms": [{ "symptom": "суть", "context": "цитата", "frequency_rating": 4 }],
      "behaviorMarkers": [{ "marker": "фраза", "context": "цитата", "frequency_rating": 3 }],
      "motivations": [{ "motivation": "цель", "context": "цитата", "frequency_rating": 5 }],
      "objections": [{ "objection": "барьер", "context": "цитата", "howToRemove": "обещание", "frequency_rating": 2 }],
      "cjm": [
        { "title": "Название петли боли 1", "scenario": "Шаги через \\n" },
        { "title": "Название петли боли 2", "scenario": "Шаги через \\n" },
        { "title": "Название петли боли 3", "scenario": "Шаги через \\n" }
      ]
    }
  ]
}

ВАЖНО ПРО ЧАСТОТУ УПОМИНАНИЙ (frequency_rating):
Для ВСЕХ списков (jtbd, pains, fears, symptoms, behaviorMarkers, motivations, objections) ты обязан добавить поле "frequency_rating" (число от 1 до 5).
Сгенерируй до 10 пунктов, но ТОЛЬКО если они реально острые и частые (рейтинг 4-5). Если сильных проблем только 7 — напиши 7, не выдумывай слабые ради количества.
Генерируй ТОЛЬКО самые массовые и критические проблемы. Варианты с 1, 2 або 3 зірками — ЗАПРЕЩЕНЫ. Оставляй только 4 и 5.
ОБЯЗАТЕЛЬНО отсортируй каждый массив по убыванию поля frequency_rating (сначала 5, потом 4).

ДАННЫЕ БРИФА: ${JSON.stringify(brief)}
ГЕО: ${brief.geo?.join(', ')}
`;
  },

  /**
   * 3. РЕГЕНЕРАЦИЯ ОДНОГО ЭЛЕМЕНТА
   */
  REGENERATE_ITEM: (sectionKey: string, segment: any, briefContext: any, existingItems: any) => {
    return `
Твоя задача — сгенерировать 1 НОВЫЙ элемент для раздела "${sectionKey}" аватара "${segment.segmentName}".
Он должен быть свежим, не дублировать старые и быть написан психологически точно.

СУЩЕСТВУЮЩИЕ ЭЛЕМЕНТЫ: ${JSON.stringify(existingItems)}
КОНТЕКСТ ПРОДУКТА: ${briefContext.productName}

ТРЕБОВАНИЯ:
- Верни СТРОГО JSON-объект (не массив).
- Если раздел предполагает поля frequency_rating (как jtbd, pains, fears, и т.д.), ОБЯЗАТЕЛЬНО добавь его.
- Генерируй только критические проблемы с рейтингом 4 или 5. Не добавляй редкие или слабые пункты (1, 2, 3 звезды).
- Используй кавычки « » для цитат.
- Язык — живой, "земной". Никаких эпитетов.
`;
  },

  /**
   * 4. РЕГЕНЕРАЦИЯ ЦЕЛОГО АВАТАРА
   */
  REGENERATE_SINGLE_AVATAR: (brief: any, existingNames: string[]) => {
    return `
ТЫ — ВЕДУЩИЙ МАРКЕТИНГОВЫЙ СТРАТЕГ.
Создай 1 НОВЫЙ детальный аватар ЦА для продукта "${brief.productName}", который СУЩЕСТВЕННО отличается от существующих: [${existingNames.join(', ')}].

ИСПОЛЬЗУЙ ПОЛНУЮ МЕТОДОЛОГИЮ (как в RESEARCH_SEGMENT):
- Портрет, JTBD, Результаты, Боли, Страхи, Симптомы, Маркеры, Мотивация, Возражения, CJM.

ТРЕБОВАНИЯ К ОТВЕТУ:
- Пиши СТРОГО ТОЛЬКО JSON (один объект сегмента).
- Используй кавычки « » для цитат внутри.
- Живой язык, психологическая глубина, запрет на штампы.
- Названия в стиле "Диагноз", без эпитетов.

ДАННЫЕ БРИФА: ${JSON.stringify(brief)}
`;
  },

  /**
   * 5. КРЕАТИВЫ НА ОСНОВЕ АВАТАРА (СЦЕНАРИИ И ТЗ)
   */
    GENERATE_CREATIVES_PROMPT: (params: { 
    productName: string, 
    avatarData: any, 
    format: string, 
    toneOfVoice: string, 
    count: number, 
    language: string,
    colors?: { main: string, secondary: string, accent: string },
    focusDirection?: string,
    promoOffer?: string,
    existingConcepts?: string[],
    peoplePresence?: string,
    productBullets?: string[]
  }) => {
    return `
ROLE
You are a Data BI Creative Strategist. Your mission is not just to write texts. Your mission is to generate high-converting creative concepts (ideas, texts, scripts) that strike precisely at the psychological portrait of the target audience, forcing them to recognize themselves and click through to the site. 

Brand Tone of Voice: ${params.toneOfVoice} 
Friendly → warm, conversational, informal ("you"), no pressure 
Expert → confident, factual, data and facts, authority 
Provocative → sharp hook, provocative question, challenging the status quo 
Inspiring → emotional uplift, transformation, "you can do it"

📋 INPUT DATA:
COURSE / PRODUCT: ${params.productName}
SEGMENT / AUDIENCE: ${params.avatarData?.segmentName}
CREATIVE FORMAT: ${params.format}
NUMBER OF VARIANTS: ${params.count}
${params.focusDirection ? `SPECIFIC FOCUS: ${params.focusDirection}` : ''}
${params.promoOffer ? `PROMO OFFER: ${params.promoOffer}` : ''}
${params.peoplePresence ? `PEOPLE PRESENCE: ${params.peoplePresence === 'without_people' ? 'Strictly NO PEOPLE' : 'Mix of people and no people'}` : ''}
${params.colors ? `BRAND COLORS: Main ${params.colors.main}, Secondary ${params.colors.secondary}, Accent ${params.colors.accent}` : ''}

🗂️ KNOWLEDGE BASE (SOURCE OF TRUTH)
STATIC BASE (Always Pinned): Data BI Audience Distribution - PRODUCT SEGMENTS.csv Data BI Audience Distribution - CREO FORMATS.csv

DYNAMIC BASE:
Detailed psychological portrait of the avatar:
${JSON.stringify(params.avatarData)}

${params.productBullets && params.productBullets.length > 0 ? `KEY PRODUCT FEATURES: \n${params.productBullets.join('\n')}` : ''}
${params.existingConcepts && params.existingConcepts.length > 0 ? `PREVIOUSLY GENERATED CONCEPTS (DO NOT REPEAT): \n${params.existingConcepts.join('\n')}` : ''}

⚠️ CRITICALLY IMPORTANT: FORMAT SPLITTING LOGIC
IF FORMAT = IMAGE
✅ WHAT WE GENERATE: Texts (Hook, Pain, Solution, CTA) and COMPLETE TOR FOR THE DESIGNER (brand-guideline, colors, layout, element placement, size, reference). 
❌ WHAT WE DO NOT GENERATE: Script for a video editor, storyboard, timecodes, Voice Over. 
IMPORTANT! In the "Image Text" field, always generate SHORT! Only those phrases that will actually be on the creative. Do not exceed 3–4 key lines, totaling no more than 13–22 words. In the "Brief for the designer," describe everything else: placement of each block, fonts, accents, background, color, order, CTA, references, size.

IF FORMAT = VIDEO
✅ WHAT WE GENERATE: Idea and Hook, COMPLETE SCRIPT FOR THE EDITOR (broken down by seconds, with indication of B-roll, TBE, VO, music, effects, packshot, CTA — EVERYTHING in one cell). 
❌ WHAT WE DO NOT GENERATE: TOR for the designer (colors, image layout), placement of texts on a static image.

⚠️ CRITICAL RULE: DIVERSITY MATRIX
To avoid repetition, EACH generated variant MUST focus on an absolutely DIFFERENT psychological trigger from the avatar's profile:
Variant 1 (Functional/Pain): Focus on the main JTBD and an acute daily pain.
Variant 2 (Deep Fear): Focus on deep anxieties (fear of AI replacement, fatal error in front of the boss, losing a client/job).
Variant 3 (Symptomatic/CJM): A scenario built on the "pain loop" (working at night, burnout, anger).
Variant 4 (Objection): Direct work with a barrier ("it's expensive", "no time to learn") and overcoming it.
Variant 5 (Transformation): Emotional "before/after" contrast.
If there are fewer or more than ${params.count} variants, distribute the triggers so that the concepts do not duplicate each other.

🔄 STEP-BY-STEP ALGORITHM
Define Product and Segment from INPUT DATA. Open PRODUCT AVATAR FILE, study the avatar for this segment. Define FORMAT (image or video). Generate ${params.count} variants, following the golden rules and the Diversity Matrix.

💎 GOLDEN RULES OF TEXT GENERATION
EMOTIONALITY: Write about feelings, not facts (❌ "Excel does not scale" → ✅ "Excel 'crashed' again at 5 PM!"). 
SPECIFICITY: Concrete numbers, time, amounts (❌ "A lot of time" → ✅ "You spent 3 days on a report that your boss looked at for 3 minutes"). 
PORTRAITURE: For a specific person, not for everyone (❌ "People make mistakes" → ✅ "Your accountant made a mistake in the balance sheet, and you lost money"). 
CONTRAST: It was HELL vs now it is GOOD. 
RECOGNIZABILITY: People recognize themselves in the text.

📊 OUTPUT STRUCTURE
OUTPUT AS A STRICT MARKDOWN TABLE. The table must contain exactly the columns specified below. Use <br> for line breaks inside cells.

IF FORMAT IS IMAGE / MEME / INFOGRAPHIC:
| № | Concept | 📄 IMAGE TEXT | 📐 DESIGNER BRIEF |
|---|---------|---------------|-------------------|
| 1 | [Name] | [Hook]<br>[Explanation]<br>[CTA] | [Visual scene description, CJM moment, colors, layout, composition, camera angle] |

IF FORMAT IS VIDEO:
| № | Concept | Script (VO / Dialogues) | 🎬 EDITOR SCRIPT / TIMELINE |
|---|---------|-------------------------|-----------------------------|
| 1 | [Name] | [Dictator text / VO script] | [0–5s] Video: [Desc]<br>VO: [Text]<br>TBE: [Text]<br>Music: [Desc] |

✅ CHECKLIST BEFORE OUTPUT
Product and segment defined?
PRODUCT AVATAR FILE studied?
CREATIVE FORMAT defined?
IMAGE: TOR FOR DESIGNER generated?
VIDEO: SCRIPT FOR EDITOR generated?
Hook + Pain + Solution + CTA included?
Text written in the "voice" of the avatar?
Avatar's key objections taken into account?
EMOTION, SPECIFICITY, CONTRAST, RECOGNIZABILITY included?
All content in one cohesive section per variant?
Requested number of variants generated?

🌐 ADDITIONAL RULES
Language: Generate ALL final creatives and TOR exclusively in ${params.language}.

${(params.format && (params.format.toLowerCase().includes('продаж') || params.format.toLowerCase().includes('direct'))) ? `
==================================================
FOR "DIRECT SALE" FORMAT (Special Rules):
==================================================

This is a direct response / direct conversion ad. MORE TEXT IS ALLOWED, but the layout must stay clean and structured.

TEXT STRUCTURE (MANDATORY – ALWAYS PRESENT):
The ad copy MUST STRICTLY consist of 5 blocks:
  1. MAIN HEADLINE (max 6 words) – big, bold, at the top.
  2. SUBHEADLINE (1 short sentence) – directly under the headline, with a smaller font size.
  3. BULLET POINTS (CRITICAL — MANDATORY!) – 3–4 key benefits as a short list, in an even smaller font than the subheadline.
  4. PRODUCT LABEL – course / product name or offer label, using the same font size as description / bullet text.
  5. DISCOUNT / CTA – a visible badge (promo, benefit, or guarantee) + button text (on the button: a direct call to action for the product such as “sign up”, “get”, “buy”, etc. Do NOT use pains or desires inside the button text; it should be a simple action + optionally a clear benefit).

BULLET LAYOUT & ICONS (LIKE REFERENCE BANNERS):
– BULLETS must be visual, not just plain text.
– Each bullet point MUST have:
  • a clear icon that matches the meaning of the bullet,
  • a short bold line (2–4 words) as the benefit title,
  • an optional micro-line in smaller text (explanation, 4–8 words).

ICON MEANING EXAMPLES:
  • Shield – safety, protection, no mistakes, legality.
  • Clock / Lightning – speed, automation, fast result.
  • Graph / Chart – growth, analytics, control over numbers.
  • Person / Team – support, human help, curator.
  • Checklist – structure, order, clear process.
  • Smile-like character – calm, confidence, comfort.

Icons must NOT look like emoji; they should be graphic symbols that visually express the specific meaning of each bullet.

BULLET LAYOUT OPTIONS:
You can use ONE of two layouts (pick whichever fits better for this concept), and it is allowed to combine them:

  • Vertical bullets:
    – A vertical column of 3–4 bullet rows.
    – Placed on the LEFT or CENTER-LEFT (or under the headline, depending on the layout).
    – Icons aligned in a straight column; text aligned to the right of each icon.

  • Horizontal feature row:
    – A horizontal strip at the BOTTOM of the banner with 3–5 compact feature blocks.
    – Each block: icon on top, 1–2 word label under it (for example, “Confidentially”, “Individual approach”, “Real results”).

COMBINATION (RECOMMENDED):
– For DIRECT SALE it is RECOMMENDED to combine both:
  • vertical bullets for the main 2–3 benefits,
  • and a bottom horizontal micro-feature strip for trust / extra points (such as “Confidential & safe”, “Support at every step”, etc.).

LAYOUT / COMPOSITION (STRUCTURE LIKE REFERENCE BANNERS):
– Use a clear split or asymmetrical layout, inspired by high-performing direct sale banners:

  • OPTION 1 – TEXT LEFT, VISUAL RIGHT:
    – LEFT SIDE (~60% width): product label, main headline, subheadline, vertical bullets, CTA/button, bottom icon row.
    – RIGHT SIDE (~40% width): strong product visual:
      ▸ a person with the product (e.g., holding a card, laptop, phone),
      ▸ or product UI on a laptop/phone,
      ▸ or a clear metaphor (e.g., money leak, dashboards, city background),
      ▸ or any other visual that clearly represents the product idea or the creative brief.
    – The left side can smoothly transition into the right side using a gradient.

  • OPTION 2 – TEXT RIGHT, VISUAL LEFT:
    – RIGHT SIDE (~60% width): product label, main headline, subheadline, bullets, CTA/button, bottom icon row.
    – LEFT SIDE (~40% width): product / metaphor visual (e.g., magnifying glass over a table, person with a laptop, etc.),
      or any other visual that clearly represents the product idea or the creative brief.
    – The left side can smoothly transition into the right side using a gradient.

  • OPTION 3 – TEXT TOP, VISUAL BOTTOM:
    – Top section: product label, headline, subheadline, bullets.
    – Middle/right: product visual (UI, person, metaphor).
    – Bottom: wide CTA strip with a button and small icons / benefits in a horizontal row.

– In all options:
  • keep text blocks grouped in a clean panel,
  • keep the visual as a strong, “alive” scene that supports the promise.

CTA AREA:
  • The CTA must be placed inside a clearly separated block (button, banner strip, or card).
  • Make the CTA area visually similar to the reference banners:
    – solid shape, rounded corners, arrow or icon,
    – short text like “Get consultation”, “Start test”, “Download guide”, “Освой Excel за тиждень”.
  • The promotion or discount must be shown as a separate bright badge, consistent with the creative brief.

PRODUCT LABEL / PROMO BADGE:
  • Use a pill / badge element for the product name or promo:
    – e.g., “Online course”, “For business in USA”, “PRODUCT / COURSE NAME”, “Free consultation”, “Special price”.
  • Place it near the headline or near the CTA, not randomly.

ICON ROW FOR TRUST / FEATURES (BOTTOM STRIP):
– At the very bottom, it is strongly recommended to add a row of 3–5 small icons with labels, for example:
  • “Confidential & safe”
  • “Individual approach”
  • “Real results”
  • “Support at every step”
  • “24/7 online”
– These bottom icons should be compact and aligned in a single row, visually separated from the main content by spacing or a subtle background strip.
– This row must stay inside the safe margins and look like a small “trust bar”.

SUMMARY FOR DIRECT SALE FORMAT:
– Think of the banner as a structured sales one-pager:
  • Top: promise (headline + subheadline),
  • Middle: main benefits as bullet icons (vertical list) near one side,
  • Opposite side: strong product / person / UI visual,
  • Bottom: CTA strip + small trust badges in a horizontal row.
– Your DESIGNER BRIEF must explicitly describe:
  • where each of the 5 text blocks is placed,
  • where bullet icons go (vertical / horizontal),
  • where the product / person / UI visual is placed,
  • where the CTA block and bottom icon row are located,
  • that all text stays within safe margins and that secondary text becomes smaller / tighter instead of being pushed to the edges,
  • that the visual scene is "alive", realistic, and rich in depth and light.
` : ''}

==================================================
GLOBAL DESIGN RULES (APPLY TO ALL IMAGE FORMATS):
==================================================

SAFE MARGINS & READABILITY (CRITICAL ANTI-CROP RULES):
– All text blocks (headline, subheadline, bullets, CTA, labels, bottom icons) MUST stay inside safe margins:
  • keep at least 10–15% empty space from each edge of the banner.
– No text may touch or be cropped by the edges under any circumstances.
– If the layout feels dense:
  • REDUCE the visual size of secondary text (subheadline, bullet descriptions, bottom labels),
  • slightly tighten line spacing for bullets,
  • shorten support lines where necessary (remove extra adjectives and filler words).
– NEVER solve text density by zooming into the layout or pushing text closer to the borders.
– The entire composition must remain zoomed out, with generous negative space around outer edges.

"ALIVE" / "JUICY" VISUAL STYLE:
– Visuals must feel alive, juicy, and realistic, not flat:
  • LIGHT: use soft, directional light with gentle shadows, add subtle reflections, avoid flat, evenly lit scenes.
  • DEPTH & PERSPECTIVE: use background blur or atmospheric depth (sharp foreground, softer background), create realistic scenes and emphasize them with shadows so the image has volume.
  • CONTEXT & PROPS: add realistic environment details (desk items, office interior, city skyline), keep the scene dynamic but not cluttered.
  • COLOR: use a clear brand-like palette, avoid muddy or oversaturated chaos; keep it clean and modern.
– While the visual is alive and rich, keep all text blocks sharp, perfectly readable, and fully inside the safe zone.
`;
  },

  PARSE_LAYOUT_PROMPT: (brief: string, language: string) => {
    return `
You are an expert graphic design assistant and JSON layout architect.
Your task is to parse a raw text brief for an advertising creative and produce a strict JSON layout document.

LANGUAGE DIRECTIVE:
Extract all text content EXACTLY as it appears in the brief, preserving ${language} language. Keep Cyrillic perfectly intact (UTF-8). Do NOT translate or paraphrase.

=== FULL JSON SCHEMA ===

{
  "id": "creative_<random_id>",
  "type": "image_creative",
  "size": { "width": 1080, "height": 1080 },
  "brandPalette": {
    "bgGradientFrom": "#hex (from brief 'Фон' color)",
    "bgGradientTo": "#hex",
    "textPrimary": "#hex (main text color from brief)",
    "textSecondary": "#hex (secondary text)",
    "accentPrimary": "#hex (buttons, discounts, highlights)",
    "accentSecondary": "#hex"
  },
  "backgroundHint": "Scene description for image generator. NO TEXT, NO LOGOS, NO UI. Leave clean empty space in TOP CENTER and BOTTOM CENTER for text overlay.",
  "blocks": [
    {
      "id": "hook",
      "type": "text",
      "role": "hook",
      "text": "exact hook text from brief in quotes",
      "fontRole": "display",
      "colorRole": "text_primary",
      "area": "top_center",
      "align": "center",
      "zIndex": 10,
      "styleHints": { "bold": true, "shadow": true }
    },
    {
      "id": "pain",
      "type": "text",
      "role": "pain",
      "text": "exact pain/body text from brief",
      "fontRole": "body",
      "colorRole": "text_primary",
      "area": "under_headline",
      "align": "center",
      "zIndex": 10,
      "styleHints": { "shadow": true }
    },
    {
      "id": "solution",
      "type": "text",
      "role": "solution",
      "text": "exact solution text from brief",
      "fontRole": "highlight",
      "colorRole": "accent_primary",
      "area": "middle_center",
      "align": "center",
      "zIndex": 10,
      "styleHints": { "bold": true, "shadow": true }
    },
    {
      "id": "discount_bg",
      "type": "shape",
      "role": "discount_bg",
      "shape": "rounded_rect",
      "bgColorRole": "accent_primary",
      "area": "above_cta",
      "zIndex": 8,
      "cornerRadius": 12,
      "padding": 16
    },
    {
      "id": "discount_text",
      "type": "text",
      "role": "discount",
      "text": "Знижка -30%",
      "fontRole": "badge",
      "colorRole": "text_on_accent",
      "area": "above_cta",
      "align": "center",
      "zIndex": 12,
      "parent": "discount_bg",
      "styleHints": { "uppercase": true, "bold": true }
    },
    {
      "id": "cta",
      "type": "button",
      "role": "cta",
      "text": "CTA button text from brief",
      "bgColorRole": "accent_primary",
      "textColorRole": "text_on_accent",
      "fontRole": "badge",
      "area": "bottom_center",
      "zIndex": 10,
      "styleHints": { "uppercase": true }
    },
    {
      "id": "logo",
      "type": "image",
      "role": "logo",
      "source": "placeholder",
      "area": "top_right",
      "zIndex": 5
    }
  ],
  "meta": {
    "createdByAi": true,
    "version": "v1"
  }
}

=== ROLE → STYLE MAPPING RULES (MANDATORY) ===

1. hook → type:"text", fontRole:"display", colorRole:"text_primary" or "accent_primary" (if brief says to highlight). This is the BIGGEST text.
2. pain / body → type:"text", fontRole:"body", colorRole:"text_primary" or "text_secondary". Smaller than hook.
3. solution / benefit → type:"text", fontRole:"highlight", colorRole:"accent_primary". Visually distinct accent.
4. discount → TWO blocks:
   a) ShapeBlock (id:"discount_bg"): type:"shape", bgColorRole:"accent_primary", shape:"rounded_rect"
   b) TextBlock (id:"discount_text"): type:"text", fontRole:"badge", colorRole:"text_on_accent", parent:"discount_bg"
5. cta → type:"button", bgColorRole:"accent_primary", textColorRole:"text_on_accent", fontRole:"badge"
6. logo → type:"image", role:"logo", source:"placeholder"

=== AREA ASSIGNMENT RULES ===

Parse "Розташування елементів" from the brief and map:
- "ЗАГОЛОВОК – великий, по центру" → area:"top_center"
- "БІЛЬ – під заголовком" → area:"under_headline"  
- "РІШЕННЯ – виділений" → area:"middle_center"
- "Знижка – над CTA" → area:"above_cta"
- "CTA – внизу" → area:"bottom_center"
- "Логотип – у правому верхньому куті" → area:"top_right"
ALWAYS fill the area field. Never leave it empty or use "default".

Allowed area values: top_left, top_center, top_right, under_headline, middle_left, middle_center, middle_right, above_cta, bottom_left, bottom_center, bottom_right

=== BACKGROUND HINT RULES ===

The backgroundHint field describes the SCENE for GPT Image to generate. It MUST:
1. Describe the visual scene (characters, objects, setting, mood, lighting, style).
2. Explicitly include instructions to render the exact text from the brief on the image (e.g. "Include the text 'ЗНИЖКА -30%' in bold letters").
3. Use colors from brandPalette for the scene atmosphere.

=== PALETTE EXTRACTION ===

From the brief's "Кольорова палітра" section:
- "Фон: глибокий синій" → bgGradientFrom: deep blue hex
- "Текст: білий" → textPrimary: "#FFFFFF"  
- "Акценти: яскраво-жовтий" → accentPrimary: bright yellow hex

=== CRITICAL RULES ===

1. Extract text content EXACTLY from the brief — do not rephrase, truncate, or translate.
2. Every block MUST have: id, type, role, area, zIndex.
3. Text blocks MUST have: text, fontRole, colorRole, align, styleHints.
4. Button blocks MUST have: text, bgColorRole, textColorRole, fontRole.
5. Shape blocks MUST have: shape, bgColorRole.
6. Use DIFFERENT fontRole values for DIFFERENT roles — this is how the frontend differentiates visual hierarchy.
7. Do NOT create blocks for elements not mentioned in the brief.

OUTPUT FORMAT:
Return ONLY the raw JSON object. No markdown wrapping. No conversational text.

RAW BRIEF TO PARSE:
${brief}
`;
  },

  /**
   * 6. ТЕКСТЫ ОБЪЯВЛЕНИЙ (AD COPY GENERATION)
   * Генерирует 3 варианта рекламного текста под конкретный аватар и платформу.
   * Каждый вариант использует разную копирайтерскую структуру.
   */
  GENERATE_AD_TEXTS_PROMPT: (params: {
    productName: string;
    productDescription?: string;
    keyOutcome?: string;
    avatarData: any;
    platform: 'meta' | 'google' | 'tiktok' | 'other';
    language: 'uk' | 'en' | 'ru';
    globalRefinement?: string;
    localRefinement?: string;
    variantIndex?: number; // если задан — генерируем только один вариант
    structureOverride?: string; // конкретная структура для одного варианта
  }) => {
    const langLabel = params.language === 'uk' ? 'Українська' : params.language === 'en' ? 'English' : 'Русский';

    const platformRules = {
      meta: `
ПЛАТФОРМА: Meta (Facebook / Instagram)
Для КАЖДОГО варианта сгенерируй:
- "primaryText": основной текст объявления, 2–4 предложения (без жёстких символьных ограничений)
- "headline": заголовок до 35 символов

Правила Meta: текст должен цеплять в ленте. Первые 1–2 предложения — самые сильные, т.к. они видны без «Ещё».
`,
      google: `
ПЛАТФОРМА: Google Ads
Для КАЖДОГО варианта сгенерируй:
- "headline": заголовок СТРОГО до 30 символов (включая пробелы). Если длиннее — текст будет обрезан.
- "description": описание СТРОГО до 90 символов (включая пробелы). Если длиннее — текст будет обрезан.

Правила Google: максимально конкретно, без воды, с ключевым обещанием и призывом. Считай символы!
`,
      tiktok: `
ПЛАТФОРМА: TikTok / Reels / Shorts
Для КАЖДОГО варианта сгенерируй:
- "hook": первая строка / субтайтл (первое, что видит зритель до «See more»), 1 предложение, максимально цепляющее
- "caption": подпись к ролику, 1–2 коротких предложения + опциональный хэштег-якорь

Правила TikTok: хук — это 3-секундный крючок. Он должен ОСТАНОВИТЬ скролл. Говори как человек, не как реклама.
`,
      other: `
ПЛАТФОРМА: Другое (универсальный формат)
Для КАЖДОГО варианта сгенерируй:
- "primaryText": 1–2 абзаца (2–4 предложения), короткий рекламный формат без жёстких лимитов
- "headline": заголовок, 1 предложение

Формат свободный, но текст должен оставаться лаконичным и рекламным.
`,
    };

    const structures = ['PAS', 'Hook→Value→CTA', 'AIDA', 'BAB'];

    // Для полной генерации 3 вариантов — задаём разные структуры
    const fullGenStructures = [
      { index: 1, name: 'PAS', description: 'Problem → Agitation → Solution: чётко сформулированная боль → усиление последствий → продукт как логичный ответ' },
      { index: 2, name: 'Hook → Value → CTA', description: 'Hook: цепляющее первое предложение (боль/ситуация/контраст) → Value: 1–2 предложения про решение и результат → CTA: явный призыв' },
      { index: 3, name: 'AIDA', description: 'Attention: сильный хук → Interest: почему это важно → Desire: что человек получает → Action: CTA' },
    ];

    // Для перегенерации одного — выбираем структуру
    const singleStructure = params.structureOverride || structures[Math.floor(Math.random() * structures.length)];

    const isFullGeneration = !params.variantIndex;

    const avatarSummary = `
СЕГМЕНТ: ${params.avatarData?.segmentName || 'Неизвестный сегмент'}
ОПИСАНИЕ: ${params.avatarData?.summary || ''}
ПОРТРЕТ: ${params.avatarData?.portrait || ''}

JTBD (задачи, что хочет сделать): ${JSON.stringify((params.avatarData?.jtbd || []).slice(0, 6))}
БОЛИ: ${JSON.stringify((params.avatarData?.pains || []).slice(0, 7))}
СТРАХИ: ${JSON.stringify((params.avatarData?.fears || []).slice(0, 5))}
СИМПТОМЫ: ${JSON.stringify((params.avatarData?.symptoms || []).slice(0, 5))}
МАРКЕРЫ ПОВЕДЕНИЯ: ${JSON.stringify((params.avatarData?.behaviorMarkers || []).slice(0, 5))}
МОТИВАЦИИ: ${JSON.stringify((params.avatarData?.motivations || []).slice(0, 5))}
ВОЗРАЖЕНИЯ: ${JSON.stringify((params.avatarData?.objections || []).slice(0, 5))}
РЕЗУЛЬТАТЫ: ${JSON.stringify(params.avatarData?.outcomes || {})}
CJM-сценарии: ${JSON.stringify((params.avatarData?.cjm || []).slice(0, 3))}
`.trim();

    return `ТЫ — ТОПОВЫЙ КОПИРАЙТЕР С 15 ГОДАМИ ОПЫТА В PERFORMANCE-РЕКЛАМЕ.
Твоя задача — написать рекламные тексты для продукта, которые попадают точно в психологический профиль аудитории.

=== ДАННЫЕ ПРОДУКТА ===
Продукт: ${params.productName}
${params.productDescription ? `Описание: ${params.productDescription}` : ''}
${params.keyOutcome ? `Главный обещанный результат: ${params.keyOutcome}` : ''}

=== ДАННЫЕ АВАТАРА (ЦЕЛЕВАЯ АУДИТОРИЯ) ===
${avatarSummary}

${platformRules[params.platform]}

=== ЯЗЫК ГЕНЕРАЦИИ ===
ОБЯЗАТЕЛЬНО пиши ВСЕ тексты объявлений на языке: ${langLabel}
Сохраняй живой язык и сленг аватара, не переводи буквально.

=== ПРАВИЛА НАПИСАНИЯ ТЕКСТОВ (СТРОГО) ===

1. НАЧАЛО ТЕКСТА:
   - Всегда начинай с хука или призыва, который отражает суть продукта и боли сегмента:
     • вопрос по боли
     • контраст «до/после»
     • прямое обращение к ситуации
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ начала: «В современном мире…», «Каждый из нас знает…», «Представьте, что…», «Сегодня мы расскажем…», «Если вы…», «Многие из нас…»

2. ФОКУС НА ВЫГОДАХ:
   - Говори о результате и решении для этого аватара, а не о «инновационном сервисе»
   - 1–2 конкретные боли → 1–2 конкретных результата. НЕ пытайся запихнуть все боли сразу

3. CTA:
   - В конце каждого текста — чёткий призыв к действию
   - Примеры: «Оставьте заявку», «Попробуйте бесплатно», «Начните сегодня», «Создайте первый проект»

4. ВЫБОР ЭЛЕМЕНТОВ АВАТАРА:
   - Для каждого варианта ВЫБЕРИ 1–2 боли и 1–2 результата из массивов выше
   - НЕ используй все сразу — текст должен фокусироваться на одной линии
   - Для разных вариантов выбирай РАЗНЫЕ боли и результаты

5. ЗАПРЕТ ШАБЛОННОСТИ:
   - Не начинай разные варианты с одинаковых слов
   - Не используй фразы: «Устали от…», «Хватит терпеть…», «Наше решение…»

6. ФОРМАТИРОВАНИЕ primaryText (ОБЯЗАТЕЛЬНО для Meta и Other):
   - Каждое смысловое предложение или блок — на ОТДЕЛЬНОЙ строке (разделяй символом \\n)
   - Перед каждой строкой добавь 1 эмодзи, которое точно отражает СМЫСЛ этой строки
   - Подбирай эмодзи по смыслу, примеры:
     😓 или 😤 — для боли, усталости, проблемы
     ⏰ или 🕐 — для потери времени
     💸 — для денег/потерь/экономии
     😰 или 😱 — для страха, риска
     ✅ или 💡 — для решения, инсайта
     🚀 или 📈 — для роста, результата
     🎯 — для конкретного попадания в цель
     👉 или 🔥 — для CTA, призыва к действию
   - НЕ повторяй одно и то же эмодзи дважды подряд в одном тексте
   - Не добавляй эмодзи в headline, hook, caption, description — только в primaryText

${params.globalRefinement ? `
=== ГЛОБАЛЬНЫЕ УТОЧНЕНИЯ ПОЛЬЗОВАТЕЛЯ (ВЫСОКИЙ ПРИОРИТЕТ) ===
${params.globalRefinement}
Эти уточнения ОБЯЗАТЕЛЬНО учти при написании ВСЕХ вариантов.
` : ''}

${params.localRefinement ? `
=== ЛОКАЛЬНЫЕ УТОЧНЕНИЯ ДЛЯ ЭТОГО ВАРИАНТА (НАИВЫСШИЙ ПРИОРИТЕТ) ===
${params.localRefinement}
Эти уточнения имеют НАИВЫСШИЙ приоритет и применяются к этому конкретному варианту.
` : ''}

${isFullGeneration ? `
=== ЗАДАЧА: СГЕНЕРИРУЙ 3 ВАРИАНТА ===
Для каждого варианта используй РАЗНУЮ копирайтерскую структуру:

Вариант 1 — структура PAS: ${fullGenStructures[0].description}
Вариант 2 — структура Hook→Value→CTA: ${fullGenStructures[1].description}
Вариант 3 — структура AIDA: ${fullGenStructures[2].description}

Каждый вариант должен:
- Фокусироваться на РАЗНЫХ болях/результатах из массивов аватара
- Начинаться по-разному (разные хуки)
- Использовать разный угол подачи
` : `
=== ЗАДАЧА: СГЕНЕРИРУЙ 1 ВАРИАНТ (ПЕРЕГЕНЕРАЦИЯ) ===
Это вариант №${params.variantIndex}. Используй структуру: ${singleStructure}
Структура ${singleStructure}: ${
      singleStructure === 'PAS' ? 'Problem → Agitation → Solution' :
      singleStructure === 'AIDA' ? 'Attention → Interest → Desire → Action' :
      singleStructure === 'BAB' ? 'Before → After → Bridge' :
      'Hook → Value → CTA'
    }
Создай СВЕЖИЙ вариант, отличающийся по углу подачи и выбранным болям.
`}

=== ФОРМАТ ОТВЕТА (СТРОГО JSON) ===
Верни ТОЛЬКО валидный JSON. Никаких вводных слов, никакого текста вне JSON.
Используй кавычки «елочки» внутри текстов только если нужна прямая речь, но НЕ в JSON-ключах.
Не используй реальные переносы строк внутри строковых значений — используй \\n.

${isFullGeneration ? `{
  "variants": [
    {
      "variantIndex": 1,
      "structure": "PAS",
      ${params.platform === 'meta' ? '"primaryText": "...", "headline": "..."' :
        params.platform === 'google' ? '"headline": "до 30 символов", "description": "до 90 символов"' :
        params.platform === 'tiktok' ? '"hook": "...", "caption": "..."' :
        '"primaryText": "...", "headline": "..."'},
      "usedPains": ["краткое описание боли 1"],
      "usedOutcomes": ["краткое описание результата 1"]
    },
    {
      "variantIndex": 2,
      "structure": "Hook→Value→CTA",
      ${params.platform === 'meta' ? '"primaryText": "...", "headline": "..."' :
        params.platform === 'google' ? '"headline": "до 30 символов", "description": "до 90 символов"' :
        params.platform === 'tiktok' ? '"hook": "...", "caption": "..."' :
        '"primaryText": "...", "headline": "..."'},
      "usedPains": ["краткое описание боли 2"],
      "usedOutcomes": ["краткое описание результата 2"]
    },
    {
      "variantIndex": 3,
      "structure": "AIDA",
      ${params.platform === 'meta' ? '"primaryText": "...", "headline": "..."' :
        params.platform === 'google' ? '"headline": "до 30 символов", "description": "до 90 символов"' :
        params.platform === 'tiktok' ? '"hook": "...", "caption": "..."' :
        '"primaryText": "...", "headline": "..."'},
      "usedPains": ["краткое описание боли 3"],
      "usedOutcomes": ["краткое описание результата 3"]
    }
  ]
}` : `{
  "variants": [
    {
      "variantIndex": ${params.variantIndex},
      "structure": "${singleStructure}",
      ${params.platform === 'meta' ? '"primaryText": "...", "headline": "..."' :
        params.platform === 'google' ? '"headline": "до 30 символов", "description": "до 90 символов"' :
        params.platform === 'tiktok' ? '"hook": "...", "caption": "..."' :
        '"primaryText": "...", "headline": "..."'},
      "usedPains": ["..."],
      "usedOutcomes": ["..."]
    }
  ]
}`}
`;
  },

  VISION_LAYOUT_PROMPT: (draftJson: string, briefText: string) => {
    return `
You are an expert AI layout designer with advanced vision capabilities.
I will provide:
1. A draft JSON layout containing the copy (text blocks), roles, rough areas, and brand palette.
2. The original advertising brief.
3. An image (the generated background).

Your objective is to analyze the background image and produce a FINAL V2 JSON layout document.

### INSTRUCTIONS:
1. Identify "avoidRegions": regions containing human faces, bodies, or main critical objects that must NOT be covered by text. Return an array of Rects (x, y, width, height as 0.0 to 1.0 relative to image size).
2. Identify "safeRegions": 1-3 empty, clean areas where text can be placed clearly. Return an array of Rects (0.0 to 1.0).
3. For EVERY block in the draft JSON, assign a precise "frame" (x, y, width, height) relative to the image size (0.0 to 1.0).
4. Frame rules:
   - Must be fully inside a safeRegion.
   - Must NOT intersect any avoidRegion.
   - Must not overlap other blocks (maintain 3-5% margin).
   - Hook/Header should go in the top safe area; CTA/Discount should go in the bottom safe area.
5. Analyze the background brightness/color precisely under each block's frame:
   - If the background is light, set "explicitColor" to a dark color from the brand palette.
   - If the background is dark, set "explicitColor" to a light color.
   - If the background is noisy or patterned, add styleHints { "shadow": true, "outline": true }.
   - If extremely noisy, you may recommend adding a shape behind the text by creating a new ShapeBlock and setting it as the parent of the TextBlock.

### FULL JSON SCHEMA FOR V2:
{
  ... // keep all root properties from draft (id, type, size, brandPalette, meta)
  "contentAware": {
    "safeRegions": [{"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.3}],
    "avoidRegions": [{"x": 0.4, "y": 0.4, "width": 0.2, "height": 0.4}]
  },
  "blocks": [
    {
      "id": "hook",
      "type": "text",
      "text": "...", // keep text
      "role": "hook",
      "fontRole": "display",
      "colorRole": "text_primary",
      // ... keep other properties
      "frame": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.2},
      "anchor": "top_center",
      "explicitColor": "#000000" // determined based on background
    }
  ]
}

### CRITICAL RULES:
1. Return ONLY the final V2 JSON object. No markdown formatting, no explanations, no wrapping blocks. Start directly with { and end with }.
2. Ensure you output valid JSON.
3. Keep all text strings exactly as they are in the draft JSON.

=== DRAFT JSON ===
${draftJson}

=== ORIGINAL BRIEF ===
${briefText}
`;
  },

  FEEDBACK_LOOP_ANALYSIS_PROMPT: (params: { jsonPayload: string }) => {
    return `
Ты — модуль “Обучение / Feedback Loop” в системе генерации и аналитики рекламных креативов.

Твоя задача:
1. Принимать структурированные данные по креативам и их метрикам из рекламных кабинетов за выбранный период.
2. Считать базовые показатели по проекту (компании) и по каждому креативу (если они не посчитаны или для проверки).
3. Определять или подтверждать статусы креативов (Winner / Loser / Neutral / Learning) внутри одной компании и выбранного периода.
4. Аггрегировать результаты по “смысловым связкам” (аватар, JTBD, боль, стадия CJM, формат).
5. Возвращать понятные подсказки, кого масштабировать, кого отключать и какие боли/углы работают лучше других.

Ты не управляешь рекламными кабинетами (не останавливаешь кампании сам), а только считаешь и объясняешь.

=== ВХОДНЫЕ ДАННЫЕ ===
${params.jsonPayload}

=== ФОРМАТ ВЫХОДНЫХ ДАННЫХ (ТОЛЬКО JSON) ===
Ты всегда отвечаешь валидным JSON, без лишнего текста, в структуре:

{
  "baseline": {
    "date_from": "2026-06-01",
    "date_to": "2026-06-07",
    "avg_CTR": 0.021,
    "avg_CPL": 6.5,
    "avg_CR_reg": 0.12
  },
  "creatives_summary": [
    {
      "id": "cr_1",
      "system_name": "AV1_pain_burnout_static_v1",
      "preview_url": "https://...",
      "created_at": "2026-05-28",
      "status": "winner | loser | neutral | learning",
      "metrics": { ... },
      "deltas_vs_baseline": {
        "CTR": 0.35,
        "CPL": -0.3,
        "CR_reg": -0.25
      },
      "meta": { ... },
      "explanation": "Креатив признан winner: CTR выше среднего на 35%, CPL ниже на 30%."
    }
  ],
  "angles_summary": [
    {
      "angle_key": "young_moms|выгорание|problem_aware|static",
      "label": "strong",
      "metrics": { ... },
      "deltas_vs_baseline": {
        "CPL": -0.26,
        "CTR": 0.07
      },
      "explanation": "Боль «выгорание» для аватара young_moms даёт CPL на 26% ниже среднего по проекту."
    }
  ],
  "recommendations": {
    "winners_to_scale": [
      {
        "creative_id": "cr_1",
        "reason": "CPL на 30% ниже среднего, устойчивые регистрации",
        "suggested_actions": ["Сделать 5 визуальных мутаций с теми же смыслами"]
      }
    ],
    "losers_to_pause": [ ... ],
    "angles_to_focus": [ ... ],
    "angles_to_deprioritize": [ ... ]
  }
}

=== ПРАВИЛА ПОВЕДЕНИЯ ===
1. Всегда используй только переданные данные. 
2. В explanation пиши коротко и по существу: какие метрики и насколько отличаются от baseline, какие теги у этого креатива/угла, почему он попал в winner/loser.
3. Отвечай СТРОГО валидным JSON без markdown-оберток (\`\`\`json ... \`\`\`).
`;
  }
};


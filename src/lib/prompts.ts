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
You are a Senior Creative Strategist and Prompt Engineer for performance advertising. Your mission is to generate high-converting creative concepts (ideas, copy, scripts) that strike exactly at the target audience's psychological profile, making them recognize themselves and take action.

Brand Tone of Voice: ${params.toneOfVoice}
Friendly → warm, conversational, zero pressure
Expert → confident, factual, data-driven, authoritative
Provocative → sharp hooks, challenging the status quo
Inspiring → emotional uplift, transformation, "you can do it"

📋 INPUT DATA:
COURSE / PRODUCT: ${params.productName}
TARGET AVATAR PROFILE (Segment Data):
${JSON.stringify(params.avatarData, null, 2)}

AD FORMAT:
${params.format}

NUMBER OF VARIANTS TO GENERATE: ${params.count}

${params.colors ? `
🎨 BRAND COLORS (MANDATORY FOR DESIGNER BRIEF):
- Main: ${params.colors.main} | Secondary: ${params.colors.secondary} | Accent: ${params.colors.accent}
` : ''}

${params.focusDirection ? `
🎯 SPECIFIC FOCUS / DIRECTION:
The user requested a specific focus for these creatives: "${params.focusDirection}".
You MUST adapt ALL variants around this specific theme, merging it with the avatar's profile.
` : ''}

${params.promoOffer ? `
🎁 PROMO / SPECIAL OFFER: "${params.promoOffer}"
You MUST include this promo text in the image text or script (near the CTA).
` : ''}

${params.existingConcepts && params.existingConcepts.length > 0 ? `
🧠 MEMORY BUFFER (PREVIOUS GENERATIONS):
Here is a list of concepts that HAVE ALREADY BEEN GENERATED for this avatar:
${params.existingConcepts.map(c => `- ${c}`).join('\n')}
CRITICAL: You are STRICTLY FORBIDDEN from repeating these ideas, hooks, angles, or storylines! 
Do NOT reuse the same combinations of pains, fears, objections, outcomes, or CJM scenes. 
Find ABSOLUTELY NEW, non-obvious pains, fears, benefits, or moments that haven't been used yet.
` : ''}

${params.peoplePresence === 'without_people' ? `
🚫 "NO PEOPLE" RULE:
You are STRICTLY FORBIDDEN from describing people in the frame (no faces, emotions, characters). Focus exclusively on the product, UI, metaphors, or environment. Start the "Designer Brief" with the [NO_PEOPLE] tag for all variants.
` : params.peoplePresence === 'mix' ? `
⚖️ "MIX" RULE:
You can combine approaches: some variants with people, some without. For variants without people, start the "Designer Brief" with the [NO_PEOPLE] tag.
` : ''}

${params.productBullets && params.productBullets.length > 0 ? `
🌟 KEY PRODUCT BENEFITS:
${params.productBullets.map(b => `- ${b}`).join('\n')}
Integrate these into the text where appropriate.
` : ''}

==================================================
1. UNIQUENESS & VARIATION (CRITICAL)
==================================================
– For EACH of the ${params.count} generations, create a fresh, highly specific concept.
– Do NOT reuse the same combinations of pains, fears, objections, outcomes, and CJM scenes across creatives.

– For each variant, RANDOMLY SELECT and lock in:
  • 1–2 pains,
  • 1 symptom,
  • 1 deep fear OR objection,
  • 1 motivation or desired outcome,
  • 1 key CJM scene (a concrete moment from the avatar's day-in-the-life).

– Build the entire creative idea around THIS specific combination.

– Across all ${params.count} variants, ROTATE different CJM scenes so that each concept happens in a different moment of the avatar’s day (morning, during work, meeting with boss, late night, weekend, etc.). Avoid staying in the same scene type for all ideas.

– If a pain or fear has already been used frequently in the MEMORY BUFFER or in previous concepts, PRIORITIZE other pains, symptoms, fears and motivations for this generation.

– Even if you accidentally select a pain similar to a previous one, you MUST change at least one of:
  • the CJM scene,
  • the deep fear / objection,
  • or the outcome.
  Do NOT simply paraphrase the same story with different words.

– Always look for a new angle:
  • New metaphor (e.g., "hamster wheel", "broken calculator", "too many browser tabs"),
  • New micro-situation (late night, boss call, kids asleep, tax inspection),
  • New emotional contrast (stress vs relief, chaos vs control).

==================================================
2. MESSAGE STRUCTURE (COPYWRITING)
==================================================
For every creative, define:

1) CORE HOOK (1 sentence):
   – A sharp line that connects a specific pain or symptom with the promised outcome.
   – It must feel like something the avatar would immediately recognize as "this is about me".

2) SUPPORTING MESSAGE (1–2 sentences):
   – Clarify what the product does for THIS exact situation.
   – Tie it directly to the selected JTBD and CJM scene.

3) PROOF / DETAIL:
   – One concrete detail that makes the promise believable:
     • a number or time saving,
     • a specific scenario ("no more 20 open tabs", "report done before kids go to bed"),
     • or a clear feature ("automatic reconciliation across files", "ready dashboards for your director").

4) CTA IDEA:
   – A short call-to-action tailored to this angle ("Build your first dashboard", "Automate your next report").

*Avoid clichés:* "Groundhog day", "Tired of...", "Looking for...", "Imagine...". Start immediately with a native, situation-based hook.

– Let the Tone of Voice directly shape your copy:
  • Friendly → warm, conversational, empathetic questions and statements.
  • Expert → precise, concrete, data-backed phrases.
  • Provocative → bold claims, challenging questions, slight tension.
  • Inspiring → transformational language and vision of a better future.

==================================================
3. VISUAL SCENE GENERATION
==================================================
For each creative, describe ONE clear visual scene that literally shows:
– the selected pain and CJM scene,
– plus the shift toward the desired outcome.

– Always tie the visual to the selected CJM scene:
  • If the scene is "late night with coffee and Excel", show exactly that.
  • If the scene is "boss asking for a last-minute report", show that interaction.
  • If the scene is "time with family after finishing reports", show the relief moment.

– Avoid generic office stock images.
– Add concrete props and context:
  • number of browser tabs, printed reports, sticky notes,
  • kids' toys nearby, coffee cups, late-night lighting,
  • facial expressions (tension, frustration, relief, pride) — unless [NO_PEOPLE] is required.

– Alternate visual types across variants:
  • Some variants as close-up UI / dashboards / numbers,
  • Some as human-centered scenes with clear emotion,
  • Some as strong visual metaphors (e.g., drowning in paperwork, broken calculator, overflowing inbox),
  • Some as clear BEFORE vs AFTER contrast within one frame.

– Each new variant MUST significantly differ from the previous one in at least TWO aspects:
  • background environment (office / home / cafe / meeting room / night vs day),
  • camera angle (close-up vs wide shot),
  • or main visual metaphor.

– ⚠️ CRITICAL DESIGN RULE (APPLIES TO ALL FORMATS):
  To ensure images are never repetitive, you MUST drastically change the visual concept, background environment or colors, and composition in the "Designer Brief" for EVERY variant. 
  Never copy or slightly tweak the visual brief from the previous row.

==================================================
4. FORMAT ADAPTATION
==================================================
IF AD FORMAT = IMAGE (Meme, Infographic, Direct Sale, Photo+Text, etc.):
✅ WE GENERATE: Text blocks (Hook, Pain, Solution, CTA) AND a FULL DESIGNER BRIEF.
❌ WE DO NOT GENERATE: Video scripts (VO, TBE).

FOR "DIRECT SALE" FORMAT (Special Rules, Layout + Bullets + Bottom Row + Anti-Crop + Typography):

This is a direct response / direct conversion ad. The visual structure must be strong, clean, and highly scannable.

IMPORTANT MODEL LIMITATION RULE:
This format contains more text than other ad formats, but image models often fail when too much real text is placed near the edges.
You must ALWAYS prioritize:
1) clear layout,
2) safe text zones,
3) strong typographic hierarchy,
4) compact secondary text (smaller font),
over aggressive zoom and edge-to-edge copy.

DIRECT SALE SHOULD BE TREATED AS:
– a structured layout-first sales banner,
– not as a final production-ready typeset design with long narrative paragraphs.

==================================================
A. TEXT STRUCTURE (MANDATORY – ALWAYS PRESENT)
==================================================

The ad concept MUST contain these 5 logical blocks:

  1. MAIN HEADLINE
     – big, bold, at the top,
     – up to 6–8 words in final copy,
     – directly addresses the main pain or promise.

  2. SUBHEADLINE
     – 1 short sentence directly under or near the headline,
     – clarifies the promise / context,
     – shorter than a full paragraph.

  3. BULLET POINTS (MAIN BENEFITS)
     – 2–3 key benefits in a vertical list,
     – each bullet = short benefit phrase, not a long paragraph.

  4. PRODUCT LABEL
     – course / product name or offer label (e.g. “Курс «Excel для бухгалтерів та фінансистів»”),
     – shown as a pill or badge near the top (top-left or top-right).

  5. DISCOUNT / CTA
     – visible badge (promo or guarantee) + main button text,
     – e.g. “АКЦІЯ –20%”, “Безкоштовний урок”, “Почати сьогодні”.

You still generate full marketing copy for these blocks, but for the image text you must keep them structurally compact (see typography rules below).

==================================================
B. BULLET CONTENT & ICONS (VERTICAL LIST)
==================================================

MAIN BULLET CONTENT LOGIC:
– Bullet content must reflect different aspects of the avatar profile:
  • at least 1 bullet based on a core pain or symptom,
  • at least 1 bullet based on a desired outcome or motivation,
  • optionally 1 bullet based on an objection turned into reassurance.

Examples:
– “Автоматичні звіти” – «3 1C, банку, CRM – за секунди.»
– “Без страху помилок” – «Точність на мільйон.»
– “Спокій та впевненість” – «Дедлайни більше не страшні.»

STRUCTURE OF THE VERTICAL BULLETS:
– placed under the subheadline on the left side,
– each bullet includes:
  • a meaningful icon on the left (e.g. ⚡️, 🛡, 📈, 😊),
  • a bold short title (2–4 words),
  • one compact support line (4–8 words) under the title.

Icons must match the meaning:
  • ⚡️ or 🕑 – speed / automation,
  • 🛡 – safety / no errors,
  • 📈 – growth / career / income,
  • 😊 – comfort / confidence / relief.

Do NOT write long, multi-sentence explanations inside bullets.
If a bullet becomes longer than one short line of support text, compress it.

==================================================
C. BOTTOM ICON ROW (MANDATORY HORIZONTAL BULLETS)
==================================================

The banner MUST include a bottom horizontal strip with 3–5 compact benefit bullets.

STRUCTURE OF THE BOTTOM STRIP:
  • each item = icon + 1–2 word label only,
  • no extra explanatory sentence,
  • all items in one line (horizontal),
  • evenly spaced, aligned on the same baseline.

GOOD examples:
  • 👨🏫 “Експертна підтримка”
  • 🚀 “Швидкий результат”
  • 🛡 “Безпечні дані”
  • 😊 “Зручно онлайн”
  • 📊 “Практика на кейсах”

PLACEMENT:
  • strictly at the very bottom of the text area (left side) OR across the full width of the banner,
  • inside the safe zone, with clear padding from the lower edge,
  • visually separated from the main bullets (using spacing, a subtle divider, or a light panel).

PRIORITY:
  • the bottom icon row is MANDATORY for DIRECT SALE,
  • do NOT remove it even if other text is long,
  • if there is not enough space, reduce other supporting text first, but keep the bottom row.

==================================================
D. BULLET MODES (VERTICAL + HORIZONTAL)
==================================================

DIRECT SALE uses two bullet modes:

  1) MAIN BULLETS (vertical list):
     • 2–3 rows,
     • icon + bold short title + 1 compact support line,
     • placed under the subheadline on the left.

  2) BOTTOM ICON ROW (horizontal):
     • 3–5 very short bullets (icon + 1–2 word label only),
     • placed at the bottom of the text area.

Both modes should be present whenever possible.
Never merge them into one long paragraph.
If you need to simplify, keep the structure (vertical list + bottom row) and shorten text instead of deleting elements.

==================================================
E. LAYOUT / COMPOSITION
==================================================

Use a clear split layout, similar to high-performing direct-sale banners.

OPTION 1 – TEXT LEFT, VISUAL RIGHT:
  – LEFT SIDE (~60% width):
    • product label (badge),
    • main headline,
    • subheadline,
    • vertical bullets,
    • CTA button + discount badge,
    • bottom icon row (horizontal).

  – RIGHT SIDE (~40% width):
    • strong product visual:
      ▸ split-screen metaphor (left: chaos, right: clarity),
      ▸ Excel / dashboard UI on laptop or monitor,
      ▸ or another clear, business-related metaphor.

Example of split-screen metaphor:
  • left: overloaded, freezing Excel with many tabs, cold bluish tones;
  • right: clean, organized dashboard with key metrics, warm confident tones;
  • a clear dividing line in the middle symbolizing transition.

OPTION 2 – TEXT TOP, VISUAL BOTTOM/RIGHT:
  – top-left: product label + headline + subheadline,
  – middle-left: vertical bullets,
  – bottom-left: CTA strip + discount badge + bottom icon row,
  – right: product / UI / metaphor visual.

The banner should feel like a structured one-pager:
  • top = promise (headline + subheadline),
  • middle-left = benefit bullets,
  • middle-right = visual proof,
  • bottom = CTA strip + trust badges.

==================================================
F. TYPOGRAPHY HIERARCHY (CRITICAL)
==================================================

Do NOT keep all text at the same visual size. The banner must use a clear hierarchy:

  • MAIN HEADLINE:
    – largest text on the banner,
    – bold and dominant,
    – instant focal point.

  • SUBHEADLINE:
    – clearly smaller than the headline,
    – visually secondary,
    – one compact line or two short lines.

  • VERTICAL BULLETS:
    – smaller than the subheadline,
    – compact, neatly stacked,
    – each bullet looks like supporting info, not a second headline.

  • CTA:
    – medium-sized,
    – bold, placed inside a button / CTA strip,
    – visually stronger than bullets but weaker than the main headline.

  • BOTTOM ICON ROW / MICROTEXT:
    – smallest text tier,
    – very compact, subtle, evenly spaced,
    – each label only 1–2 words.

Supporting text (subheadline, bullets, bottom labels) must be intentionally smaller and tighter than the headline.
The model must fit dense copy by reducing the visual size of secondary text, NOT by zooming into the layout.

==================================================
G. SAFE ZONE / ANTI-ZOOM / ANTI-CROP RULES
==================================================

– Imagine a large invisible inner frame (safe zone).
– ALL text, icons, CTA, and bottom badges MUST stay fully inside this safe zone.
– Keep at least 15% empty margin from every edge of the canvas.
– Never place any text or CTA close to the borders.

CRITICAL:
– If the layout feels dense:
  • reduce the visual size of secondary text (subheadline, bullets, bottom labels),
  • tighten line spacing for bullets,
  • keep the canvas zoomed out.
– NEVER solve text density by enlarging the whole composition or pushing text toward the edges.
– The banner must always look zoomed out, with generous negative space around all edges.
– Each cluster (headline block, bullet block, CTA, bottom icon row) must have its own breathing room.

==================================================
H. DESCRIPTION STYLE AND LENGTH (COMPACT BRIEF)
==================================================

The layout / composition description is a technical brief for the image model, NOT an additional marketing story.

RULES:
– max 2–3 short sentences for the entire layout description,
– each sentence under 20–25 words,
– focus on:
  • where text blocks are,
  • where the visual is,
  • what the main metaphor is,
  • colors and lighting.

BAD: long paragraphs like “Більше не сиди допізна, шукаючи помилку на 5 гривень…”.
GOOD: short structural sentences, e.g.:
  • “Left side: headline, short subheadline, vertical bullet list, CTA button and discount badge.”
  • “Right side: clean Excel dashboard on a monitor in a calm, modern office.”
  • “Bottom: horizontal row of small icons with ultra-short trust labels inside the safe zone.”

If you start writing more than 3 sentences, STOP and compress.

==================================================
I. CTA AREA & PRODUCT LABEL
==================================================

CTA AREA:
– CTA must sit inside a clearly separated block:
  • button,
  • rounded rectangle,
  • or full-width CTA strip.
– CTA text: short and action-oriented (2–4 words).
– CTA block must be visually obvious and discoverable in 1 second.

PRODUCT LABEL / PROMO BADGE:
– Use a pill/badge for:
  • product type (e.g., “Онлайн-курс”),
  • target (“Для бухгалтерів та фінансистів”),
  • promo (“АКЦІЯ –20%”).
– Place it near the headline or CTA, not randomly.

==================================================
J. BOTTOM TRUST STRIP (SUMMARY)
==================================================

– At the very bottom, add a compact row of 3–5 small icons with ultra-short labels.
– This row:
  • is mandatory,
  • uses the smallest text size,
  • stays entirely inside safe margins,
  • aligns horizontally under the left text block or across the full width.

==================================================
K. DESIGNER BRIEF REQUIREMENTS
==================================================

In the "Designer Brief", explicitly describe:
  • where each of the 5 text blocks is located (headline, subheadline, bullets, product label, discount/CTA),
  • whether main bullets are vertical and where they sit,
  • that the bottom icon row is a horizontal strip with icons + 1–2 word labels,
  • where the product / UI / metaphor visual sits,
  • where the CTA button and discount badge are placed,
  • how the layout respects:
      – zoomed-out composition,
      – clear safe margins,
      – strong typographic hierarchy,
      – and compact secondary text.

FINAL PRIORITY ORDER FOR DIRECT SALE:
1. Safe layout and spacing
2. Strong visual hierarchy
3. Clear product / visual representation
4. Two-level bullet structure (vertical list + bottom icon row)
5. Full text content

Never sacrifice layout safety, hierarchy, or the bottom icon row just to keep more words on the image.

FOR "REAL-PHOTO CREO" FORMAT:
- Realistic lifestyle / UGC photo.
- Keep text extremely minimal (ONE compact text block). NO bullets.
- The text block (headline + mini subline) must be placed in safe areas and must not touch image edges.

IF AD FORMAT = VIDEO:
✅ WE GENERATE: Idea/Hook AND a FULL EDITOR SCRIPT (broken down by seconds: Video visuals, VO, TBE, Music).
- VO (Voice Over) must be a single cohesive story.
- TBE (Text By Eye) does NOT duplicate the VO, but highlights key punchlines, numbers, or CTA.

==================================================
5. OUTPUT STRUCTURE (STRICT MARKDOWN TABLE)
==================================================
Your output MUST be a strict Markdown table.
NO introductory or concluding words outside the table. ONLY the table.

⚠️ CRITICAL:
Inside the table cells, you are STRICTLY FORBIDDEN from using real line breaks (Enter / \n). 
This will break the parser. Use ONLY the HTML tag <br> for new lines inside a cell.

IF FORMAT IS IMAGE / MEME / INFOGRAPHIC:
| № | Concept | 📄 IMAGE TEXT | 📐 DESIGNER BRIEF |
|---|---------|---------------|-------------------|
| 1 | [Name] | [Hook]<br>[Explanation]<br>[CTA] | [Visual scene description, CJM moment, colors, layout, composition, camera angle] |

IF FORMAT IS VIDEO:
| № | Concept | Script (VO / Dialogues) | 🎬 EDITOR SCRIPT / TIMELINE |
|---|---------|-------------------------|-----------------------------|
| 1 | [Name] | [Dictator text / VO script] | [0–5s] Video: [Desc]<br>VO: [Text]<br>TBE: [Text]<br>Music: [Desc] |

Text Generation Language:
GENERATE ALL CREATIVE COPY (Hooks, Scripts, Briefs) STRICTLY IN THIS LANGUAGE: ${params.language}. 
Do not translate the avatar's slang or tone; keep it natural in the target language.
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
  }
};

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
    productBullets?: string[],
    deviceType?: string[],
    mockupCount?: number,
    primaryMockup?: string
  }) => {
    const fmt = params.format.toLowerCase();
    let formatRulebook = '';

    if (fmt.includes('direct') || fmt.includes('продаж')) {
      formatRulebook = `
==================================================
FOR "DIRECT SALE" FORMAT (Special Rules):
==================================================

This is a direct response / direct conversion ad. MORE TEXT IS ALLOWED, but the layout must stay clean and structured.

TEXT STRUCTURE (MANDATORY – ALWAYS PRESENT):
The ad copy MUST STRICTLY consist of 5 blocks:
MAIN HEADLINE (max 6 words) – big, bold, at the top.
SUBHEADLINE (1 short sentence) – directly under the headline, with a smaller font size.
BULLET POINTS (CRITICAL — MANDATORY!) – 3–4 key benefits as a short list, in an even smaller font than the subheadline.
PRODUCT LABEL – course / product name or offer label, using the same font size as description / bullet text.
DISCOUNT / CTA – a visible badge (promo, benefit, or guarantee) + button text (on the button: a direct call to action for the product such as “sign up”, “get”, “buy”, etc. Do NOT use pains or desires inside the button text; it should be a simple action + optionally a clear benefit).

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
  – LEFT SIDE (~40% width): product / metaphor visual (e.g., magnifying glass over a table, person with a laptop, etc.), or any other visual that clearly represents the product idea or the creative brief.
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

SAFE MARGINS & READABILITY (CRITICAL ANTI-CROP RULES):
– All text blocks (headline, subheadline, bullets, CTA, labels, bottom icons) MUST stay inside safe margins:
  • keep at least 10–15% empty space from each edge of the banner.
– No text may touch or be cropped by the edges under any circumstances.
– If the layout feels dense:
  • REDUCE the visual size of secondary text (subheadline, bullet descriptions, bottom labels),
  • slightly tighten line spacing for bullets,
  • shorten support lines where necessary (remove extra adjectives and filler words).
– NEVER solve text density by zooming into the layout or pushing text closer to the borders.
– The entire composition must remain zoomed out, with generous negative space around:
  • outer edges,
  • the headline block,
  • the bullets block,
  • the CTA block,
  • the bottom icon row.

“ALIVE” / “JUICY” VISUAL STYLE:
– Visuals must feel alive, juicy, and realistic, not flat:
• LIGHT:
  – use soft, directional light with gentle shadows,
  – add subtle reflections on screens, glossy surfaces, or glass,
  – avoid flat, evenly lit scenes; create depth with contrast.
• DEPTH & PERSPECTIVE:
  – show laptops, phones, dashboards under a slight perspective angle,
  – use background blur or atmospheric depth (sharp foreground, softer background),
  – include layers: foreground object, mid-ground subject, background environment,
  – create realistic scenes and emphasize them with shadows so the image has volume.
• CONTEXT & PROPS:
  – add realistic environment details: desk items, coffee cup, notebook, pen, plants, office interior, city skyline, etc.,
  – optionally include partial human presence (hand, silhouette, person holding a card/device) if allowed,
  – keep the scene dynamic but not cluttered.
• COLOR:
  – use a clear brand-like palette: 1–2 main colors + 1 accent for the CTA,
  – make the CTA, badges and key words pop with higher contrast, and you may highlight them with shadows or directional light,
  – avoid muddy or oversaturated chaos; keep it clean and modern.
– While the visual is alive and rich, keep all text blocks:
  • sharp,
  • perfectly readable,
  • fully inside the safe zone.

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
  • that the visual scene is “alive”, realistic, and rich in depth and light.`;

    } else if (fmt.includes('\u0434\u043e/\u043f\u0456\u0441') || fmt.includes('\u043a\u0435\u0439\u0441') || fmt.includes('before') || fmt.includes('after')) {
      formatRulebook = `
==================================================
FOR "BEFORE / AFTER (CASE STUDY)" FORMAT (Special Rules):
==================================================

This format simulates a "Case Study" or a highly realistic transformation. It must visually contrast the avatar's painful starting point ("Before") with the successful outcome ("After") achieved via the product.

TEXT STRUCTURE (NO BULLETS):
The text must be structured like a clean Direct Sale banner, but STRICTLY WITHOUT bullet points to maximize space for the dual visuals.
1. MAIN HEADLINE (max 6 words) – big, bold, focusing on the transformation, case study, or final result.
2. SUBHEADLINE (1 short sentence) – directly under the headline, providing context.
3. "BEFORE" & "AFTER" LABELS (Optional but Recommended) – Short 1-word labels (e.g., "До" / "После" or "Без" / "З") placed directly over their respective images.
4. PRODUCT LABEL / PROMO BADGE – product name and offer label if exist in user brief.
5. CTA BLOCK – a visible button with action-oriented text at the bottom.

LAYOUT / COMPOSITION (STRICT SPLIT):
- The visual area MUST feature two distinct images, usually split Left/Right (50/50).
- LEFT IMAGE: The "BEFORE" state (pain, problem, old way).
- RIGHT IMAGE: The "AFTER" state (solution, success, new way).
- Text Blocks (Headline, Subheadline, CTA) should be placed in a dedicated panel (e.g., a Top block or a unified banner strip at the bottom) so they don't obstruct the comparison.

VISUAL STYLE & COLOR GRADING (REALISTIC & CONTRASTING):
- The imagery MUST be highly realistic (Real-Photo style: real people, real desks, real screens, natural lighting). No vector graphics.
- Contrast & Color Rules (The Designer Brief MUST specify ONE of these):
  • Option A (Tints): If the text labels "До" and "После" are used, apply a subtle RED tint/overlay to the "Before" image, and a subtle GREEN tint/overlay to the "After" image.
  • Option B (Frames): If no text labels are used, apply a red border/frame to the "Before" image and a green border/frame to the "After" image.
  • Option C (Natural Contrast): No artificial colors/frames. Rely purely on the realistic scene's natural lighting and composition (e.g., "Before" is messy, dark, stressful; "After" is clean, bright, smiling).

SAFE MARGINS & READABILITY:
- Ensure the dividing line between the two images is sharp and clear.
- "Before/After" labels must be highly legible against the photo background (use solid pills/badges).
- Keep all main text inside safe margins (10-15% from the edges).

SUMMARY FOR BEFORE/AFTER FORMAT:
- Think of it as a realistic proof-of-concept or case-study slide.
- Your DESIGNER BRIEF must explicitly describe the Left realistic scene (Before), the Right realistic scene (After), and the specific color grading or framing logic (Red vs Green).`;

    } else if (fmt.includes('\u043c\u0435\u043c') || fmt.includes('meme')) {
      formatRulebook = `
==================================================
FOR "MEME-CREO" FORMAT (Special Rules):

ROLE
A photo+text-style ad where:
– the IMAGE is a single MEME SCENE (cartoon-style illustration),
– the TEXT follows a simple structure:
  hook → supporting line → optional offer (from brief) → CTA,
– the CONTENT:
  • is derived from the current trigger and Extended Avatar,
  • explicitly reinforces the joke of the meme scene.

CRITICAL DISTINCTION FROM COMIC FORMAT
– MEME-CREO uses ONE main meme scene,
  NOT a full comic page with multiple panels.
– NO comic-style page layout:
  • no 4–7 panels,
  • no numbered panel headers,
  • no gutters or grids.
– Any multi-step CJM storytelling belongs to COMIC-CJM, not MEME-CREO.

--------------------------------------------------
VISUAL SUBTYPE: CARTOON MEME AD
--------------------------------------------------

IMAGE STYLE
– One single cartoon-style image:
  • avatar in a relatable, slightly exaggerated situation
    (e.g. tired with coffee, drowning in spreadsheets,
     boss asking about metrics, launch chaos).
  • Simple flat or soft-gradient background:
    large color fields (yellow, blue, orange, green, etc.)
    or soft, slightly textured surfaces.

– Composition:
  • Character and one main context object
    (laptop, phone, spreadsheets, calculator, charts).
  • Large meme text (hook) in the upper part of the canvas.
  • Optional supporting line near the character or key object.
  • Offer/CTA rendered as BRIGHT BADGE PASHKAS in the lower area.

– Allowed:
  • speech/thought bubble for 1 short meme line
    (e.g. “I hate Excel”),
  • short labels on objects
    (e.g. “Excel chaos”, “Night work”).

– NOT allowed:
  • comic-page frames with multiple panels,
  • numbered scenes (Panel 1, Panel 2),
  • multi-photo grids or collage-style layouts.

--------------------------------------------------
TEXT STRUCTURE (MEME TONE, PHOTO+TEXT LOGIC)
--------------------------------------------------

1. MAIN HEADLINE (HOOK / SETUP)
   – One strong line (max 6–8 words).
   – Describes the painful / absurd situation of the avatar
     (e.g. “Fourth coffee for one report?”).
   – Tone: sarcastic, self-deprecating, clearly tied to avatar’s pain.

   MUST:
   – be based on the current trigger
     (pain, fear, CJM loop, objection, transformation),
   – directly comment on what is happening in the meme image.

2. SUPPORTING LINE
   – One short line (max 10–12 words).
   – Explains:
     • what exactly goes wrong (panic, burnout, manual reports,
       fines, “drowning in rows”),
     • or what outcome the avatar wants.

   – Uses wording from Extended Avatar:
     pains, CJM symptoms, desired outcomes.

3. OFFER (ONLY IF PROVIDED IN BRIEF)
   – If the brief includes an offer (discount, bonus, deadline),
     add ONE short offer line inside an OFFER BADGE PASHKA:
       • e.g. “-20% on automation course until Friday”.

   STRICT RULES:
   – Never invent offers if the brief does not provide them.
   – Max 1–2 lines inside one badge,
     3–5 words total.
   – Exactly ONE offer badge on the banner.

4. CTA
   – One short call-to-action (2–4 words):
     • e.g. “Start learning”, “Find out more”, “Stop suffering”.

   – Rendered as a separate CTA badge pashka (button):
     • bright background color,
     • clear readable text,
     • strong “clickable” feeling.

   – Meme tone allowed
     (e.g. “Stop suffering in Excel”),
     as long as the action is clear.

--------------------------------------------------
TEXT DENSITY LIMITS
--------------------------------------------------
– Max 3 main text surfaces:
  1) headline area (hook),
  2) ONE supporting line area (bar or bubble),
  3) ONE badge pashka (offer OR CTA, or combined offer+CTA).

– Short labels on objects are allowed
  (e.g. “Excel chaos”, “Deadline panic”, “Night shift”),
  but must remain 1–3 words each.

– No long paragraphs.
– No fine-print microcopy;
  all text must be clearly legible on a phone screen.

--------------------------------------------------
PLACEMENT OF TEXT AND BADGES
--------------------------------------------------

HEADLINE
– Placed in the top or upper half of the canvas.
– Large font, high contrast with background.
– May occupy a significant portion of the width.

SUPPORTING LINE
– Placed close to the character or key object:
  • near the face,
  • above the laptop,
  • inside a small strip or speech bubble.

– Font smaller than headline, but still large and readable.

OFFER / CTA BADGE PASHKAS
– Placed in the lower part of the image
  (but not at the extreme bottom edge to avoid UI overlap).
– Badge shapes:
  • classic button (rounded rectangle),
  • slightly tilted bright rectangle,
  • “sticker” with rounded or torn edges,
  • paintbrush stroke badge (uneven edges),
  • cloud-like shapes that match illustration style.

– Badges MAY:
  • be slightly tilted with the text,
  • look like sticky labels,
  • be perfectly horizontal or with a small angle.

– Key requirements:
  • bright color (visual accent),
  • strong contrast between badge and text,
  • big enough so text is instantly readable.

– Offer (if present) and CTA must be visually connected:
  • placed next to each other or one above the other,
  • in the same area, not in opposite corners.

--------------------------------------------------
BADGE PASHKA VISUAL LAWS
--------------------------------------------------
– Badges act as visual anchors:
  • they highlight CTA and offer,
  • they guide the eye to “what to do now”.

– Color:
  • bright but not neon-toxic,
  • ideally brand colors or strong contrasts with background
    (orange, yellow, blue, green, etc.).

– Shape and style:
  • multiple shapes allowed:
    – geometric (rectangles, pills),
    – paint strokes, torn edges,
    – clouds, ribbons,
    – small meme-style stickers.
  • Slight wobble or tilt is allowed to enhance meme feeling.

– Text inside badges:
  • large font, no tiny sizes,
  • max 3–5 words,
  • no extra fine-print explanations.

--------------------------------------------------
CONTENT ALIGNMENT (MEME + AVATAR)
--------------------------------------------------
– Text structure is like photo+text:
  hook → support → (optional offer) → CTA.

– Content MUST:
  1) use triggers from Extended Avatar
     (pains, fears, CJM loops, objections, outcomes),
  2) feel like a caption written specifically for THIS meme:
     the viewer immediately connects the lines
     with the visual joke.

Example (structure only):

– Exhausted avatar with huge coffee cup, Excel on laptop:
  • Headline: “Fourth coffee for one report?”
  • Support: “We know this manual Excel hell.”
  • Offer badge (if brief has offer): “-20% on automation course.”
  • CTA: “Learn to automate.”

--------------------------------------------------
TONE & SAFETY
--------------------------------------------------
– Humor:
  • self-deprecating, based on work/financial stress,
  • no insults, no offensive stereotypes.

– Focus on:
  • manual Excel/Sheets work,
  • panic about metrics or balance,
  • launch chaos, boss pressure,
  • stuck income, fear of mistakes, fines.

– Product is framed as:
  • the escape from the meme situation,
  • not just a corporate banner.

--------------------------------------------------
READABILITY
--------------------------------------------------
– Main text must not sit too close to extreme edges
  (especially bottom 20% and top 10%) because of platform UI.

– Fonts:
  • large, high-contrast,
  • similar in feel to native social meme captions
    (Impact/Arial-style bold sans-serif or simple bold fonts).

SUMMARY FOR MEME-CREO:
– VISUAL: one cartoon meme scene
  (no multi-panel comics).
– TEXT: up to 3 main text surfaces
  (hook, support, one offer/CTA block) plus a few short labels.
– BADGES: bright accent shapes (buttons, stickers, strokes)
  that highlight CTA and offer.
– CONTENT: tightly tied to avatar’s pains and the meme joke,
  while remaining a clear advertising message.

--------------------------------------------------
WHAT TO GENERATE FOR THIS FORMAT
--------------------------------------------------
IF FORMAT = "MEME-CREO":

Image Text:
– Headline (max 6-8 words, sarcastic hook).
– Support line (max 10-12 words, explains pain/outcome).
– Offer text ONLY IF brief contains an offer.
– CTA text (on button).
– Optional short object labels (max 1-3 words).
– STRICTLY NO bullet points, no numbered lists, no long paragraphs, no checklists.

Brief for Designer:
– Specify:
  • the exact meme scene (e.g. "Exhausted character with coffee").
  • location of the headline, support line, and CTA/offer badges.
– Emphasize:
  • NO comic strips, just ONE scene.
  • NO bullet point columns or checkmarks.
  • Text must be large and readable, without any fine print.`;

    
    } else if (fmt.includes('mockup') || fmt.includes('мокап') || fmt.includes('mockup-creo')) {
      formatRulebook = `
==================================================
FOR "MOCKUP-CREO" FORMAT (Special Rules):
==================================================

ROLE
This is a direct-response product ad whose hero visual is a clean 3D-rendered mockup of
the digital product itself — a book, laptop, desktop monitor, phone, tablet, or a mix of
these — presented on a flat, non-photographic background, paired with bold, large,
direct-conversion-style text (headline, subheadline, product name, optional offer/price,
CTA). This format does NOT use a photographic scene of any kind; the mockup itself is the
entire visual, the way a digital-product sales page presents its deliverable.


LANGUAGE & SCRIPT (CRITICAL FOR CYRILLIC)

– Render all text in the language selected in the brief.

– If the selected language is Russian or Ukrainian, use NATIVE CYRILLIC SCRIPT for all
  Russian/Ukrainian text elements (headline, subheadline, product label, offer badge,
  CTA).

– Brand names, product names, or domains explicitly given in Latin script in the brief
  (e.g. "DataBI", "Excel Pro", "data-bi.com") MUST stay in Latin script — do NOT forcibly
  convert them to Cyrillic.

– Do NOT mix Latin and Cyrillic characters inside a single word (no hybrid spellings like
  "РRODUCT", "Курс EXCEL").

– Do NOT transliterate Cyrillic words into Latin (e.g. "kurs Excel" instead of "курс
  Excel") — always use native Cyrillic spelling for Russian/Ukrainian words.

– NEVER invent, distort, or mutate a word to make it fit a headline, label, or badge.
  Every rendered word must be a real, correctly spelled word that exists in the target
  language's dictionary. Do not create non-existent words by merging, truncating mid-word,
  swapping letters, or altering endings.

– Double-check every longer or multi-syllable word letter by letter before finalizing —
  these are the most common source of invented or garbled Cyrillic spelling, especially
  under the tight word limits below.

– If a phrase must be shortened to fit a word limit, shorten it by REMOVING WHOLE WORDS,
  never by cutting or altering letters inside a single word.

– If the brief already wraps the product name (or any phrase) in quotation marks, render
  it with ONLY ONE pair of quotes total in the final image. Never double the quotation
  marks. Use a single consistent quote style throughout (either "..." or «...»).

– For other languages, use the appropriate native script as defined in the brief.

– THESE CYRILLIC-ACCURACY RULES APPLY EVERYWHERE IN THE IMAGE — including any incidental
  text visible on a mockup's screen or cover beyond the elements labeled below. There is
  no part of the banner where incorrect or invented Cyrillic is acceptable.

– Before finalizing, verify every text element is in correct Cyrillic (for Russian/
  Ukrainian briefs) with no accidental Latin characters, no mixed scripts, no invented
  words, and no duplicated quotation marks.


QUOTATION MARKS & TEXT DELIMITERS

– In instructions to the image model, wrap each text element in double quotation marks
  "..." to mark the exact phrase that must appear on the creative.

– These outer quotation marks are NOT part of the visual text and MUST NOT be rendered in
  the final image. Only the text inside them should appear.

– If the text itself includes quotation marks (e.g. «Excel для фінансистів»), you MUST
  render those inner quotation marks exactly as written in the brief.

– Never add extra quotation marks around text unless they are explicitly present in the
  brief.


TEXT LENGTH & CYRILLIC (SUMMARIZATION)

– Respect all word limits defined below for each text element (headline, subheadline,
  product label, offer badge, CTA).

– For Russian/Ukrainian (Cyrillic) text these limits are STRICT: if the original brief
  contains longer phrases, summarize them into shorter, clearer lines BEFORE passing them
  to the image model, preserving meaning and tone while reducing length to improve
  spelling accuracy and layout quality.


TECHNICAL TEXT PROMPTING (FOR IMAGE MODEL)

– Provide each text element to the image model as a labeled phrase in double quotation
  marks:

  Main headline: "..."
  Subheadline: "..."
  Product label: "..."
  Offer badge: "..."        (only if an offer, price, or promo exists in the brief)
  CTA button: "..."

– Labels like "Main headline:", "Product label:" are for instruction only and MUST NOT
  appear on the rendered image.

– The image model must render exactly the phrases inside "..." as visible text, without
  inventing new words, changing the script, or altering the language.

– HIGHEST-RISK ZONE: the main headline (tight word limit) and the product label (must
  render verbatim, can never be simplified to reduce risk) are the highest-risk elements
  for invented or garbled Cyrillic on this format. Apply extra letter-by-letter care to
  both. Any words accompanying a price inside the offer badge (e.g. "СЕГОДНЯ", "ТОЛЬКО")
  follow the same accuracy rules as every other element.


SCRIPT CONSISTENCY CHECK (FOR RUSSIAN/UKRAINIAN)

– Before generating the final image prompt for Russian/Ukrainian creatives, verify that
  every Russian/Ukrainian text element (headline, subheadline, product label, offer badge,
  CTA) uses proper Cyrillic script.

– If any Russian/Ukrainian word is accidentally written with Latin characters but should
  be Cyrillic, convert it to proper Cyrillic spelling, preserving pronunciation and
  meaning.

– Keep Latin script ONLY for brand names, product names, or domains explicitly given in
  Latin script in the brief.


TEXT STRUCTURE (MANDATORY)

1. MAIN HEADLINE (max 3-4 words)
   – The single largest text on the banner, the hook of the whole creative.
   – Must express one clear pain, desire, transformation, or hook — not a generic label.
   – May span 2-3 lines to stay huge; wrap the line rather than shrink it.

2. SUBHEADLINE (max 4-5 words)
   – One short line directly under the headline, explaining one key benefit or outcome —
     not multiple ideas.
   – Must read as a strong second line, never a small caption.

3. PRODUCT LABEL (MANDATORY)
   – EXACT wording from the brief, verbatim, kept in quotes if the brief provides quotes —
     never rewritten, shortened, translated, or paraphrased.
   – PRIMARY RENDERING: the product label is the title shown ON the primary mockup itself
     — printed on the book cover, or displayed on the primary screen per SCREEN CONTENT
     below — in large, bold, cover-appropriate typography that dominates the mockup's own
     surface. This is real title/cover design, not a caption pasted onto the mockup.
   – OPTIONAL SEPARATE TEXT LINE: if the brief or layout calls for the product label to
     ALSO appear as its own banner text line outside the mockup (e.g. as a second
     headline-style line near the main text block), that separate line follows the same
     size rules as the other banner text elements below (equal to or larger than the
     subheadline, never shrunk).

4. OFFER BADGE (OPTIONAL)
   – Only present if the brief explicitly contains a real promo, bonus, guarantee,
     deadline, or price. Render it EXACTLY as given — never invent, round, or alter a
     number or wording.
   – TEXT-ONLY OFFER: 2-4 words (e.g. "365-DAY MONEY BACK GUARANTEE", "BONUS INCLUDED").
   – PRICE OFFER: if the brief provides a price, show it plainly (e.g. "ONLY $7"). If the
     brief provides both an original and a discounted price, show the original price with
     a strike-through next to the new price (e.g. "$97" struck through, "$5" large beside
     it).
   – Rendered inside its own bold circular or rounded badge shape near the CTA or beside
     the mockup — a distinct visual anchor.
   – If the brief contains no explicit offer or price, render NO badge and invent nothing.

5. CTA BUTTON (MANDATORY)
   – 1-3 words, a clear action verb, no ending punctuation, inside a solid bright button.
   – Do NOT use pain/desire language inside the button text; keep it a simple, confident
     action.


CASE STYLE BY ELEMENT

– ALL text elements — main headline, subheadline, product label (wherever rendered),
  offer badge, and CTA button — render in UPPERCASE. A single consistent
  all-caps system reads as one strong, punchy visual block and shows fewer Cyrillic
  spelling errors than mixed sentence-case.


TEXT SIZE HIERARCHY (STRICT PROPORTIONS — the most important rule)

– Headline = 100% (baseline, the largest element on the banner).
– Subheadline = at least 40-45% of the headline's font size — a strong supporting line,
  never fine print.
– Product label = equal to or larger than the subheadline, when ALSO shown as a separate
  banner text line; its on-mockup rendering (book cover / primary screen) is sized to
  dominate that surface instead.
– Offer badge = at least 45-50% of the headline's font size when it carries a price (a
  price is usually a core part of the hook and deserves strong prominence) — otherwise,
  for a text-only guarantee/bonus offer, similar size to the subheadline is sufficient.
– CTA button = at least 45-50% of the headline's font size — large, bold, easy to read at
  a glance, inside a visually substantial button.

– VERIFICATION CHECK: compare the actual rendered CAP-HEIGHT of each element, not the
  length of the phrase. If any element other than the headline looks small, weak, or
  secondary, enlarge it before finalizing.


TEXT SIZE — ABSOLUTE ANCHORS (in addition to the relative hierarchy above)

– Headline capital letters: roughly 8-11% of the banner's total height.
– Subheadline, offer badge, and CTA capital letters (as banner text): ALL of these must
  be roughly THE SAME size as each other — approximately 4-5% of the banner's total
  height, treated as a single shared minimum tier. None of these three should look
  smaller than the others.
– Product label, if ALSO rendered as a separate banner text line (per TEXT STRUCTURE
  above), follows this same 4-5% floor. Its primary rendering — printed on the mockup
  itself — is sized to dominate the mockup's own cover or screen instead, not measured
  against banner height.
– This is a hard minimum, not a target to shrink toward. At this size, every element in
  the shared tier should look clearly bold and substantial, easy to read from a normal
  phone-scroll distance.

– FILL THE OPEN SPACE: if there is unused open space in the composition, ENLARGE the text
  and increase spacing between elements until the space is used — NEVER shrink text to
  leave the composition sparse.

– WIDTH-AWARE SCALING: the percentages above assume a roughly square or landscape canvas.
  For TALL/NARROW formats (4:5, 9:16), if text at the specified height would overflow the
  available width, WRAP it into more lines rather than shrinking below these minimums.


CROSS-MODEL ENFORCEMENT — TEXT SIZE IS NON-NEGOTIABLE

– If fitting text at the required size would make it touch or slightly exceed the frame
  edges, that is the CORRECT outcome — prefer text that slightly crowds its zone over text
  that is safely small and comfortable.
– Do NOT auto-shrink any element to create extra whitespace or "safe margins" around it.


TEXT COLOR

– Text color is left to the model's own creative judgment for each generation — no fixed
  palette, no forced color-per-meaning rule, no restriction on which colors may be used.
  Choose whatever color(s) best fit the background and the message's tone.


LEGIBILITY

– Use heavy, bold typography as the primary legibility tool.
– Every letter must have a SOLID, fully filled interior — never a hollow, outline-only, or
  see-through letter shape.
– A thin, clean outline or stroke around each letter (small and subtle, not a thick
  cartoon border) plus a soft drop shadow are recommended for extra contrast, especially
  where text sits near the edge of a mockup object or a textured background — but on a
  clean flat background, bold weight and color contrast alone are often sufficient.
– Do NOT add a solid panel or card behind the headline/subheadline/product label to solve
  legibility — solve it with weight, size, and contrast instead.


SEMANTIC MESSAGE STRUCTURE

– Before writing the text, identify the single core message from the brief. Build every
  element around THIS message — do not fall back on generic phrases if the brief contains
  a specific pain, number, or outcome.
– The elements should read as ONE connected argument, in this order: PROBLEM/DESIRE
  (headline) -> BENEFIT/MECHANISM (subheadline) -> PRODUCT (product label) -> PRICE/OFFER
  (if present) -> ACTION (CTA). Each element should logically follow from the one above
  it.
– SANITY CHECK: read all elements together as one sentence flow. If a reader could not
  explain, from the text alone, what the product is and what to do next, tighten the
  wording — without exceeding the word-count ceilings above.


VISUAL STYLE — PRODUCT MOCKUP COMPOSITION

This format's hero visual is NOT a photograph — it is a clean 3D-rendered product mockup
presented against a flat, non-photographic background.

DEVICE TYPE — ${params.deviceType?.join(', ') || 'laptop'}
Render the mockup(s) as the device type(s) specified in the brief: book, laptop, desktop
monitor, phone, tablet, or a mix of these. If the brief specifies a mix, combine different
device types in one composition (e.g. a laptop with a phone beside it) rather than
repeating a single type. If the brief specifies a single type repeated, render multiple
instances of that same type instead (e.g. three copies of the same book from different
angles).

Per-device rendering:
– BOOK: a realistic hardcover or spiral-bound mockup, angled 3/4 view, soft drop shadow
  beneath it. The cover displays the product label in bold, cover-appropriate typography —
  real book-cover design, not a screenshot pasted onto a rectangle.
– LAPTOP: an open laptop, screen angled 15-30 degrees, viewed from a slight front angle.
  Screen content per SCREEN CONTENT below.
– DESKTOP MONITOR: a monitor on its stand, near-frontal or very slight angle. Screen
  content per SCREEN CONTENT below.
– PHONE: a vertical phone mockup. Screen content per SCREEN CONTENT below.
– TABLET: same logic as laptop but without a keyboard base. Screen content per SCREEN
  CONTENT below.

MOCKUP COUNT — ${params.mockupCount || 1}
– COUNT 1: a single hero mockup, large and centered, the clear focal point of the frame.
– COUNT 2-3: one PRIMARY mockup (${params.primaryMockup || 'whichever device best anchors the composition'}) (largest, most central, sharpest) plus 1-2 supporting
  mockups layered behind or beside it, smaller and slightly overlapping or stacked — never
  scattered as separate unrelated objects.
– COUNT 4-5: a fanned or cascaded cluster of mockups radiating from a central point, or a
  symmetric grid/stack arrangement — all objects clearly belonging to ONE unified product
  presentation, not a loose collection of unrelated items.
– Regardless of count, exactly ONE mockup is always visually PRIMARY. The brief may
  specify which device is primary; if it does not, default to whichever device best
  anchors the composition (a book, laptop, or monitor typically anchors better than a
  phone alone).

SCREEN CONTENT (for laptop/desktop/phone/tablet mockups)
– The PRIMARY mockup's screen displays the product label in large, clear, legible
  typography, styled like a title card or cover — not a busy interface.
– SECONDARY mockups' screens may show EITHER the product label again, OR abstract,
  thematically relevant graphics: simple growth charts, bar graphs, dashboard-style
  panels, checklists, or icon grids that evoke the creative's theme.
– NEVER render on any screen: photographs of people, furniture, everyday objects, or any
  literal scene. Screens stay abstract, graphic, or typographic — never photographic or
  figurative.
– If any small on-screen text's legibility cannot be guaranteed, render it soft,
  out-of-focus, or as abstract shapes rather than risking garbled text — this does not
  apply to the product label itself, which must always render clearly per the rules above.

BACKGROUND
– A clean, flat or gently gradiented background — a solid brand color, a soft two-tone
  gradient, or a very subtle abstract texture (thin line patterns, soft radial glow behind
  the mockup cluster). NOT a photograph and NOT a literal scene.
– The background must never compete with the mockup or the typography — keep it calm and
  uncluttered.
– Do NOT default to the same background treatment every time; vary it across a batch of
  generations for the same brief.

MOCKUP LIGHTING & FINISH
– Clean, soft studio-style lighting on the mockup(s) — subtle highlights, soft shadows,
  slight reflections on glass/screen surfaces. Polished and professional, not harsh or
  dramatic.
– Consistent lighting direction across all mockups in a multi-object composition, so they
  read as one coherent render, not mismatched pasted-together objects.


NO VISUAL METAPHOR — THIS FORMAT DOES NOT USE THE METAPHOR BANK

– Unlike Photo+Text, Before/After, or Meme-Creo, this format's hero visual is never a
  metaphor for the product — it IS the product, rendered as a mockup. Do not invoke the
  scripts stage's Visual Metaphor Bank or substitute the mockup with a symbolic object;
  render the literal device(s) specified by ${params.deviceType?.join(', ') || 'laptop'} instead.


NO PEOPLE ANYWHERE IN THIS FORMAT

– This format never shows a visible person, avatar, or human figure anywhere in the
  composition, regardless of ${params.peoplePresence || 'any instructions'} — the entire visual is inanimate product
  mockups on a clean background.


COMPOSITION — TEXT & MOCKUP ARRANGEMENT

Choose ONE of two layouts per generation, varying across a batch rather than defaulting to
the same one every time:
– STACKED (three zones, top to bottom): headline and subheadline sit in the TOP zone; the
  mockup composition sits in the MIDDLE zone as the visual anchor; offer badge and CTA
  sit together in the BOTTOM zone, below the mockup.
– SPLIT (two columns): the full text stack (headline, subheadline, offer badge, CTA)
  occupies one side of the frame as a single column; the mockup composition fills the
  other side as a full-height visual column.
– Choose whichever suits the mockup count and aspect ratio best for this specific
  generation — a single tall book mockup often suits SPLIT well; a wide fanned cluster of
  4-5 mockups often suits STACKED well. Neither layout is tied to a fixed count.


SAFE MARGINS & READABILITY

– All text elements and the mockup composition MUST stay inside safe margins: keep at
  least 10-15% empty space from each edge of the banner.
– No text or mockup may touch or be cropped by the edges under any circumstances.
– If the layout feels dense, shorten the copy first — per SEMANTIC MESSAGE STRUCTURE above
  — rather than shrinking text size or the mockup.

FINAL RULES FOR THIS OUTPUT STAGE

– The quoted phrases inside the assembled prompt are rendered as visible text on the
  banner; every other word is an instruction only and must NOT appear on the image.
– The image model must render every quoted phrase exactly as written, character for
  character — no rewording, no script changes, no invented words. For Russian/Ukrainian,
  verify every quoted phrase is correct Cyrillic before finalizing.
– Do not add labels like "Headline:" or "CTA:" inside the quoted phrases themselves.
`;
} else if (fmt.includes('comic') || fmt.includes('\u043a\u043e\u043c\u0456\u043a\u0441')) {
      formatRulebook = `
==================================================
FOR "COMIC-CJM" FORMAT (Special Rules):
==================================================

A single-page CLASSIC COMIC that visualizes the avatar's journey (CJM) from pain to desired outcome in multiple scenes. Visual style = traditional comic book page (panels, speech bubbles, bold colors), with MINIMAL, LARGE text. This is still an AD: it must include a clear OFFER badge and CTA pashka.

PAGE & PANEL STRUCTURE:
– One page composed of 4–7 panels (scenes). Minimum 4 panels so the CJM path (pain -> crisis -> intervention -> outcome) is fully visible.
– Panels may have different sizes: key scenes (starting pain, crisis, final outcome) can be larger; intermediate steps smaller. Whole composition MUST have clear frames and gutters and read as ONE chronological sequence.

SEQUENCE RULES: Panels MUST show an obvious order via numbered badges (1, 2, 3, 4, 5, 6, 7) or connected with arrows. Reading path: top row -> bottom row, or left -> right, or a clear zig-zag / L-shaped flow. No random scatter.

CJM & AVATAR MAPPING (STORY CONTENT):
PANEL GROUP 1 (1–2 panels) – STARTING PAIN: Avatar stuck in pain loop: chaotic tasks, manual Excel reports at night, CRM crashes, burnout. Emotions: tired, anxious, overwhelmed. Text: short speech bubbles from avatar pains + CJM symptoms.
PANEL GROUP 2 (1–2 panels) – CRISIS / REALIZATION: Pain peaks: deadlines on fire, errors, sleepless nights. Insight: "this can't go on". Emotions: panic, frustration, determination. Text: short line from fears/objections and crisis insight.
PANEL GROUP 3 (1–2 panels) – INTERVENTION (PRODUCT/COURSE): Avatar discovers and starts using the product. Scene: screen with clear structure, funnel view, action plan. Emotions: focus, hope, clarity. Text: short line from motivations.
PANEL GROUP 4 (1–2 panels) – OUTCOME: Avatar in new reality: predictable client flow, stable income, remote work, launches without chaos, normal sleep. Emotions: confident, calm, happy. Text: short line from outcomes.

GLOBAL TEXT LIMITS: Whole page: MAX 10 text elements total. Per panel: MAX 2 text elements. Each text element: MAX 9 words, large comic-style lettering readable on a phone screen.

VISUAL STYLE: Traditional comic frames with clear gutters, dynamic compositions. STRICTLY avoid violence, blood, weapons, horror. Characters: human or simplified cartoon figures with readable emotions. Colors: use user brand palette if provided; otherwise 2–3 harmonious dominant colors. Avoid harsh neon acid colors.

OFFER & CTA PLACEMENT (MANDATORY):
– ONE distinct OFFER pashka: card or pill with short offer text, placed below the last row of panels. Large enough to be readable on a smartphone. Max 1–2 short lines.
– CTA MUST be rendered as its own button/pashka. Can be combined with the offer badge on one wide pashka.
– Visual style: same logic as PHOTO+TEXT (primary/accent brand colors, soft rounded rectangles/pills, subtle shadow).

OPTIONAL BULLETS: 1–3 short bullets/mini-icons below the OFFER/CTA if there is room (each max 3–5 words). Count toward the GLOBAL TEXT LIMIT.

SUMMARY: A classic comic page – 4–7 sequential CJM scenes, minimal large text (up to 10 text elements total), clear emotional arc "before -> crisis -> solution -> after". PLUS: one visible OFFER badge, one CTA pashka, optionally 1–3 short bullets of key benefits.`;

    } else if (fmt.includes('\u0456\u043d\u0444\u043e\u0433\u0440\u0430\u0444') || fmt.includes('infograph')) {
      formatRulebook = `
==================================================
FOR "INFOGRAPHIC" FORMAT (Special Rules):
==================================================

GENERAL ROLE
This format is built on DATA VISUALIZATION and STRUCTURED LOGIC.
It must break down complex information (processes, comparisons, statistics, steps)
into highly scannable, visual chunks that feel dense and impactful.

Do NOT use realistic photography in this format.
Use only diagrams, charts, icons, and flat/3D-style vector graphics.

TEXT STRUCTURE (MANDATORY – DATA DRIVEN)
Do NOT write full paragraphs or long sentences.
All text must be ultra-short and attached to a visual element.

1. GLOBAL HEADLINE (TOP – HOOK)
   – One big, bold line at the top of the canvas.
   – It must work as a HOOK about the avatar’s pain or desired outcome,
     not just a neutral label.
   – Examples (structure only):
     • “From manual chaos to precise finance”
     • “Debit vs credit: before vs after automation”
     • “Your evenings belong to you, not Excel”
   – Max 8–10 words, no emoji.

2. DATA POINTS / STEPS (3 to 5 ITEMS)
   This is the core of the infographic.

   Each item MUST have:
   – A large Number, Percentage, or Icon
     (e.g. “1”, “+3 hours/day”, “-50% report time”, money stack icon).
   – A bold short label (1–3 words)
     (e.g. “Manual checking”, “Human error”, “Accurate data”).
   – A micro-description (max 3–5 words)
     (e.g. “Copy–paste routine”, “Every digit in doubt”).

   All labels and micro-descriptions must be logically derived from:
   – the current scenario,
   – the avatar’s pains, fears, outcomes, and objections
     (GLOBAL PROMPT handles exact trigger selection).

3. OFFER & CTA (BOTTOM – BADGES ONLY)
   – If the brief includes any offer (discount, bonus, deadline),
     the infographic MUST show it inside a clear OFFER BADGE,
     not just as small footer text.
     • Shape: card or pill, similar to PHOTO+TEXT CTA style.
     • Example (structure only):
       “DISCOUNT -20% until the end of the week”.

   – The CTA MUST be on its own CTA BADGE or directly combined
     with the offer badge:
     • Examples (structure only):
       “Apply now”, “Start learning”, “Get control”.

   – Visual rules:
     • Large, readable font.
     • High-contrast color (brand accent).
     • Placed in the lower part of the canvas,
       but not touching the bottom edge
       (keep safe margin for social UI overlays).

   – Optional:
     • A single short product descriptor near the badges
       (max 1 line, 4–6 words),
       e.g. “Excel course for accountants”.

   – Do NOT:
     • hide offer/CTA only as fine-print footers,
     • render offer/CTA inside comic-style bubbles.

LAYOUT / COMPOSITION (GRID OR FLOW)
You MUST use a structured layout.
Choose ONE layout type per creative:

OPTION 1 – SEQUENTIAL FLOW (Vertical or Horizontal)
– 3 to 4 steps arranged in a clear line
  (vertical column, horizontal row, or simple zig-zag).
– Cards should be visually close to each other:
  • consistent spacing,
  • clear continuous path (no huge empty gaps).
– Connect each consecutive step with ONE visible arrow or dashed line:
  • Step 1 → Step 2 → Step 3 → Step 4 (if present).
– Arrows must be thick and visible enough
  to clearly show direction of movement.
– Maximum 1 connecting line per step (no spider webs).
– The flow must read in a clear direction (top-to-bottom or left-to-right).

OPTION 2 – COMPARISON SPLIT (Vs)
– Canvas is split into two structured columns:

  LEFT: “Before” / “Old way”
  RIGHT: “After” / “New way”

– Each side contains 3 BAD vs 3 GOOD items, aligned by row:
  • Left column: pain states, wasted time, low income, chaos.
  • Right column: desired states, saved time, higher income, clarity.

– Columns should occupy MOST of the canvas width:
  • each side feels like a solid panel,
  • not two tiny strips in the center.

– Between columns there is:
  • a clear dividing line or panel,
  • optional “VS” label at the center.

– Each item uses:
  • big number/icon,
  • short bold label,
  • 3–5-word micro-description.

OPTION 3 – HUB LAYOUT (Center + Orbit)
– Central main graphic:
  • laptop with dashboard,
  • simple bar/line/pie chart,
  • or product/system icon (shield, cog, rocket, etc.),
    using subtle 3D depth/lighting if desired.

– The central object must be visually strong:
  • larger than satellites,
  • immediately conveying the main concept
    (e.g. “Automation shield”, “Excel control panel”).

– Around the center, 3 to 4 data points orbit like satellites.
– Each satellite has:
  • icon/number,
  • short label,
  • micro-description.
– Connect each satellite to the center with ONE thin line or arrow.
  • Max 4 connecting lines total to avoid visual noise.

VISUAL STYLE & ICONS ("CLEAN, VECTOR OR LIGHT 3D")
– Background:
  • MUST be clean, solid, or a subtle gradient.
  • No realistic photos, no busy textures.

– Elements:
  • High-end modern UI look:
    cards, pills, banners, simple charts, minimal icons.
  • Icons can be flat or LIGHT 3D-styled:
    – simple depth, soft shadows, gradients,
    – avoid photorealistic 3D and noisy effects.

– Bounding boxes:
  • Use distinct cards/pills to separate each data point.
  • Soft rounded corners, subtle shadows, consistent stroke width.

– Color palette:
  • Use either:
    – user-provided brand colors from the brief,
    – or system brand tokens (primary, secondary, accent).
  • Avoid acid neon colors that break readability.
  • Ensure high contrast between text and background
    for all labels and numbers.

VISUAL DENSITY & SCALE
– Infographics should feel VISUALLY DENSE and impactful,
  not empty or overly minimal.
– At least 60–70% of the canvas area should be actively used
  by cards, charts, icons, and badges (not just blank gradient).
– Cards and icons must be LARGE enough to be clearly legible
  on a phone screen:
  • avoid tiny cards floating in a huge background,
  • prefer bigger blocks with strong presence.

TEXT SIZE & HIERARCHY
– The global headline must be visually dominant:
  • font size larger than any card label.
– Each card’s main label (bold short line) MUST use
  a font size only one step smaller than the headline.
– Micro-descriptions (3–5 words) must remain readable:
  • no fine-print,
  • if necessary, simplify the text instead of shrinking the font.

SAFE MARGINS & READABILITY
– Maintain generous negative space between cards, charts, and arrows,
  but without leaving most of the canvas empty.
– Do NOT let charts or text boxes touch:
  • each other,
  • or the canvas edge.
– Keep at least ~15% margin from all sides of the canvas.
– Keep offer/CTA badges away from the very bottom edge
  (reserve space for social UI overlays).

BEHAVIORAL SUMMARY FOR INFOGRAPHIC FORMAT
– Think of this format as:
  • a slide from a premium pitch deck,
  • or a high-end Pinterest infographic,
  adapted to the avatar’s pains, CJM path, and outcomes.

– The DESIGNER BRIEF generated by the model must:
  • explicitly state which layout type is used (Flow, Comparison, or Hub),
  • list each data point (number/icon + label + micro-text),
  • specify:
    – where arrows/lines appear (one per logical connection),
    – the exact position and text of the OFFER badge and CTA badge,
    – how dense the composition should be
      (cards fill most of the canvas, central object size, etc.),
  so the visual designer can render the infographic without ambiguity.`;

    } else if (fmt.includes('\u0444\u043e\u0442\u043e') || fmt.includes('photo')) {
      formatRulebook = `
FORMAT: PHOTO + TEXT BANNER (OVERLAY) – Integrated Big Text Layout

GOAL
A stunning, billboard-style banner where a single, full-bleed photo serves as the background, and LARGE text is integrated directly into the empty spaces of the photo. 
The text should NOT be squeezed into one tiny clustered block, but should breathe and span across the available free space (e.g., top-left to bottom-left).

IMPORTANT OFFER LOGIC (NO INVENTED DISCOUNTS)
– The banner MUST NOT invent any offer, discount, bonus, or guarantee
  that is not explicitly provided by the user.
– Offer/discount text appears on the banner ONLY IF the user’s brief
  contains a clear offer/discount field.
– If the brief does NOT contain any offer/discount:
  • there is NO offer badge on the banner,
  • there is NO discount text inside headline, description,
    product name, or CTA.

OVERALL COMPOSITION & TEXT PLACEMENT (CRITICAL)
– ONE full-bleed photo is the ONLY background.
– No split screens, no solid color blocks covering half the image. 
– The main object or character should be positioned to one side (e.g., right side) or in the center-right/bottom, leaving a large, clean "negative space" area (e.g., the entire left side or the top area) for the text.
– Text elements must be vertically distributed in this negative space:
  • BIG headline at the top.
  • Subcopy / Product Name in the middle.
  • CTA (and optional offer badge) at the bottom.
– Do NOT cluster all text into one tight tiny box. Let the text breathe vertically.
– The text should feel like it is printed directly on the photo. Use soft dark/light gradients behind the text if necessary for contrast, but do not use harsh solid shapes that cut the photo or split the screen.

--------------------------------------------------
TEXT LENGTH LIMITS (CRITICAL FOR CYRILLIC)
--------------------------------------------------
– HEADLINE:
  • Max 4–8 words.
  • Tone = ${params.toneOfVoice}.
  • Must be HUGE and highly readable.

– DESCRIPTION (SUBCOPY):
  • Max 1–2 short sentences (TOTAL 10–14 words)
    explaining the movement from chaos/pain to desired outcome.

– PRODUCT NAME (MANDATORY):
  • Max 3–6 words.
  • Distinct line stating the product name/role, e.g. “Курс «Excel для фінансистів»”.
  • Highlighted (color, bold, or subtle pill).

– OFFER BADGE (OPTIONAL):
  • Max 1 line, 3–5 words.
  • ONLY present if the brief explicitly contains an offer.
  • Placed on a bright pill/panel near the CTA.

– CTA BUTTON:
  • Clear action verb, up to 3 words.
  • Solid, bright button (panel) in the lower part of the text area.

--------------------------------------------------
TEXT HIERARCHY & DISTRIBUTION
--------------------------------------------------
– HEADLINE:
  • Occupies the UPPER part of the negative space.
  • Largest font on the banner.

– DESCRIPTION & PRODUCT NAME:
  • Located below the headline, in the middle of the negative space.
  • Smaller font than headline, but still readable.

– OFFER & CTA:
  • Located in the LOWER part of the negative space.
  • CTA is a solid button. Offer is a bright pill/tag placed directly near the CTA.

--------------------------------------------------
VISUAL TREATMENT & PHOTO INTEGRATION
--------------------------------------------------
– The photo must be naturally dark or have a dark gradient/vignette on the side where the text is placed, to ensure white/bright text is perfectly readable.
– DO NOT place text over the character's face or the main focal object. The text must live in the clean "negative space".
– No solid, opaque rectangular cards behind the entire text block. The text should lay on the photo background. 
– Only the CTA button and Offer badge use solid pill shapes.

--------------------------------------------------
PHOTO REQUIREMENTS
--------------------------------------------------
– Scenario:
  • Photo shows a relevant situation or object (office, laptop, charts, person at work).
– Composition:
  • The subject (person/object) is off-center or occupies one side/bottom, naturally leaving a large, dark, or blurred area for text.

--------------------------------------------------
BRANDING & TONE
--------------------------------------------------
– Tone of voice strictly equals ${params.toneOfVoice}.
– Logo (if any): Small, non-dominant, in a distant corner.

--------------------------------------------------
CONSTRAINTS
--------------------------------------------------
– Max elements on screen:
  • 1 headline, 1 description block, 1 product name line,
  • 1 optional offer badge (ONLY IF brief contains offer),
  • 1 CTA button, 1 logo.
– Headline and description still follow the global
  DIVERSITY MATRIX triggers (handled in main prompt).

--------------------------------------------------
WHAT TO GENERATE FOR THIS FORMAT
--------------------------------------------------
IF FORMAT = "PHOTO + TEXT":

Image Text:
– Headline (largest, no invented offers).
– Description (1–2 short sentences).
– Product name line (highlighted).
– Offer text ONLY IF the brief contains an offer.
– CTA text (on button).

Brief for Designer:
– Specify:
  • photo scenario and composition (e.g. "Person on the right, large dark negative space on the left").
  • vertical distribution of text in the negative space: Headline at the top, Description/Product in the middle, CTA at the bottom.
– Describe:
  • font hierarchy (headline huge, description smaller).
  • text placed directly on the photo background (using soft dark gradients for contrast), NOT inside a single solid box.
  • CTA is a solid button; Offer (if present) is a pill.
– Emphasize:
  • NO split screens and NO single tight clustered block of text.
  • Text must be spread out vertically in the negative space, integrating with the photo.`;

    } else if (fmt.includes('\u0442\u0435\u043a\u0441\u0442 \u043d\u0430 \u0431\u0456\u043b\u043e\u043c\u0443') || fmt.includes('text on white')) {
      formatRulebook = `FOR "TEXT ON WHITE" FORMAT (Special Rules):

ROLE
This is a minimalist text-first image creative.
The focus is on the message itself (text + simple background),
without complex graphics.

CORE IDEA
There are two equally important modes that must be represented
across the generated variants (approximately 50/50):

1) PRODUCT MODE — show the product structure and its components
   through a strong hook.

2) RECOGNITION MODE — show a highly relatable situation,
   pain, or internal monologue of the avatar in plain text
   (based on JTBD, CJM, pains, fears, motivations).

In BOTH modes the creative ALWAYS contains these text elements:
1. Main headline.
2. Body text.
3. Product name/role line (when the product is mentioned).
4. Offer/discount block (ONLY if a discount/offer is provided).
5. CTA (text-only pseudo-button).

--------------------------------------------------
TEXT LENGTH LIMITS (TEXT-ON-WHITE)
— CRITICAL FOR CYRILLIC RENDERING
--------------------------------------------------

– HEADLINE:
  • Max 4–6 words.

– BODY:
  • Max 1–2 short sentences.
  • TOTAL body length max 8–12 words.

– PRODUCT LINE:
  • Max 1 line, 3–6 words.

– OFFER:
  • Max 1 line, 3–5 words.

– CTA:
  • Max 2–3 words.

CRITICAL:
Visual AI models cannot render long Cyrillic texts without errors.
You MUST keep the text ultra-short, punchy, and billboard-style.

The overall impression must be:
“readable in 1 second”
rather than a long paragraph or story block.

IMPORTANT STRUCTURAL RULES (ANTI-GLITCH)
– The offer/discount line MUST be a separate text block,
  visually separated from body text and any lists by clear vertical spacing.
– The product name/role line MUST appear between body and offer
  whenever the product is mentioned, so it is clearly tied to the offer.
– The CTA pseudo-button MUST be placed BELOW the offer block
  with clear vertical spacing and MUST sit inside its own box/outlined area.
– Offer text and CTA must never share the same box
  or appear on the same line.
– In the Image Text field DO NOT use any bullet characters
  at the beginning of lines (‘-’, ‘—’, ‘•’).
– Icon characters (emoji, Unicode) MUST NOT appear in the Image Text.
– The Image Text must NOT include service labels
  such as “HEADLINE”, “BODY”, “OFFER”, “CTA”.
  Only output the actual final text for the creative.

--------------------------------------------------
MODE 1 — PRODUCT
(TEXT-ON-WHITE PRODUCT EXPLAINER)
--------------------------------------------------

HEADLINE:
– Short, punchy hook that relates to the main JTBD or core pain.
– Tone of voice = \${params.toneOfVoice}.
– Largest and most visually dominant line.
– Max 4–6 words.

BODY TEXT:
– 1–2 short sentences, total 8–12 words.
– Can include:
  • a compact list of max 2–3 ultra-short features
    (2 words each, e.g. “Fast reports”, “Error control”),
  • or a brief description of what is inside the product,
  • and/or the main result/outcome.
– Content must be grounded in the Product Avatar.

PRODUCT NAME / ROLE:
– One separate line between body and offer, e.g.:
  • “Excel course for accountants”.
  • “PM course for online schools”.
– Max 3–6 words.
– Same or slightly smaller than headline,
  bolder than body text.

OFFER/DISCOUNT (IF PROVIDED):
– Separate line or micro-block placed under product line,
  with extra vertical spacing.
– Typographically: medium size, bolder than body,
  smaller than headline.
– Max 3–5 words.
– Only generate this block if the brief explicitly contains an offer/discount.
– Offer must not be part of body text or combined with CTA.

CTA (PSEUDO-BUTTON):
– Short verbal action: 2–3 words.
– Examples: “Start course”, “Get access”, “Learn more”.
– Visually: text inside an outlined rectangle
  or lightly shaded/hatched box,
  placed below the offer block with clear spacing.
– Offer text must never share the same box
  or appear on the same line as CTA.

--------------------------------------------------
MODE 2 — RECOGNITION
(TEXT-ONLY EMOTIONAL INSIGHT)
--------------------------------------------------

HEADLINE:
– Sharp, emotionally charged line that calls out
  a concrete pain, fear, or recurring scenario
  from CJM/symptoms.
– Can be written as:
  • a quote from the avatar’s inner voice,
  • a short observation,
  • or a provocative question.
– Max 4–6 words.

BODY TEXT:
– 1–2 short sentences (8–12 words total) that deepen recognition:
  • detail the daily scenario (night work, errors, burnout,
    fear of boss/client),
  • or show the “pain loop” (try → fail → burnout),
  • or contrast “how it feels now” vs “how it could be”.
– Always tie back to JTBD, pains, fears or motivations
  from the Product Avatar.

PRODUCT NAME / ROLE (when relevant):
– One line stating what the product is
  and how it relates to this pain:
  • e.g. “Excel course for accountants – your confidence tomorrow”.
– Max 3–6 words.

OFFER/DISCOUNT (IF PROVIDED):
– Concise line connecting recognition to a concrete benefit/offer,
  separated from body by spacing.
– Same typographic status as in Product Mode:
  medium size, bolder than body, smaller than headline.
– Max 3–5 words.

CTA (PSEUDO-BUTTON):
– Short, calm action, natural next step:
  • e.g. “Get plan”, “Learn details”.
– Visually оформлена так же, как в Product Mode
  (outline or shaded box).
– Always placed below the offer block with clear spacing;
  separate box, no shared line with the offer.

--------------------------------------------------
VISUAL STYLE: BACKGROUND & TYPOGRAPHY
--------------------------------------------------

GENERAL:
– The creative must always look like “text + background”.
– Background options (examples, not exhaustive):
  • clean white background,
  • solid brand color or soft brand gradient,
  • imitation of notebook paper (grid or ruled),
  • chalk-like writing on a dark board,
  • sketch-like handwritten note.

CONTRAST & READABILITY:
– Always maintain high contrast between text and background:
  dark text on light background OR light text on dark background.
– Avoid low-contrast pastel-on-pastel combinations.
– All text must be legible on mobile:
  no ultra-thin fonts, no tiny sizes,
  no text over noisy texture.

SPACING & COMPOSITION:
– Safe margins from each edge: 10–15% of canvas.
– Inside those margins:
  • headline near the top margin,
  • body + product line grouped in the middle,
  • offer + CTA near the lower margin.
– No large empty bands between text blocks.
– Fill the canvas dynamically so text is HUGE
  and highly readable.
  Do not shrink text into a tiny block in the center.

TYPOGRAPHIC HIERARCHY:
– HEADLINE: largest, boldest.
– BODY: smaller, regular/medium weight.
– PRODUCT LINE: medium size, bolder than body.
– OFFER: medium size, bolder than body, below product line.
– CTA: same or slightly larger than body,
  inside pseudo-button.

HANDWRITTEN / SKETCH STYLE:
– At least ~30–40% of variants MUST use
  a handwritten or sketch-like treatment
  for the headline or CTA (or both):
  • marker-like headline on notebook paper,
  • dashed, hand-drawn CTA box,
  • small doodles near offer (sun, smiley, etc.).
– Even in handwritten style, readability is critical:
  thick strokes, high contrast,
  no overly decorative scripts.

--------------------------------------------------
ICONS / SKETCHES NEAR OFFER
--------------------------------------------------

– If an offer/discount block is present, ALWAYS add
  in the Brief for Designer a small hand-drawn-style icon
  next to it.

– Icon meanings follow DIRECT SALE logic:
  • Shield – safety, protection, no mistakes, legality.
  • Clock / Lightning – speed, automation, fast result.
  • Graph / Chart – growth, analytics, control over numbers.
  • Person / Team – support, human help, curator.
  • Checklist – structure, order, clear process.

– Icons must look like simple graphic symbols or mini-sketched pictograms,
  NOT like emoji.
– Icon must be described only in the Brief for Designer
  as a separate graphic element;
  do NOT include icon characters in the Image Text field.

--------------------------------------------------
LANGUAGE & ORTHOGRAPHY
--------------------------------------------------

– All image text must be written in language specified in the brief.
– Prefer simpler, shorter phrases to reduce risk of spelling errors.
– Avoid rare slang words or complex quotations
  that are easy to misspell.

--------------------------------------------------
WHAT WE GENERATE FOR THIS FORMAT
--------------------------------------------------

IF FORMAT = "TEXT ON WHITE":

Generate (Image Text):
– Headline text (without labels).
– Body text (1–2 short sentences).
– Product name/role line (when the product is mentioned).
– Offer/discount line (IF there is an offer).
– CTA text (pseudo-button).

In "Brief for Designer" you MUST describe:
– Background type (white, brand color, notebook paper,
  chalkboard, sketch note, etc.).
– Exact text hierarchy (headline, body, product line,
  offer, CTA).
– Placement of each text block on the canvas
  (top/middle/bottom).
– How the CTA is visually separated as a pseudo-button
  (outline, shading, dashed box, etc.).
– How the offer block is emphasized
  (medium size, bolder weight) and where the small icon sits.
– Assurance that all text stays inside safe margins
  and contrast is high.
– Explicitly state that no bullet characters, emoji,
  or service labels appear in the Image Text field.`;
    }

    return `ROLE You are a Data BI Creative Strategist. Your mission is not just to write texts. Your mission is to generate high-converting creative concepts (ideas, texts, scripts) that strike precisely at the psychological portrait of the target audience, forcing them to recognize themselves and click through to the site.

Brand Tone of Voice: ${params.toneOfVoice}
Friendly -> warm, conversational, informal ("you"), no pressure
Expert -> confident, factual, data and facts, authority
Provocative -> sharp hook, provocative question, challenging the status quo
Inspiring -> emotional uplift, transformation, "you can do it"

INPUT DATA:
COURSE / PRODUCT: ${params.productName}
SEGMENT / AUDIENCE: ${params.avatarData?.segmentName}
CREATIVE FORMAT: ${params.format}
NUMBER OF VARIANTS: ${params.count}
${params.focusDirection ? `SPECIFIC FOCUS: ${params.focusDirection}` : ''}
${params.promoOffer ? `PROMO OFFER: ${params.promoOffer}` : ''}
${params.peoplePresence ? `PEOPLE PRESENCE: ${params.peoplePresence === 'without_people' ? 'Strictly NO PEOPLE' : 'Mix of people and no people'}` : ''}
${params.colors ? `BRAND COLORS: Main ${params.colors.main}, Secondary ${params.colors.secondary}, Accent ${params.colors.accent}` : ''}

DYNAMIC BASE:
Detailed psychological portrait of the avatar:
${JSON.stringify(params.avatarData)}

${params.productBullets && params.productBullets.length > 0 ? `KEY PRODUCT FEATURES:\n${params.productBullets.join('\n')}` : ''}
${params.existingConcepts && params.existingConcepts.length > 0 ? `PREVIOUSLY GENERATED CONCEPTS (DO NOT REPEAT):\n${params.existingConcepts.join('\n')}` : ''}

FORMAT SPLITTING LOGIC:
IF FORMAT = IMAGE: 
✅ WHAT WE GENERATE: Texts (Hook, Pain, Solution, CTA) and COMPLETE TOR FOR THE DESIGNER (brand-guideline, colors, layout, element placement, size, reference). 
❌ WHAT WE DO NOT GENERATE: Script for a video editor, storyboard, timecodes, Voice Over.
IMPORTANT! In the "Image Text" field, output ALL EXACT TEXT that will be present on the creative (Headline, subheadlines, data points, labels, offer, CTA). Do NOT hide text in the designer brief! The total text volume is strictly controlled by the specific rules of the chosen creative format. In the "Brief for the designer", describe everything else: placement of each block, fonts, accents, background, color, order, CTA, references, size.

IF FORMAT = VIDEO: 
✅ WHAT WE GENERATE: Idea and Hook, COMPLETE SCRIPT FOR THE EDITOR (broken down by seconds, with indication of B-roll, TBE, VO, music, effects, packshot, CTA — EVERYTHING in one cell). 
❌ WHAT WE DO NOT GENERATE: TOR for the designer (colors, image layout), placement of texts on a static image.

⚠️ CRITICAL RULE: DIVERSITY MATRIX

To avoid repetition, EACH generated variant MUST:
1) focus on an absolutely DIFFERENT psychological trigger
   from the avatar's profile, and
2) use a DISTINCT visual concept (scene, composition, props)
   even within the same creative format.

TRIGGER LAYERS:
– Variant 1 (Functional/Pain):
  Focus on the main JTBD and an acute daily pain
  (from the "pains" section).

– Variant 2 (Deep Fear):
  Focus on deep anxieties
  (from the "fears" section — fear of AI replacement,
   fatal error in front of the boss, losing a client/job).

– Variant 3 (Symptomatic/CJM):
  A scenario built on the "pain loop"
  (from the "cjm" or "symptoms" section — working at night,
   burnout, anger).

– Variant 4 (Objection):
  Direct work with a barrier
  (from the "objections" section — "it's expensive",
   "no time to learn") and overcoming it.

– Variant 5 (Transformation):
  Emotional "before/after" contrast
  (from the "motivations" and "outcomes" sections).

If there are fewer or more than ${params.count} variants,
distribute the triggers so that the concepts
do not duplicate each other.

VISUAL DIVERSITY:
– For each variant, you MUST propose a unique visual idea:
  • different scene or environment (office, home, commute, meeting),
  • different main action (night work, boss conversation, family time,
    data chaos, calm control),
  • different composition and focal objects
    (laptop, calculator, dashboards, coffee, phone, paperwork).
– Do NOT reuse the same visual setup across variants
  (no “same desk + same posture + just new text”).
– Hooks, texts and visuals must feel like completely new ads,
  all still grounded in the same Extended Avatar.

STEP-BY-STEP ALGORITHM:
Define Product and Segment from INPUT DATA. Study the avatar for this segment. Define FORMAT (image or video). Generate ${params.count} variants, following the golden rules and the Diversity Matrix.

GOLDEN RULES OF TEXT GENERATION:
EMOTIONALITY: Write about feelings, not facts.
SPECIFICITY: Concrete numbers, time, amounts.
PORTRAITURE: For a specific person, not for everyone.
CONTRAST: It was HELL vs now it is GOOD.
RECOGNIZABILITY: People recognize themselves in the text.

OUTPUT STRUCTURE:
STRICTLY output the result as a Markdown Table. Do not use block format.

IF FORMAT = IMAGE:
| # | Концепція | ТЕКСТ КАРТИНКИ | БРИФ ДЛЯ ДИЗАЙНЕРА |
|---|---|---|---|
| [Number] | [Name] | [Text] | [All details] |

IF FORMAT = VIDEO:
| # | Концепція | СЦЕНАРІЙ | РАСКАДРОВКА |
|---|---|---|---|
| [Number] | [Name] | [Text] | [ALL breakdown BY SECONDS] |

Note for VIDEO: The script should be written fully by seconds/scenes. Include: Video sequence (describe actions, location, emotion), VO (Voice Over monologue or dialogue), TBE (Text By Eye accents), Music/Sound.
Note for IMAGES: Write the entire TOR for the designer with clear sections: Brand-guideline, Color palette (Background, Text, Accents), Element placement (Header, Pain, Solution, CTA, Discount, Logo), Visual, Size, Reference.

CHECKLIST BEFORE OUTPUT:
Product and segment defined? Avatar studied? Creative format defined?
IMAGE: TOR FOR DESIGNER generated?
VIDEO: SCRIPT FOR EDITOR generated?
Hook + Pain + Solution + CTA included?
Text written in the "voice" of the avatar?
Avatar's key objections taken into account?
EMOTION, SPECIFICITY, CONTRAST, RECOGNIZABILITY included?
All content in one cohesive section per variant?
Requested number of variants generated?

ADDITIONAL RULES:
Language: Generate ALL final creatives and TOR exclusively in ${params.language}.
Maximum detail: The more detailed the TOR and scripts, the better.
Product Name Usage: You MUST explicitly include and use the exact product name in the generated creative.

${formatRulebook}
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
  "backgroundHint": "Scene description for image generator. You MUST explicitly describe the exact text to render, the use of plates/badges/containers to prevent text overflow, and any requested icons. DO NOT forbid text.",
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
2. Explicitly include instructions to render the exact text from the brief on the image, making sure to place the text strictly inside distinct badges, plates, or containers to prevent overflow. Include relevant graphic icons as requested.
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


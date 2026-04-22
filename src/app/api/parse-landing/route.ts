import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AvatarToAdsBot/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: 400 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Убираем ненужные скрипты, стили, скрытые элементы
    $('script, style, noscript, iframe, img, svg, video, audio, [style*="display: none"]').remove();

    // Пытаемся извлечь только осмысленный текст (заголовки, параграфы, списки)
    const elementsToExtract = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'span', 'a', 'strong', 'b'];
    
    let extractedText = '';
    
    $(elementsToExtract.join(', ')).each((_, el) => {
      const text = $(el).text().trim();
      // Игнорируем слишком короткие куски (часто это мусор меню)
      if (text.length > 10) {
        extractedText += text + '\n';
      }
    });

    // Если 추출 ничего не дал, берем весь текст body
    if (extractedText.length < 100) {
      extractedText = $('body').text().trim();
    }

    // Очищаем множественные пробелы и переносы строк
    const cleanText = extractedText.replace(/\s{2,}/g, '\n').substring(0, 8000); // Ограничиваем ~8000 символов, чтобы влезло в контекст LLM

    return NextResponse.json({ content: cleanText });
  } catch (error: any) {
    console.error('Error parsing landing:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // --- 1. Обработка Google Документов (Docs) ---
    const googleDocMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (googleDocMatch) {
      const docId = googleDocMatch[1];
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        return NextResponse.json({ error: `Не удалось скачать Google Doc. Откройте доступ "Anyone with the link can view".` }, { status: 400 });
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      $('style, script').remove();
      let content = $('body').text().replace(/\n\s*\n/g, '\n').trim();
      return NextResponse.json({ content: content.substring(0, 50000) });
    }

    // --- 2. Обработка Google Таблиц (Sheets) ---
    const googleSheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (googleSheetMatch) {
      const sheetId = googleSheetMatch[1];
      // Экспорт всей книги в HTML позволяет увидеть все вкладки
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=html`;
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        return NextResponse.json({ error: `Не удалось скачать Таблицу. Убедитесь, что доступ к ней открыт по ссылке.` }, { status: 400 });
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Google Sheets в HTML формате выводит листы как отдельные таблицы или блоки
      // Убираем лишнее (стили, скрипты, навигацию вкладок)
      $('style, script, #sheet-menu').remove();
      
      let content = '';
      // Проходим по всем таблицам и ячейкам
      $('table tr').each((_, tr) => {
        let rowText = '';
        $(tr).find('td').each((_, td) => {
          const cellText = $(td).text().trim();
          if (cellText) rowText += cellText + ' | '; // Разделитель для понимания структуры колонок
        });
        if (rowText) content += rowText + '\n';
      });

      if (!content) content = $('body').text(); // Fallback если таблица пустая или сложная

      return NextResponse.json({ content: content.replace(/\n\s*\n/g, '\n').substring(0, 50000) });
    }

    // --- 3. Обработка обычных сайтов (Лендингов) ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AvatarToAdsBot/1.0',
      },
    } as any);
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: 400 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Извлекаем мета-данные
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';

    $('script, style, noscript, iframe, img, svg, video, audio, [style*="display: none"]').remove();

    const elementsToExtract = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'span', 'a', 'strong', 'b', 'td', 'th', 'section', 'article'];
    let extractedText = `META DESCRIPTION: ${metaDesc}\nOG TITLE: ${ogTitle}\nOG DESC: ${ogDesc}\n\n`;
    
    $(elementsToExtract.join(', ')).each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) extractedText += text + '\n';
    });

    if (extractedText.length < 500) extractedText = $('body').text().trim();

    return NextResponse.json({ content: extractedText.replace(/\s{2,}/g, '\n').substring(0, 30000) });
  } catch (error: any) {
    console.error('Error parsing:', error);
    return NextResponse.json({ error: error.message || 'Error parsing content' }, { status: 500 });
  }
}

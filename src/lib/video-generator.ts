import { createClient } from 'pexels';
import OpenAI from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
// @ts-expect-error
import ffprobeStatic from 'ffprobe-static';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Настройка FFmpeg (lazy, safe for build-time)
try {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
  if (ffprobeStatic?.path) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
  }
} catch (e) {
  // Ignore during build time
}

// Lazy initialization to avoid build-time crashes when env vars are unavailable
let _pexelsClient: ReturnType<typeof createClient> | null = null;
let _openai: OpenAI | null = null;
let _genAI: GoogleGenerativeAI | null = null;

function getPexelsClient() {
  if (!_pexelsClient) {
    _pexelsClient = createClient(process.env.PEXELS_API_KEY || '');
  }
  return _pexelsClient;
}

function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return _openai;
}

function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
  }
  return _genAI;
}

export interface VideoScene {
  scene_id: number;
  text: string;
  search_queries: string[];
  overlay_text: string;
}

// 1. Разбивка скрипта на сцены через LLM
export async function extractScenesFromScript(scriptText: string): Promise<VideoScene[]> {
  const prompt = `
Ты профессиональный AI-режиссер. Разбей следующий рекламный сценарий на сцены для видео.
Для каждой сцены определи:
1. text: Точный текст озвучки для этой сцены (Voiceover).
2. search_queries: Массив из 3-х коротких поисковых запросов на АНГЛИЙСКОМ языке для стоковых видео (от сложного к простому, макс 2-3 слова, например ["stressed businessman", "office stress", "laptop"]).
3. overlay_text: Короткий цепляющий текст, который появится на экране (максимум 5-6 слов).

Сценарий:
${scriptText}

Ответь ТОЛЬКО валидным JSON массивом, без маркдауна и лишних слов. Формат:
[
  {
    "scene_id": 1,
    "text": "...",
    "search_queries": ["..."],
    "overlay_text": "..."
  }
]
`;

  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.2 } });
  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/^```json/, '').replace(/```$/, '').trim();
  
  return JSON.parse(text);
}

// 2. Генерация TTS (Озвучка)
async function generateSceneAudio(text: string, outputPath: string): Promise<void> {
  if (!text || text.trim().length === 0) {
    // Создаем пустой аудио файл на 1 сек, если нет текста
    await new Promise((resolve, reject) => {
      ffmpeg().input('anullsrc').inputFormat('lavfi').duration(1).save(outputPath).on('end', resolve).on('error', reject);
    });
    return;
  }

  const mp3 = await getOpenAI().audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  
  // Добавляем 0.4 сек тишины в конец для плавности через FFmpeg
  const tempPath = outputPath + '.temp.mp3';
  fs.writeFileSync(tempPath, buffer);

  return new Promise((resolve, reject) => {
    ffmpeg(tempPath)
      .outputOptions([
        '-af', 'apad=pad_dur=0.4' // 0.4 секунды тишины
      ])
      .save(outputPath)
      .on('end', () => {
        fs.unlinkSync(tempPath);
        resolve();
      })
      .on('error', reject);
  });
}

// 3. Скачивание стокового видео
async function downloadPexelsVideo(queries: string[], outputPath: string): Promise<boolean> {
  for (const query of queries) {
    try {
      const response = await getPexelsClient().videos.search({ query, orientation: 'portrait', per_page: 5 });
      if ('videos' in response && response.videos.length > 0) {
        // Берем первое видео, ищем HD mp4
        const video = response.videos[0];
        const videoFile = video.video_files.find((f: any) => f.quality === 'hd' && String(f.file_type) === 'video/mp4') 
                       || video.video_files[0];
        
        if (videoFile && videoFile.link) {
          const res = await fetch(videoFile.link);
          const arrayBuffer = await res.arrayBuffer();
          fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
          return true;
        }
      }
    } catch (e) {
      console.error(`Pexels search failed for query: ${query}`, e);
    }
  }
  return false;
}

// Утилита для рендеринга одной сцены (Сборка Видео + Аудио + Текст)
async function renderScene(videoPath: string, audioPath: string, overlayText: string, outputPath: string, logoPath?: string, logoPos?: string): Promise<void> {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');
  
  // Получаем точную длину аудио, чтобы избежать бесконечного цикла ffmpeg при -stream_loop -1
  const audioDuration = await new Promise<number>((resolve) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      resolve(metadata?.format?.duration || 0);
    });
  });

  return new Promise((resolve, reject) => {
    let command = ffmpeg()
      .input(videoPath)
      .inputOptions(['-stream_loop', '-1']) // Зацикливаем видео, если аудио длиннее
      .input(audioPath);

    
    // Добавляем текст, если есть
    let filterGraph = '';
    const filters: string[] = [];
    
    if (overlayText && fs.existsSync(fontPath)) {
      const safeText = overlayText.replace(/'/g, "\\\'").replace(/:/g, '\\:');
      filters.push(`drawtext=fontfile='${fontPath}':text='${safeText}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=15:x=(w-text_w)/2:y=h-(h/4)`);
    }

    if (logoPath && fs.existsSync(logoPath)) {
      command = command.input(logoPath); // 2nd input
      const padding = 40;
      let overlayCoord = 'x=W-w-40:y=H-h-40'; // BR
      if (logoPos === 'TL') overlayCoord = 'x=40:y=40';
      if (logoPos === 'TR') overlayCoord = 'x=W-w-40:y=40';
      if (logoPos === 'BL') overlayCoord = 'x=40:y=H-h-40';
      
      // scale logo to max 150px
      filters.push(`[1:v]scale=150:-1[logo];[0:v][logo]overlay=${overlayCoord}`);
    } else {
       if (filters.length > 0) {
          // If only drawtext, we just apply it to video stream
          filterGraph = filters[0];
       }
    }

    if (logoPath && fs.existsSync(logoPath)) {
      if (overlayText) {
        // Complex filter with both
        const safeText = overlayText.replace(/'/g, "\\\'").replace(/:/g, '\\:');
        command = command.complexFilter([
          `[1:v]scale=150:-1[logo]`,
          `[0:v][logo]overlay=${logoPos === 'TL' ? '40:40' : logoPos === 'TR' ? 'W-w-40:40' : logoPos === 'BL' ? '40:H-h-40' : 'W-w-40:H-h-40'}[v1]`,
          `[v1]drawtext=fontfile='${fontPath}':text='${safeText}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=15:x=(w-text_w)/2:y=h-(h/4)[v2]`
        ], 'v2');
      } else {
        // Only logo
        command = command.complexFilter([
          `[1:v]scale=150:-1[logo]`,
          `[0:v][logo]overlay=${logoPos === 'TL' ? '40:40' : logoPos === 'TR' ? 'W-w-40:40' : logoPos === 'BL' ? '40:H-h-40' : 'W-w-40:H-h-40'}[v1]`
        ], 'v1');
      }
    } else if (filters.length > 0) {
      // Only text
      command = command.videoFilters(filterGraph);
    }


    // Если удалось получить длительность аудио, жестко ограничиваем длину видео
    if (audioDuration > 0) {
      command = command.duration(audioDuration);
    }

    command
      .outputOptions([
        '-shortest',        // Останавливаем рендер, когда заканчивается аудио (как фоллбэк)
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-strict', 'experimental'
      ])
      .save(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Scene render error:', err);
        reject(err);
      });
  });
}

// 4. Сборка всего видео (Склейка сцен + Наложение музыки)
async function concatScenesAndAddBgm(sceneFiles: string[], bgmPath: string, finalPath: string): Promise<void> {
  const listPath = path.join(os.tmpdir(), `concat_list_${Date.now()}.txt`);
  const listContent = sceneFiles.map((f: string) => `file '${f}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  const mergedVideoPath = finalPath + '.merged.mp4';

  // Шаг 1: Склейка видео
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .save(mergedVideoPath)
      .on('end', () => resolve())
      .on('error', reject);
  });

  // Шаг 2: Наложение фоновой музыки с ducking (снижение громкости музыки)
  return new Promise<void>((resolve, reject) => {
    if (!bgmPath || !fs.existsSync(bgmPath)) {
      console.warn('No valid BGM file provided, skipping music overlay.');
      fs.copyFileSync(mergedVideoPath, finalPath);
      if (fs.existsSync(mergedVideoPath)) fs.unlinkSync(mergedVideoPath);
      if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
      return resolve();
    }

    ffmpeg()
      .input(mergedVideoPath)
      .input(bgmPath)
      .outputOptions([
        '-filter_complex', '[1:a]volume=0.1[a1];[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2',
        '-c:v', 'copy',
        '-c:a', 'aac'
      ])
      .save(finalPath)
      .on('end', () => {
        if (fs.existsSync(mergedVideoPath)) fs.unlinkSync(mergedVideoPath);
        if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
        resolve();
      })
      .on('error', reject);
  });
}

// Главная функция-оркестратор
export async function generateVideo(scriptText: string, logoUrl?: string, logoPosition?: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-gen-'));
  const scenes = await extractScenesFromScript(scriptText);
  
  const renderedScenePaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const audioPath = path.join(tmpDir, `audio_${i}.mp3`);
    const rawVideoPath = path.join(tmpDir, `raw_video_${i}.mp4`);
    const sceneOutputPath = path.join(tmpDir, `scene_${i}.mp4`);

    console.log(`[Scene ${i+1}/${scenes.length}] Generating audio...`);
    await generateSceneAudio(scene.text, audioPath);

    console.log(`[Scene ${i+1}/${scenes.length}] Downloading video...`);
    const videoDownloaded = await downloadPexelsVideo(scene.search_queries, rawVideoPath);
    
    if (!videoDownloaded) {
      // Фоллбэк: создаем черное видео на 5 сек, если ничего не найдено
      await new Promise((resolve) => {
        ffmpeg().input('color=c=black:s=1080x1920').inputFormat('lavfi').duration(5).save(rawVideoPath).on('end', resolve);
      });
    }

    console.log(`[Scene ${i+1}/${scenes.length}] Rendering scene...`);
    await renderScene(rawVideoPath, audioPath, scene.overlay_text, sceneOutputPath);
    renderedScenePaths.push(sceneOutputPath);
  }

  const finalOutput = path.join(tmpDir, `final_output_${Date.now()}.mp4`);
  
  // Выбираем случайный трек из папки BGM (читаем реально существующие файлы)
  const bgmDir = path.join(process.cwd(), 'public', 'audio', 'bgm');
  let bgmFiles: string[] = [];
  if (fs.existsSync(bgmDir)) {
    bgmFiles = fs.readdirSync(bgmDir).filter(f => f.endsWith('.mp3'));
  }
  
  const bgmPath = bgmFiles.length > 0 ? path.join(bgmDir, bgmFiles[Math.floor(Math.random() * bgmFiles.length)]) : '';

  console.log(`Concatting scenes and adding BGM...`);
  await concatScenesAndAddBgm(renderedScenePaths, bgmPath, finalOutput);

  // Загружаем в Supabase
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const fileBuffer = fs.readFileSync(finalOutput);
  const fileName = `generated_${Date.now()}.mp4`;
  
  const { error: uploadError } = await supabase.storage
    .from('creatives')
    .upload(`videos/${fileName}`, fileBuffer, {
      contentType: 'video/mp4',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: pubData } = supabase.storage.from('creatives').getPublicUrl(`videos/${fileName}`);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });

  return pubData.publicUrl;
}

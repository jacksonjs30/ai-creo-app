import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/video-generator';

export const maxDuration = 300; // 5 минут таймаут
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { scriptText, scriptId, projectId, logoUrl, logoPosition } = await req.json();

    if (!scriptText) {
      return NextResponse.json({ error: 'scriptText is required' }, { status: 400 });
    }

    console.log(`Starting video generation for script ${scriptId}...`);
    
    // Запускаем пайплайн
    const videoUrl = await generateVideo(scriptText, logoUrl, logoPosition);
    
    return NextResponse.json({ success: true, videoUrl });
    
  } catch (error: any) {
    console.error('Error in video generation API:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

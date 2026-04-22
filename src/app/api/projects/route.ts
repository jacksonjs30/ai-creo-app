import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, brief, avatars } = body;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    // Пробуем вставить проект; если Supabase не настроен — gracefully fallback
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name: name || 'Новый проект',
        brief: brief || {},
        avatars: avatars || [],
        status: 'avatars_ready',
        created_at: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error.message);
      // Возвращаем временный ID если БД не настроена
      return NextResponse.json({ id: 'temp-id', saved: false, reason: error.message });
    }

    return NextResponse.json({ id: data.id, saved: true });
  } catch (err: any) {
    console.error('Save project error:', err);
    return NextResponse.json({ id: 'temp-id', saved: false, reason: err.message });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ projects: [], saved: false, reason: error.message });
    }

    return NextResponse.json({ projects: data || [] });
  } catch (err: any) {
    return NextResponse.json({ projects: [], saved: false, reason: err.message });
  }
}

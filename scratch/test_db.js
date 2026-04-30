import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testScriptsColumn() {
  // Get first project
  const { data: projects, error: getError } = await supabase
    .from('projects')
    .select('id')
    .limit(1);

  if (getError || !projects.length) {
    console.log('No projects found to test');
    return;
  }

  const id = projects[0].id;
  console.log(`Testing with project ID: ${id}`);

  // Try to update with a dummy scripts array
  const { error: updateError } = await supabase
    .from('projects')
    .update({ scripts: [{ id: 'test', content: 'test' }] })
    .eq('id', id);

  if (updateError) {
    console.log(`Update failed: ${updateError.message}`);
    if (updateError.message.includes('column "scripts" of relation "projects" does not exist')) {
        console.log('COLUMN_NOT_FOUND');
    }
  } else {
    console.log('COLUMN_EXISTS');
    // Revert change
    await supabase.from('projects').update({ scripts: null }).eq('id', id);
  }
}

testScriptsColumn();

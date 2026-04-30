const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gmblwtpamdquhtyvzevk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYmx3dHBhbWRxdWh0eXZ6ZXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjU3OTAsImV4cCI6MjA5MjQ0MTc5MH0.aPeWVrdEVwH-m-KPl8e0thL8sdXP0S-Xy8OVIE_wSRI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testScriptsColumn() {
  const { data: projects, error: getError } = await supabase
    .from('projects')
    .select('id')
    .limit(1);

  if (getError || !projects.length) {
    console.log('No projects found');
    return;
  }

  const id = projects[0].id;
  const { error: updateError } = await supabase
    .from('projects')
    .update({ scripts: [] })
    .eq('id', id);

  if (updateError) {
    console.log(`RESULT: ${updateError.message}`);
  } else {
    console.log('RESULT: SUCCESS');
  }
}

testScriptsColumn();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pexnbsizyunpaomaoxmd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBleG5ic2l6eXVucGFvbWFveG1kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk1MzE5MiwiZXhwIjoyMDk2NTI5MTkyfQ.Vfofpr83FxgG3YuoS1X-fCmojzS4DGQsgY0AswoWPiY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('incidents').upsert({ id: '01438f47-1e9b-4a34-a063-b1228e0728fa', photo_urls: [] });
  console.log("ERROR OUTPUT:");
  console.log(JSON.stringify(error, null, 2));
}

run();

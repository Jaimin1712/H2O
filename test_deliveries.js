const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oorfjqkwckbjxtxgxhjd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcmZqcWt3Y2tianh0eGd4aGpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2MjcxMywiZXhwIjoyMDkxMDM4NzEzfQ.SLslpYhvY-x2wj8OkfgYOMTuOmiMLI8RwUWMH_anZ-I-I'
);

async function checkSchema() {
  const { data, error } = await supabase.from('deliveries').select('*').limit(1);
  if (error) {
    console.error('Error fetching deliveries:', error);
  } else {
    console.log('Deliveries query successful. If empty, table exists.');
    console.log(data);
  }
}

checkSchema();

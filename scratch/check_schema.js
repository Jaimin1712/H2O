require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  // Check deliveries columns by fetching one or attempting a dry run
  const { data, error } = await supabase.from('deliveries').select('*').limit(1);
  if (error) {
    console.error('Error fetching deliveries:', error);
  } else {
    console.log('Deliveries columns:', data.length > 0 ? Object.keys(data[0]) : 'No data found');
  }
}
check();

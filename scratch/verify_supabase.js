const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', url);
console.log('Key defined:', !!key);
console.log('Key length:', key?.length);

const supabase = createClient(url, key);

async function test() {
  try {
    const { data, error } = await supabase.from('drivers').select('id').limit(1);
    if (error) {
      console.error('Connection Error:', error);
    } else {
      console.log('Successfully connected and queried drivers table!');
    }
  } catch (err) {
    console.error('Unexpected Exception:', err);
  }
}

test();

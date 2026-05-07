require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const supplierId = '11111111-1111-1111-1111-111111111111'; // Dummy UUID, won't work due to FK
  
  // Let's just fetch the current user or first supplier
  const { data: suppliers } = await supabase.from('suppliers').select('id').limit(1);
  if (!suppliers || suppliers.length === 0) return console.log('no supplier');
  
  const sid = suppliers[0].id;
  console.log("Using supplier:", sid);

  const { data: customer, error: cErr } = await supabase.from('customers').insert([{
    supplier_id: sid,
    name: 'Test Auto Delivery Customer',
    address: '123 Test St',
    delivery_date: '2026-04-20',
    delivery_type: 'daily'
  }]).select('id').single();

  if (cErr) return console.error('Customer error:', cErr);
  console.log('Customer created:', customer.id);

  const { error: dErr } = await supabase.from('deliveries').insert([{
    supplier_id: sid,
    customer_id: customer.id,
    scheduled_date: new Date().toISOString(),
    bottles_delivered: 2,
    delivery_type: 'daily',
    status: 'pending'
  }]);

  if (dErr) return console.error('Delivery error:', dErr);
  console.log('Delivery successfully created!');
}
run();

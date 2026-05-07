import { createClient } from '@supabase/supabase-js';

// Server-only admin client — service role key never sent to browser
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Debug logging
  console.log('[create-driver] Debug Env:', {
    hasUrl: !!url,
    urlLength: url?.length,
    hasServiceKey: !!serviceKey,
    serviceKeyLength: serviceKey?.length,
    serviceKeyPrefix: serviceKey?.substring(0, 10),
    isServiceKeySameAsAnon: serviceKey === anonKey
  });

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Robust initialization with explicit headers to prevent 'Invalid API key' rejection
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password, vehicle_number, supplier_id } = body;

    // ── Validate required fields ────────────────────────────────────────────
    if (!name || !email || !password || !supplier_id) {
      return Response.json(
        { error: 'name, email, password and supplier_id are required' },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();

    // ── Prevent duplicate email in drivers table ─────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('drivers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return Response.json(
        { error: 'A driver with this email already exists' },
        { status: 409 }
      );
    }

    // ── Create Supabase Auth user (email + password) ─────────────────────────
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip confirmation email
    });

    if (authError) {
      console.error('[create-driver] Auth Error:', authError);
      return Response.json({ error: authError.message }, { status: 400 });
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return Response.json({ error: 'Failed to create auth account' }, { status: 500 });
    }

    // ── Insert into drivers table ────────────────────────────────────────────
    // IMPORTANT: The 'drivers' table must have an 'email' column!
    const { data: driver, error: dbError } = await supabaseAdmin
      .from('drivers')
      .insert([
        {
          name,
          email,
          phone: phone || null,
          vehicle_number: vehicle_number || null,
          status: 'active',
          supplier_id,
          auth_user_id: authUserId,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('[create-driver] DB Error:', dbError);
      // Rollback: delete the orphaned auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    return Response.json({ success: true, driver }, { status: 201 });
  } catch (err: any) {
    console.error('[create-driver] Internal Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

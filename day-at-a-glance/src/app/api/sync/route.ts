import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SYNC_ROW_ID = 'aymbre';

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function checkAuth(request: Request): Response | null {
  const token = process.env.SYNC_TOKEN;
  if (!token) {
    return Response.json({ error: 'Server is missing SYNC_TOKEN' }, { status: 500 });
  }
  const provided = request.headers.get('x-sync-token');
  if (provided !== token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('dashboard_sync')
      .select('data, updated_at')
      .eq('id', SYNC_ROW_ID)
      .maybeSingle();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (!data) {
      return Response.json({ data: null, updatedAt: null });
    }
    return Response.json({ data: data.data, updatedAt: data.updated_at });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = checkAuth(request);
  if (authError) return authError;

  let body: { data?: unknown; expectedUpdatedAt?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body.data !== 'object' || body.data === null) {
    return Response.json({ error: 'Missing "data" field' }, { status: 400 });
  }

  try {
    const supabase = supabaseAdmin();

    // Optimistic concurrency: if the client tells us what updated_at it based its merge
    // on, reject the write when the row has moved on since then (another device synced
    // in between). The client is expected to re-fetch, re-merge, and retry.
    if (body.expectedUpdatedAt !== undefined) {
      const { data: current, error: readErr } = await supabase
        .from('dashboard_sync')
        .select('updated_at')
        .eq('id', SYNC_ROW_ID)
        .maybeSingle();
      if (readErr) return Response.json({ error: readErr.message }, { status: 500 });

      const currentUpdatedAt = current ? current.updated_at : null;
      if (currentUpdatedAt !== body.expectedUpdatedAt) {
        return Response.json(
          { error: 'conflict', message: 'Remote data changed since last sync. Please sync again.' },
          { status: 409 }
        );
      }
    }

    const { data: written, error } = await supabase
      .from('dashboard_sync')
      .upsert({ id: SYNC_ROW_ID, data: body.data, updated_at: new Date().toISOString() })
      .select('updated_at')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true, updatedAt: written.updated_at });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers to allow requests from the browser
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the user data and secret code from the request body
    const { ff_uid, name, mobile, password, adminSecret } = await req.json()

    // Validate the secret code from environment variables
    const ADMIN_SECRET_CODE = Deno.env.get('ADMIN_SECRET_CODE')
    if (!ADMIN_SECRET_CODE || adminSecret !== ADMIN_SECRET_CODE) {
      return new Response(JSON.stringify({ error: 'Invalid admin secret code.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `${mobile}@yourapp.com`,
      password: password,
      email_confirm: true, // Auto-confirm the email
    })

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`)
    }

    const user = authData.user;
    if (!user) {
        throw new Error('User creation failed.')
    }

    // Insert into the public.admins table
    const { error: adminInsertError } = await supabaseAdmin
      .from('admins')
      .insert({ id: user.id, mobile: mobile })

    if (adminInsertError) {
      // If this fails, we should probably delete the user we just created to avoid orphaned auth users
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      throw new Error(`Failed to grant admin privileges: ${adminInsertError.message}`)
    }

    // Also create a profile in the players table for consistency
    await supabaseAdmin.from('players').insert({
        id: user.id,
        ff_uid: ff_uid,
        name: name,
        mobile: mobile
    });


    return new Response(JSON.stringify({ message: 'Admin user created successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
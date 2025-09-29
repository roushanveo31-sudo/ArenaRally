-- This is the single, one-time script to create your admin user.
-- Run this MANUALLY in your Supabase SQL Editor.

-- Ensure the pgcrypto extension is available for password hashing.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

DO $$
DECLARE
    admin_mobile TEXT := '9142218328';
    admin_password TEXT := 'Roushanchanda@2009';
    admin_name TEXT := 'Admin'; -- Default name for the admin
    admin_ff_uid BIGINT := 9142218328; -- Using mobile as a placeholder FF UID
    admin_email TEXT;
    admin_user_id UUID;
BEGIN
    -- Use the mobile number to create a unique, consistent email address.
    admin_email := admin_mobile || '@yourapp.com';

    -- Check if the user already exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;

    -- If the user does not exist, create them.
    IF admin_user_id IS NULL THEN
        -- Create the user in auth.users.
        -- This statement is simplified to be compatible with modern Supabase.
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now()
        ) RETURNING id INTO admin_user_id;

        -- Also create a corresponding entry in the public.players table for consistency
        INSERT INTO public.players (id, ff_uid, name, mobile)
        VALUES (admin_user_id, admin_ff_uid, admin_name, admin_mobile);
    END IF;

    -- Finally, ensure the user is in the public.admins table to grant admin rights.
    -- Use ON CONFLICT to prevent errors if the script is run more than once.
    INSERT INTO public.admins (id, mobile)
    VALUES (admin_user_id, admin_mobile)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Admin user setup complete for mobile: %', admin_mobile;

END $$;
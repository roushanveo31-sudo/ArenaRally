-- This script creates the admin user.
-- You should run this MANUALLY in your Supabase SQL Editor.

-- Ensure the pgcrypto extension is available for password hashing.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

DO $$
DECLARE
    admin_mobile TEXT := '9142218328';
    admin_email TEXT := '9142218328@yourapp.com';
    admin_password TEXT := 'Roushanchanda@7373'; -- Replace with the actual password.
    admin_user_id UUID;
BEGIN
    -- 1. Create the user in auth.users
    -- This will throw an error if the user already exists, which is fine.
    admin_user_id := (SELECT id FROM auth.users WHERE email = admin_email);

    IF admin_user_id IS NULL THEN
        -- User does not exist, create them
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            now(),
            '',
            NULL,
            NULL,
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            NULL,
            now()
        ) RETURNING id INTO admin_user_id;
    END IF;

    -- 2. Add the user to the public.admins table
    -- Use ON CONFLICT to avoid errors if the admin record already exists.
    INSERT INTO public.admins (id, mobile)
    VALUES (admin_user_id, admin_mobile)
    ON CONFLICT (id) DO NOTHING;

END $$;
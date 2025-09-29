-- This is an optional script to seed a sample tournament for testing.
-- Run this in your Supabase SQL Editor AFTER creating the admin user.

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find the admin user's ID to associate with the tournament
    SELECT id INTO admin_user_id FROM public.admins WHERE mobile = '9142218328' LIMIT 1;

    -- Insert a sample tournament only if the admin user exists
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.tournaments (
            title,
            thumbnail_url,
            mode,
            subtype,
            max_players,
            entry_fee,
            start_time,
            rules,
            prize_distribution,
            status,
            created_by
        )
        VALUES (
            'Clash Squad Weekly',
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop', -- Sample image URL
            'CS',
            '4V4',
            12,
            50,
            timezone('utc', now() + interval '3 days'),
            'Standard Clash Squad rules apply. No glitches or hacks allowed. Be respectful to other players.',
            '{ "1st": 1000, "2nd": 500 }',
            'PUBLISHED',
            admin_user_id
        );
    ELSE
        RAISE NOTICE 'Admin user not found. Could not seed sample tournament.';
    END IF;
END $$;
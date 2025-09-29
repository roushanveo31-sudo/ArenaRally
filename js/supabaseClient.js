import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// IMPORTANT: Replace with your actual Supabase project URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('Supabase credentials are not set. Please update js/supabaseClient.js');
    // You can also add a visual warning to the user in the UI
    const body = document.querySelector('body');
    if (body) {
        const warning = document.createElement('div');
        warning.textContent = 'WARNING: Supabase credentials are not configured. The application will not work.';
        warning.style.backgroundColor = 'red';
        warning.style.color = 'white';
        warning.style.textAlign = 'center';
        warning.style.padding = '10px';
        warning.style.position = 'fixed';
        warning.style.top = '0';
        warning.style.left = '0';
        warning.style.width = '100%';
        warning.style.zIndex = '9999';
        body.prepend(warning);
    }
}

export const supabase = createClient(supabaseUrl, supabaseKey);
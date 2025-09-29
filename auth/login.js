import { supabase } from '/js/supabaseClient.js';

const loginForm = document.getElementById('login-form');
const messageDiv = document.getElementById('message');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.textContent = ''; // Clear previous messages

    const identifier = event.target['login-identifier'].value;
    const password = event.target.password.value;

    // Step 1: Find the user's mobile number from the 'players' or 'admins' table
    // This is needed to construct the dummy email for Supabase Auth.
    let userMobile = null;

    // Check if it's an admin first
    if (identifier === '9142218328') {
         const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('mobile')
            .eq('mobile', identifier)
            .single();
        if (adminData) {
            userMobile = adminData.mobile;
        }
    }

    // If not found in admins, check players
    if (!userMobile) {
        const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('mobile')
            .or(`ff_uid.eq.${identifier},mobile.eq.${identifier}`)
            .single();

        if (playerError || !playerData) {
            messageDiv.textContent = 'Invalid credentials. User not found.';
            console.error('Player lookup error:', playerError);
            return;
        }
        userMobile = playerData.mobile;
    }

    if (!userMobile) {
        messageDiv.textContent = 'Invalid credentials. User not found.';
        return;
    }

    const email = `${userMobile}@yourapp.com`;

    // Step 2: Attempt to sign in with the constructed email and password
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        messageDiv.textContent = `Login failed: ${error.message}`;
        console.error('Login error:', error);
        return;
    }

    // Step 3: Redirect user to the correct dashboard
    if (userMobile === '9142218328') {
        // It's the admin
        window.location.href = '/admin/dashboard.html'; // Redirect to admin dashboard
    } else {
        // It's a player
        window.location.href = '/dashboard/index.html'; // Redirect to player dashboard
    }
});
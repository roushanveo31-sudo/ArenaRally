import { supabase } from '/js/supabaseClient.js';

const loginForm = document.getElementById('login-form');
const messageDiv = document.getElementById('message');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.textContent = ''; // Clear previous messages

    const identifier = event.target['login-identifier'].value;
    const password = event.target.password.value;

    // Step 1: Find the user's mobile number from the 'players' table
    // This is needed to construct the dummy email for Supabase Auth.
    const { data: userProfile, error: profileError } = await supabase
        .from('players')
        .select('mobile')
        .or(`ff_uid.eq.${identifier},mobile.eq.${identifier}`)
        .single();

    if (profileError || !userProfile) {
        messageDiv.textContent = 'Invalid credentials. User not found.';
        console.error('User lookup error:', profileError);
        return;
    }
    const userMobile = userProfile.mobile;

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

    // Step 3: Check if the user is an admin and redirect accordingly
    const { data: adminCheck, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('id', data.user.id)
        .single();

    if (adminCheck) {
        // User is an admin
        window.location.href = '/admin/dashboard.html';
    } else {
        // User is a player
        window.location.href = '/dashboard/index.html';
    }
});
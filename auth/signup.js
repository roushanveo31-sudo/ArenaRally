import { supabase } from '/js/supabaseClient.js';

const signupForm = document.getElementById('signup-form');
const messageDiv = document.getElementById('message');

signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.textContent = 'Processing...';
    messageDiv.style.color = 'white';

    const form = event.target;
    const ff_uid = form['ff-uid'].value;
    const name = form.name.value;
    const mobile = form.mobile.value;
    const password = form.password.value;
    const player_type = form['player-type'].value;
    const ff_id_level = parseInt(form['ff-level'].value);
    const years_experience = parseInt(form.experience.value);
    const adminSecret = form['admin-secret'].value.trim();

    // If admin secret code is provided, use the Edge Function
    if (adminSecret) {
        const { data, error } = await supabase.functions.invoke('create-admin-user', {
            body: { ff_uid, name, mobile, password, adminSecret },
        });

        if (error) {
            messageDiv.textContent = `Admin creation failed: ${error.message}`;
            messageDiv.style.color = 'red';
        } else {
            messageDiv.textContent = 'Admin account created successfully! Redirecting to login...';
            messageDiv.style.color = 'green';
            setTimeout(() => { window.location.href = '/auth/login.html'; }, 2000);
        }
        return;
    }

    // --- Standard Player Signup ---
    const email = `${mobile}@yourapp.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        messageDiv.textContent = `Error signing up: ${authError.message}`;
        messageDiv.style.color = 'red';
        return;
    }
    if (!authData.user) {
        messageDiv.textContent = 'Signup successful, but no user data returned. Please try logging in.';
        return;
    }

    const { error: profileError } = await supabase
        .from('players')
        .insert({
            id: authData.user.id,
            ff_uid, name, mobile, player_type, ff_id_level, years_experience,
        });

    if (profileError) {
        messageDiv.textContent = `Error creating profile: ${profileError.message}`;
        messageDiv.style.color = 'red';
        // Consider deleting the auth user if profile creation fails
        return;
    }

    messageDiv.textContent = 'Sign up successful! Redirecting to login...';
    messageDiv.style.color = 'green';
    setTimeout(() => { window.location.href = '/auth/login.html'; }, 2000);
});
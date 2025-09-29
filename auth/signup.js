import { supabase } from '/js/supabaseClient.js';

const signupForm = document.getElementById('signup-form');
const messageDiv = document.getElementById('message');

signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.textContent = ''; // Clear previous messages

    const form = event.target;
    const ff_uid = form['ff-uid'].value;
    const name = form.name.value;
    const mobile = form.mobile.value;
    const password = form.password.value;
    const player_type = form['player-type'].value;
    const ff_id_level = parseInt(form['ff-level'].value);
    const years_experience = parseInt(form.experience.value);

    // Supabase Auth requires an email, so we create a dummy one.
    // The user will log in with their mobile or ff_uid.
    const email = `${mobile}@yourapp.com`;

    // Step 1: Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        messageDiv.textContent = `Error signing up: ${authError.message}`;
        console.error('Auth Error:', authError);
        return;
    }

    if (!authData.user) {
        messageDiv.textContent = 'Signup successful, but no user data returned. Please try logging in.';
        return;
    }

    // Step 2: Insert the user's profile into the 'players' table
    const { error: profileError } = await supabase
        .from('players')
        .insert({
            id: authData.user.id, // Link to the auth.users table
            ff_uid,
            name,
            mobile,
            player_type,
            ff_id_level,
            years_experience,
        });

    if (profileError) {
        messageDiv.textContent = `Error creating profile: ${profileError.message}`;
        console.error('Profile Error:', profileError);
        // Optional: You might want to delete the user from auth if profile creation fails
        // await supabase.auth.admin.deleteUser(authData.user.id);
        return;
    }

    messageDiv.textContent = 'Sign up successful! Redirecting to login...';
    messageDiv.style.color = 'green';

    // Redirect to login page after a short delay
    setTimeout(() => {
        window.location.href = '/auth/login.html';
    }, 2000);
});
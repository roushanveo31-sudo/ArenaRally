import { supabase } from '/js/supabaseClient.js';

// DOM Elements
const form = document.getElementById('create-tournament-form');
const messageDiv = document.getElementById('message');
const logoutBtn = document.getElementById('logout-btn');
const modeSelect = document.getElementById('mode');
const subtypeSelect = document.getElementById('subtype');

// Subtype options based on mode
const subtypes = {
    CS: ['1V1', '2V2', '4V4', '6V6'],
    BR: ['SOLO', 'DUO', 'SQUAD'],
};

// Security Check: Ensure user is an admin
const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/auth/login.html');
        return false;
    }
    const { data: admin, error } = await supabase
        .from('admins')
        .select('id')
        .eq('id', session.user.id)
        .single();
    if (error || !admin) {
        window.location.replace('/auth/login.html');
        return false;
    }
    return session.user;
};

// Function to populate subtypes based on selected mode
const populateSubtypes = () => {
    const selectedMode = modeSelect.value;
    const options = subtypes[selectedMode];

    subtypeSelect.innerHTML = ''; // Clear existing options
    options.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option;
        optElement.textContent = option.charAt(0).toUpperCase() + option.slice(1).toLowerCase();
        subtypeSelect.appendChild(optElement);
    });
};

// Form submission handler
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.textContent = 'Creating tournament...';
    messageDiv.style.color = 'white';

    const user = await checkAdmin();
    if (!user) return;

    const formData = new FormData(form);
    const thumbnailFile = formData.get('thumbnail');

    // 1. Upload thumbnail to Supabase Storage
    const fileName = `public/${Date.now()}_${thumbnailFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, thumbnailFile);

    if (uploadError) {
        messageDiv.textContent = `Error uploading thumbnail: ${uploadError.message}`;
        messageDiv.style.color = 'red';
        console.error(uploadError);
        return;
    }

    // 2. Get the public URL of the uploaded file
    const { data: { publicUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);

    // 3. Parse prize distribution
    let prizeDistributionJson = null;
    const prizeText = formData.get('prize_distribution');
    if (prizeText) {
        try {
            prizeDistributionJson = JSON.parse(prizeText);
        } catch (e) {
            messageDiv.textContent = 'Invalid JSON format for Prize Distribution.';
            messageDiv.style.color = 'red';
            return;
        }
    }

    // 4. Insert tournament data into the database
    const { error: insertError } = await supabase
        .from('tournaments')
        .insert({
            title: formData.get('title'),
            thumbnail_url: publicUrl,
            mode: formData.get('mode'),
            subtype: formData.get('subtype'),
            max_players: parseInt(formData.get('max_players')),
            entry_fee: parseInt(formData.get('entry_fee')),
            start_time: new Date(formData.get('start_time')).toISOString(),
            rules: formData.get('rules'),
            prize_distribution: prizeDistributionJson,
            status: formData.get('status'),
            created_by: user.id,
        });

    if (insertError) {
        messageDiv.textContent = `Error creating tournament: ${insertError.message}`;
        messageDiv.style.color = 'red';
        console.error(insertError);
        // Clean up uploaded file if db insert fails
        await supabase.storage.from('thumbnails').remove([fileName]);
        return;
    }

    messageDiv.textContent = 'Tournament created successfully! Redirecting...';
    messageDiv.style.color = 'green';

    setTimeout(() => {
        window.location.href = '/admin/dashboard.html';
    }, 2000);
});

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
});

// Initial setup on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAdmin();
    populateSubtypes(); // Initial population
    modeSelect.addEventListener('change', populateSubtypes); // Add listener
});
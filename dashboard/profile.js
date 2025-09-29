import { supabase } from '/js/supabaseClient.js';

// DOM Elements
const loadingDiv = document.getElementById('loading');
const profileContent = document.getElementById('profile-content');
const profileForm = document.getElementById('profile-form');
const qrCodeForm = document.getElementById('qr-code-form');
const qrCodePreview = document.getElementById('qr-code-preview');
const qrCodeUploadInput = document.getElementById('qr-code-upload');
const messageDiv = document.getElementById('message');
const logoutBtn = document.getElementById('logout-btn');

// Form Inputs
const ffUidInput = document.getElementById('ff-uid');
const mobileInput = document.getElementById('mobile');
const nameInput = document.getElementById('name');

let currentUser = null;

// Security Check and Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.replace('/auth/login.html');
        return;
    }
    currentUser = session.user;
    loadProfile();
});

// Load user profile data
const loadProfile = async () => {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error) {
        console.error('Error loading profile:', error);
        messageDiv.textContent = 'Failed to load profile data.';
        return;
    }

    // Populate the form
    ffUidInput.value = data.ff_uid;
    mobileInput.value = data.mobile;
    nameInput.value = data.name;

    if (data.upi_qr_code_url) {
        // We need to get a signed URL because the bucket is not public
        const { data: signedData, error: signedError } = await supabase
            .storage
            .from('qrcodes')
            .createSignedUrl(data.upi_qr_code_url, 60); // URL valid for 60 seconds

        if (signedError) {
            console.error('Error creating signed URL:', signedError);
            qrCodePreview.alt = 'Could not load QR code';
        } else {
            qrCodePreview.src = signedData.signedUrl;
        }
    } else {
        qrCodePreview.alt = 'No QR code uploaded';
    }


    loadingDiv.style.display = 'none';
    profileContent.classList.remove('hidden');
};

// Handle profile form submission (for updating name)
profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.textContent = 'Updating...';

    const { error } = await supabase
        .from('players')
        .update({ name: nameInput.value })
        .eq('id', currentUser.id);

    if (error) {
        messageDiv.textContent = `Error updating profile: ${error.message}`;
        messageDiv.style.color = 'red';
    } else {
        messageDiv.textContent = 'Profile updated successfully!';
        messageDiv.style.color = 'green';
    }
});

// Handle QR code form submission
qrCodeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = qrCodeUploadInput.files[0];
    if (!file) {
        messageDiv.textContent = 'Please select a file to upload.';
        return;
    }
    messageDiv.textContent = 'Uploading QR code...';

    // Define a unique path for the user's QR code
    const filePath = `public/${currentUser.id}.${file.name.split('.').pop()}`;

    // Upload the file, using upsert to overwrite if it already exists
    const { error: uploadError } = await supabase.storage
        .from('qrcodes')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        messageDiv.textContent = `Error uploading QR code: ${uploadError.message}`;
        messageDiv.style.color = 'red';
        return;
    }

    // Update the player's profile with the path to the QR code
    const { error: updateError } = await supabase
        .from('players')
        .update({ upi_qr_code_url: filePath })
        .eq('id', currentUser.id);

    if (updateError) {
        messageDiv.textContent = `Error saving QR code URL: ${updateError.message}`;
        messageDiv.style.color = 'red';
    } else {
        messageDiv.textContent = 'QR code uploaded successfully!';
        messageDiv.style.color = 'green';
        loadProfile(); // Reload profile to show the new QR code
    }
});


// Logout functionality
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
});
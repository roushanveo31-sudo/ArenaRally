# Free Fire Tournament Web App

This is a full-stack web application for hosting Free Fire tournaments, built with vanilla HTML5, CSS3 (Tailwind CSS), and JavaScript for the frontend, and powered by Supabase for the backend.

## Features

- **Player Authentication**: Sign-up with FF UID, name, mobile, and password. Login with mobile or UID.
- **Admin Dashboard**: Admins can create, manage, and publish tournaments, view participants, kick players, and announce winners.
- **Tournament Flow**: Players can view and join published tournaments.
- **Real-time Updates**: Live participant counters, real-time room detail reveals, and two chat systems (global and tournament-specific).
- **Demo Payment**: A simplified join flow where clicking "Join" successfully registers a player.
- **Player Profiles**: Players can update their name and upload a UPI QR code for payouts.

---

## Setup Instructions

Follow these steps to get the application running locally.

### 1. Set up Supabase

1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com), create an account or log in, and start a new project.
2.  **Get Database Password**: When creating the project, make sure to save your database password securely.
3.  **Get Project URL and Anon Key**:
    *   In your Supabase project dashboard, navigate to **Project Settings** (the gear icon).
    *   Go to the **API** section.
    *   You will find your **Project URL** and the **Project API keys** (use the `anon` `public` key).

### 2. Apply Database Migrations

The `supabase/migrations` directory contains the SQL scripts to create your database schema.

1.  **Navigate to the SQL Editor**: In your Supabase project dashboard, go to the **SQL Editor**.
2.  **Create New Query**: Click on "+ New query".
3.  **Run the Initial Schema Script**:
    *   Open the file `supabase/migrations/0001_initial_schema.sql`.
    *   Copy the entire content of the file.
    *   Paste it into the Supabase SQL Editor.
    *   Click **RUN**. This will create all the necessary tables, types, and policies.

### 3. Configure Frontend Credentials

You need to connect the frontend code to your Supabase instance.

1.  **Open `js/supabaseClient.js`**: In the project code, locate this file.
2.  **Update Credentials**: Replace the placeholder strings `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with the actual URL and anon key you retrieved in Step 1.

    ```javascript
    // js/supabaseClient.js

    const supabaseUrl = 'https://your-project-ref.supabase.co'; // <-- Replace this
    const supabaseKey = 'your-public-anon-key'; // <-- Replace this
    ```

### 4. Deploy the Admin Creation Function

To create an admin securely, we will use a Supabase Edge Function. This requires the **Supabase CLI**.

1.  **Install the Supabase CLI**: Follow the official instructions [here](https://supabase.com/docs/guides/cli/getting-started) to install the CLI on your machine.

2.  **Set Up Local Project**:
    *   In your project's root directory, run `supabase login` and follow the prompts to authenticate.
    *   Link your project by running `supabase link --project-ref <your-project-ref>`, replacing `<your-project-ref>` with your project's ID from the Supabase dashboard URL (e.g., `https://supabase.com/dashboard/project/<your-project-ref>`).

3.  **Set the Admin Secret Code**:
    *   You need to set a secret code that will be used to authorize admin creation.
    *   In your project's root directory, run the following command. **Replace `YOUR_SUPER_SECRET_CODE` with a strong, memorable code.**
    ```bash
    supabase secrets set ADMIN_SECRET_CODE=YOUR_SUPER_SECRET_CODE
    ```

4.  **Deploy the Edge Function**:
    *   Now, deploy the `create-admin-user` function to your Supabase project.
    ```bash
    supabase functions deploy create-admin-user --no-verify-jwt
    ```
    *   The `--no-verify-jwt` flag is used because this sign-up function needs to be called by unauthenticated users, but we are securing it with our secret code logic inside the function.

### 5. Create Your Admin Account

1.  **Run the Application**: You can run this project by serving the files with a simple local server. If you have Python installed, you can run:

    ```bash
    # From the root of the project directory
    python3 -m http.server
    ```
    Then, open your browser and navigate to `http://localhost:8000`.

2.  **Go to the Sign-up Page**: Navigate to the sign-up page (`/auth/signup.html`).
3.  **Fill in Your Details**: Enter the details for your admin account (FF UID, Name, Mobile, Password).
4.  **Enter the Secret Code**: In the **Admin Secret Code** field, enter the exact same secret code you set in the previous step.
5.  **Sign Up**: Click the "Sign Up" button. Your account will be created with admin privileges. You can now log in.

---

### 6. Seeding Sample Data (Optional)

```bash
# From the root of the project directory
python3 -m http.server
```

Then, open your browser and navigate to `http://localhost:8000`. The `index.html` file will automatically redirect you to the login page.

---

## Seeding Sample Data (Optional)

To make testing easier, you can create a sample tournament.

1.  **Log in as Admin**: Log in using the admin credentials.
2.  **Navigate to Create Tournament**: Click the "Create Tournament" button.
3.  **Fill and Publish**: Fill out the form with sample data and set the status to `PUBLISHED`. It will now be visible to players.

Alternatively, you can use the SQL script in `supabase/migrations/0003_seed_tournament.sql` to create a sample tournament directly. Just copy, paste, and run it in the SQL Editor.
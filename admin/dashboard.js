import { supabase } from '/js/supabaseClient.js';

const tournamentsList = document.getElementById('tournaments-list');
const logoutBtn = document.getElementById('logout-btn');

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
        // Not an admin, redirect to player dashboard or login
        window.location.replace('/auth/login.html');
        return false;
    }
    return true;
};


const fetchTournaments = async () => {
    if (!tournamentsList) return;

    const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select(`
            id,
            title,
            status,
            mode,
            subtype,
            start_time,
            entry_fee,
            max_players,
            tickets (
                player_id,
                status
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tournaments:', error);
        tournamentsList.innerHTML = '<tr><td colspan="7" class="text-center py-4">Error loading tournaments.</td></tr>';
        return;
    }

    if (tournaments.length === 0) {
        tournamentsList.innerHTML = '<tr><td colspan="7" class="text-center py-4">No tournaments created yet.</td></tr>';
        return;
    }

    // Clear existing list
    tournamentsList.innerHTML = '';

    for (const t of tournaments) {
        const paidPlayers = t.tickets.filter(ticket => ticket.status === 'PAID').length;
        const startTime = new Date(t.start_time).toLocaleString();

        const row = `
            <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                <th scope="row" class="px-6 py-4 font-medium text-white whitespace-nowrap">
                    ${t.title}
                </th>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${t.status === 'PUBLISHED' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}">
                        ${t.status}
                    </span>
                </td>
                <td class="px-6 py-4">${t.mode} / ${t.subtype}</td>
                <td class="px-6 py-4">${startTime}</td>
                <td class="px-6 py-4">${t.entry_fee > 0 ? `₹${t.entry_fee}` : 'Free'}</td>
                <td class="px-6 py-4">${paidPlayers} / ${t.max_players}</td>
                <td class="px-6 py-4 text-right">
                    <a href="/admin/tournament-details.html?id=${t.id}" class="font-medium text-blue-500 hover:underline">Edit</a>
                </td>
            </tr>
        `;
        tournamentsList.innerHTML += row;
    }
};

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
});

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    const isAdmin = await checkAdmin();
    if (isAdmin) {
        fetchTournaments();
    }
});
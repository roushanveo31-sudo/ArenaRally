import { supabase } from '/js/supabaseClient.js';

// DOM Elements
const loadingDiv = document.getElementById('loading');
const contentDiv = document.getElementById('tournament-content');
const titleEl = document.getElementById('tournament-title');
const statusEl = document.getElementById('tournament-status');
const participantCountEl = document.getElementById('participant-count');
const participantsListEl = document.getElementById('participants-list');
const winnersForm = document.getElementById('winners-form');
const winnersListEl = document.getElementById('winners-list');
const roomForm = document.getElementById('room-details-form');
const roomIdInput = document.getElementById('room_id');
const roomPassInput = document.getElementById('room_pass');
const cancelBtn = document.getElementById('cancel-tournament-btn');
const editBtn = document.getElementById('edit-tournament-btn');
const logoutBtn = document.getElementById('logout-btn');
const messageDiv = document.getElementById('message');

let tournamentId = null;

// Security Check & Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    tournamentId = params.get('id');
    if (!tournamentId) {
        window.location.replace('/admin/dashboard.html');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/auth/login.html');
        return;
    }
    const { data: admin, error } = await supabase.from('admins').select('id').eq('id', session.user.id).single();
    if (error || !admin) {
        window.location.replace('/auth/login.html');
        return;
    }

    await loadTournamentData();
    loadingDiv.classList.add('hidden');
    contentDiv.classList.remove('hidden');
});

// Main data loading function
const loadTournamentData = async () => {
    const { data, error } = await supabase
        .from('tournaments')
        .select(`
            *,
            tickets (
                id,
                status,
                player_id,
                players (
                    ff_uid,
                    name
                )
            ),
            winners (
                *,
                players (
                    ff_uid,
                    name
                )
            )
        `)
        .eq('id', tournamentId)
        .single();

    if (error) {
        messageDiv.textContent = `Error loading tournament: ${error.message}`;
        return;
    }

    renderTournamentDetails(data);
    renderParticipants(data.tickets);
    renderWinners(data.winners);
};

// Render functions
const renderTournamentDetails = (tournament) => {
    titleEl.textContent = tournament.title;
    statusEl.textContent = tournament.status;
    statusEl.className = `px-3 py-1 text-sm font-semibold rounded-full ${tournament.status === 'PUBLISHED' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`;
    roomIdInput.value = tournament.room_id || '';
    roomPassInput.value = tournament.room_pass || '';
    editBtn.onclick = () => { /* Will handle edit later, maybe reuse create form */ alert('Edit functionality coming soon.'); };
};

const renderParticipants = (tickets) => {
    participantsListEl.innerHTML = '';
    const paidTickets = tickets.filter(t => t.status === 'PAID' || t.status === 'KICKED');
    participantCountEl.textContent = paidTickets.length;

    if (paidTickets.length === 0) {
        participantsListEl.innerHTML = '<tr><td colspan="4" class="text-center py-4">No paid participants yet.</td></tr>';
        return;
    }

    paidTickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.className = 'bg-gray-800 border-b border-gray-700';
        row.innerHTML = `
            <td class="px-6 py-4">${ticket.players.name}</td>
            <td class="px-6 py-4">${ticket.players.ff_uid}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${ticket.status === 'PAID' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'}">
                    ${ticket.status}
                </span>
            </td>
            <td class="px-6 py-4">
                ${ticket.status === 'PAID' ? `<button data-ticket-id="${ticket.id}" class="kick-btn font-medium text-red-500 hover:underline">Kick</button>` : 'N/A'}
            </td>
        `;
        participantsListEl.appendChild(row);
    });

    document.querySelectorAll('.kick-btn').forEach(btn => btn.addEventListener('click', handleKickPlayer));
};

const renderWinners = (winners) => {
    winnersListEl.innerHTML = '<h4 class="text-xl font-bold mb-2">Announced Winners</h4>';
    if (winners.length === 0) {
        winnersListEl.innerHTML += '<p>No winners announced yet.</p>';
        return;
    }
    winners.sort((a, b) => a.rank - b.rank).forEach(winner => {
        winnersListEl.innerHTML += `
            <div class="p-2 bg-gray-700 rounded mb-2">
                <strong>Rank ${winner.rank}:</strong> ${winner.players.name} (UID: ${winner.players.ff_uid}) - ${winner.kills} kills.
            </div>
        `;
    });
};


// Event Handlers
const handleKickPlayer = async (event) => {
    const ticketId = event.target.dataset.ticketId;
    if (!confirm('Are you sure you want to kick this player?')) return;

    const { error } = await supabase.from('tickets').update({ status: 'KICKED' }).eq('id', ticketId);
    if (error) {
        messageDiv.textContent = `Error kicking player: ${error.message}`;
    } else {
        messageDiv.textContent = 'Player kicked successfully.';
        loadTournamentData(); // Refresh data
    }
};

roomForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { error } = await supabase
        .from('tournaments')
        .update({
            room_id: roomIdInput.value,
            room_pass: roomPassInput.value
        })
        .eq('id', tournamentId);

    if (error) {
        messageDiv.textContent = `Error updating room details: ${error.message}`;
    } else {
        messageDiv.textContent = 'Room details published successfully!';
    }
});

winnersForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ffUid = event.target['winner-ff-uid'].value;
    const rank = parseInt(event.target['winner-rank'].value);
    const kills = parseInt(event.target['winner-kills'].value);

    // 1. Find player_id from ff_uid
    const { data: player, error: playerError } = await supabase.from('players').select('id').eq('ff_uid', ffUid).single();
    if (playerError || !player) {
        messageDiv.textContent = 'Player with that FF UID not found.';
        return;
    }

    // 2. Insert into winners table
    const { error: insertError } = await supabase.from('winners').insert({
        tournament_id: tournamentId,
        player_id: player.id,
        rank,
        kills
    });

    if (insertError) {
        messageDiv.textContent = `Error announcing winner: ${insertError.message}`;
    } else {
        messageDiv.textContent = 'Winner announced successfully!';
        winnersForm.reset();
        loadTournamentData(); // Refresh data
    }
});

cancelBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to cancel this tournament? This action cannot be undone.')) return;

    const { error } = await supabase.from('tournaments').update({ status: 'CANCELLED' }).eq('id', tournamentId);
    if (error) {
        messageDiv.textContent = `Error cancelling tournament: ${error.message}`;
    } else {
        messageDiv.textContent = 'Tournament cancelled.';
        loadTournamentData(); // Refresh data
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
});
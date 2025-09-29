import { supabase } from '/js/supabaseClient.js';

// DOM Elements
const loadingDiv = document.getElementById('loading');
const accessDeniedDiv = document.getElementById('access-denied');
const contentDiv = document.getElementById('tournament-content');
const titleEl = document.getElementById('tournament-title');
const timeEl = document.getElementById('tournament-time');
const roomDetailsPlaceholder = document.getElementById('room-details-placeholder');
const roomDetailsContent = document.getElementById('room-details-content');
const roomIdEl = document.getElementById('room-id');
const roomPassEl = document.getElementById('room-pass');
const winnersListEl = document.getElementById('winners-list');
const participantsListEl = document.getElementById('participants-list');
const chatMessagesEl = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let tournamentId = null;

// Security Check and Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    tournamentId = params.get('id');
    if (!tournamentId) {
        window.location.replace('/dashboard/index.html');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/auth/login.html');
        return;
    }
    currentUser = session.user;

    const isAuthorized = await checkAuthorization();
    if (isAuthorized) {
        await loadPageData();
        setupRealtimeSubscriptions();
        loadingDiv.style.display = 'none';
        contentDiv.classList.remove('hidden');
    } else {
        loadingDiv.style.display = 'none';
        accessDeniedDiv.classList.remove('hidden');
    }
});

// Check if the user has a paid ticket for this tournament
const checkAuthorization = async () => {
    const { data, error } = await supabase
        .from('tickets')
        .select('id')
        .eq('player_id', currentUser.id)
        .eq('tournament_id', tournamentId)
        .eq('status', 'PAID')
        .single();
    return !error && data;
};

// Load all data for the page
const loadPageData = async () => {
    const { data, error } = await supabase
        .from('tournaments')
        .select(`
            title, start_time, room_id, room_pass,
            tickets ( status, players ( name ) ),
            winners ( rank, players ( name, ff_uid ) ),
            tournament_chat ( created_at, message, players ( name ) )
        `)
        .eq('id', tournamentId)
        .single();

    if (error) {
        console.error('Error loading page data:', error);
        contentDiv.innerHTML = '<p>Error loading tournament details.</p>';
        return;
    }

    renderDetails(data);
    renderParticipants(data.tickets);
    renderWinners(data.winners);
    renderChatMessages(data.tournament_chat);
};

// Render functions
const renderDetails = (tournament) => {
    titleEl.textContent = tournament.title;
    timeEl.textContent = `Starts: ${new Date(tournament.start_time).toLocaleString()}`;
    if (tournament.room_id) {
        roomIdEl.textContent = tournament.room_id;
        roomPassEl.textContent = tournament.room_pass;
        roomDetailsPlaceholder.style.display = 'none';
        roomDetailsContent.classList.remove('hidden');
    }
};

const renderParticipants = (tickets) => {
    participantsListEl.innerHTML = '';
    const paidParticipants = tickets.filter(t => t.status === 'PAID');
    paidParticipants.forEach(ticket => {
        const li = document.createElement('li');
        li.className = 'p-2 bg-gray-700 rounded';
        li.textContent = ticket.players.name;
        participantsListEl.appendChild(li);
    });
};

const renderWinners = (winners) => {
    winnersListEl.innerHTML = '';
    if (!winners || winners.length === 0) {
        winnersListEl.innerHTML = '<p>Winners have not been announced yet.</p>';
        return;
    }
    winners.sort((a, b) => a.rank - b.rank).forEach(winner => {
        const div = document.createElement('div');
        div.className = 'p-2 bg-gray-700 rounded mb-2';
        div.innerHTML = `<strong>Rank ${winner.rank}:</strong> ${winner.players.name} (UID: ${winner.players.ff_uid})`;
        winnersListEl.appendChild(div);
    });
};

const renderChatMessages = (messages) => {
    chatMessagesEl.innerHTML = '';
    if (!messages) return;
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach(msg => {
        appendChatMessage(msg);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
};

const appendChatMessage = (msg) => {
    const div = document.createElement('div');
    div.className = 'mb-2';
    div.innerHTML = `
        <span class="font-bold ${msg.players.name ? 'text-yellow-400' : ''}">${msg.players.name || 'User'}:</span>
        <span class="text-gray-300">${msg.message}</span>
    `;
    chatMessagesEl.appendChild(div);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
};

// Chat form submission
chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    await supabase.from('tournament_chat').insert({
        tournament_id: tournamentId,
        sender_id: currentUser.id,
        message: message,
    });
});

// Realtime subscriptions
const setupRealtimeSubscriptions = () => {
    // Listen for room detail updates
    supabase.channel(`public:tournaments:id=eq.${tournamentId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments' }, payload => {
            console.log('Tournament update received:', payload);
            renderDetails(payload.new);
        })
        .subscribe();

    // Listen for new chat messages
    supabase.channel(`public:tournament_chat:tournament_id=eq.${tournamentId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tournament_chat' }, async (payload) => {
            // We need to fetch the player name since it's not in the payload
            const { data: sender } = await supabase.from('players').select('name').eq('id', payload.new.sender_id).single();
            const message = { ...payload.new, players: sender };
            appendChatMessage(message);
        })
        .subscribe();
};

// Logout
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
});
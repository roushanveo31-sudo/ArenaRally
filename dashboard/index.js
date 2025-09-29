import { supabase } from '/js/supabaseClient.js';

// DOM Elements
const grid = document.getElementById('tournaments-grid');
const loadingDiv = document.getElementById('loading');
const logoutBtn = document.getElementById('logout-btn');
const globalChatBtn = document.getElementById('global-chat-btn');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatModal = document.getElementById('chat-modal');
const chatMessagesEl = document.getElementById('global-chat-messages');
const chatForm = document.getElementById('global-chat-form');
const chatInput = document.getElementById('global-chat-input');


let currentUser = null;
let userTickets = [];
const countdownIntervals = {};

// Security Check and Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.replace('/auth/login.html');
        return;
    }
    currentUser = session.user;

    await loadInitialData();
    setupRealtimeSubscriptions();
});

// Load all necessary data
const loadInitialData = async () => {
    loadingDiv.style.display = 'block';
    grid.innerHTML = ''; // Clear grid before loading

    await fetchUserTickets();
    await fetchTournaments();

    loadingDiv.style.display = 'none';
};

// Fetch the current user's tickets
const fetchUserTickets = async () => {
    const { data, error } = await supabase
        .from('tickets')
        .select('tournament_id')
        .eq('player_id', currentUser.id)
        .in('status', ['PAID', 'PENDING_PAYMENT']);

    if (error) {
        console.error('Error fetching user tickets:', error);
    } else {
        userTickets = data.map(t => t.tournament_id);
    }
};

// Fetch and render all published tournaments
const fetchTournaments = async () => {
    const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select(`
            id, title, thumbnail_url, mode, subtype, max_players, entry_fee, start_time,
            tickets ( id, status )
        `)
        .eq('status', 'PUBLISHED')
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching tournaments:', error);
        grid.innerHTML = '<p class="col-span-full text-center">Could not load tournaments.</p>';
        return;
    }

    if (tournaments.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center">No upcoming tournaments right now. Check back soon!</p>';
    } else {
        tournaments.forEach(renderTournamentCard);
    }
};

// Render a single tournament card
const renderTournamentCard = (tournament) => {
    // Clear any existing interval for this card
    if (countdownIntervals[tournament.id]) {
        clearInterval(countdownIntervals[tournament.id]);
    }

    const cardId = `tournament-card-${tournament.id}`;
    let card = document.getElementById(cardId);
    if (!card) {
        card = document.createElement('div');
        card.id = cardId;
        card.className = 'bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300';
        grid.appendChild(card);
    }

    const joinedPlayers = tournament.tickets.filter(t => t.status === 'PAID').length;
    const isFull = joinedPlayers >= tournament.max_players;
    const hasJoined = userTickets.includes(tournament.id);

    let buttonHtml;
    if (hasJoined) {
        buttonHtml = `<a href="/dashboard/tournament-details.html?id=${tournament.id}" class="block w-full text-center bg-green-600 font-bold py-2 px-4">View Details</a>`;
    } else if (isFull) {
        buttonHtml = `<button class="w-full bg-gray-600 font-bold py-2 px-4 cursor-not-allowed" disabled>Seats Full</button>`;
    } else {
        buttonHtml = `<button data-tournament-id="${tournament.id}" class="join-btn w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 px-4 transition-colors">Join (₹${tournament.entry_fee})</button>`;
    }

    card.innerHTML = `
        <img src="${tournament.thumbnail_url}" alt="${tournament.title}" class="w-full h-40 object-cover">
        <div class="p-4">
            <h3 class="text-xl font-bold text-white mb-2">${tournament.title}</h3>
            <div class="flex justify-between items-center text-sm text-gray-400 mb-2">
                <span>${tournament.mode} / ${tournament.subtype}</span>
                <span class="font-bold text-lg text-white">${joinedPlayers} / ${tournament.max_players}</span>
            </div>
            <div id="countdown-${tournament.id}" class="text-center text-yellow-400 font-bold text-lg my-3 countdown-timer">
                Loading...
            </div>
        </div>
        <div class="p-2 bg-gray-700">
            ${buttonHtml}
        </div>
    `;

    // Set up countdown timer
    const countdownEl = document.getElementById(`countdown-${tournament.id}`);
    updateCountdown(countdownEl, tournament.start_time);
    countdownIntervals[tournament.id] = setInterval(() => updateCountdown(countdownEl, tournament.start_time), 1000);

    // Add event listener if the join button exists
    const joinBtn = card.querySelector('.join-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', handleJoinTournament);
    }
};

// Handle the join tournament logic
const handleJoinTournament = async (event) => {
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Joining...';
    const tournamentId = button.dataset.tournamentId;

    const { error } = await supabase
        .from('tickets')
        .insert({
            tournament_id: tournamentId,
            player_id: currentUser.id,
            status: 'PAID' // Demo mode: instantly mark as paid
        });

    if (error) {
        console.error('Error joining tournament:', error);
        button.textContent = 'Join Failed!';
        button.classList.add('bg-red-500');
    } else {
        // Success
        button.textContent = 'Joined!';
        button.classList.remove('bg-yellow-400', 'hover:bg-yellow-500', 'text-gray-900');
        button.classList.add('bg-green-600');
        // Visually update the player count immediately
        const card = document.getElementById(`tournament-card-${tournamentId}`);
        const countEl = card.querySelector('.font-bold.text-lg.text-white');
        const [current, max] = countEl.textContent.split(' / ');
        countEl.textContent = `${parseInt(current) + 1} / ${max}`;
    }
};

// Countdown timer logic
const updateCountdown = (element, startTime) => {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const distance = start - now;

    if (distance < 0) {
        element.textContent = "Tournament Started";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    element.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// Realtime subscription setup
const setupRealtimeSubscriptions = () => {
    // For tournament player counts
    supabase.channel('public:tickets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
            console.log('Realtime ticket change detected:', payload);
            loadInitialData();
        })
        .subscribe();

    // For global chat
    supabase.channel('public:global_chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat' }, async (payload) => {
            const { data: sender } = await supabase.from('players').select('name').eq('id', payload.new.sender_id).single();
            const message = { ...payload.new, players: sender };
            appendChatMessage(message);
        })
        .subscribe();
};

// --- Global Chat Functions ---

const loadChatHistory = async () => {
    chatMessagesEl.innerHTML = 'Loading history...';
    const { data, error } = await supabase
        .from('global_chat')
        .select(`*, players ( name )`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching chat history:', error);
        chatMessagesEl.innerHTML = 'Could not load chat history.';
        return;
    }

    chatMessagesEl.innerHTML = '';
    data.reverse().forEach(appendChatMessage);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
};

const appendChatMessage = (msg) => {
    const div = document.createElement('div');
    div.className = 'mb-2';
    div.innerHTML = `
        <span class="font-bold text-yellow-400">${msg.players.name || 'User'}:</span>
        <span class="text-gray-300">${msg.message}</span>
    `;
    chatMessagesEl.appendChild(div);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
};

chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.value = '';

    await supabase.from('global_chat').insert({
        sender_id: currentUser.id,
        message: message,
    });
});

globalChatBtn.addEventListener('click', () => {
    chatModal.classList.remove('hidden');
    loadChatHistory();
});

closeChatBtn.addEventListener('click', () => {
    chatModal.classList.add('hidden');
});

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    Object.values(countdownIntervals).forEach(clearInterval); // Clear all intervals
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
});
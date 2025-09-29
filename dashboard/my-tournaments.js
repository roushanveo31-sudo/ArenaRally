import { supabase } from '/js/supabaseClient.js';

// DOM Elements
const upcomingList = document.getElementById('upcoming-tournaments-list');
const pastList = document.getElementById('past-tournaments-list');
const loadingUpcoming = document.getElementById('loading-upcoming');
const loadingPast = document.getElementById('loading-past');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;

// Security Check and Initial Load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.replace('/auth/login.html');
        return;
    }
    currentUser = session.user;
    loadUserTournaments();
});

// Load all tournaments the user has joined
const loadUserTournaments = async () => {
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
            status,
            tournaments (
                id, title, thumbnail_url, start_time, status
            )
        `)
        .eq('player_id', currentUser.id)
        .eq('status', 'PAID');

    if (error) {
        console.error('Error fetching user tournaments:', error);
        loadingUpcoming.textContent = 'Error loading tournaments.';
        loadingPast.textContent = '';
        return;
    }

    const now = new Date();
    const upcoming = [];
    const past = [];

    tickets.forEach(ticket => {
        if (!ticket.tournaments) return; // Skip if tournament data is missing
        const startTime = new Date(ticket.tournaments.start_time);
        if (startTime > now) {
            upcoming.push(ticket.tournaments);
        } else {
            past.push(ticket.tournaments);
        }
    });

    renderTournamentList(upcoming, upcomingList, loadingUpcoming, 'No upcoming tournaments.');
    renderTournamentList(past, pastList, loadingPast, 'You have not participated in any tournaments yet.');
};

// Generic function to render a list of tournaments
const renderTournamentList = (tournaments, listElement, loadingElement, emptyMessage) => {
    loadingElement.style.display = 'none';
    listElement.innerHTML = ''; // Clear previous content

    if (tournaments.length === 0) {
        listElement.innerHTML = `<p class="col-span-full text-center">${emptyMessage}</p>`;
        return;
    }

    tournaments.forEach(tournament => {
        const card = document.createElement('div');
        card.className = 'bg-gray-800 rounded-lg shadow-lg overflow-hidden';
        card.innerHTML = `
            <img src="${tournament.thumbnail_url}" alt="${tournament.title}" class="w-full h-40 object-cover">
            <div class="p-4">
                <h3 class="text-xl font-bold text-white mb-2">${tournament.title}</h3>
                <p class="text-sm text-gray-400 mb-4">
                    Starts: ${new Date(tournament.start_time).toLocaleString()}
                </p>
                <a href="/dashboard/tournament-details.html?id=${tournament.id}" class="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
                    View Details
                </a>
            </div>
        `;
        listElement.appendChild(card);
    });
};

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth/login.html');
});
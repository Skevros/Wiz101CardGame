function io() {
    return undefined;
}

const socket = io();

// DOM elements
const playerHandElement = document.getElementById('player-hand');
const gameBoardElement = document.getElementById('game-board');
const playerHealthElement = document.getElementById('player-health');
const playerHealthBarElement = document.getElementById('player-health-bar');
const opponentHealthElement = document.getElementById('opponent-health');
const opponentHealthBarElement = document.getElementById('opponent-health-bar');
const playerPipsElement = document.getElementById('player-pips');
const playerPowerPipsElement = document.getElementById('player-power-pips');
const opponentPipsElement = document.getElementById('opponent-pips');
const opponentPowerPipsElement = document.getElementById('opponent-power-pips');
const playerDeckSizeElement = document.getElementById('player-deck-size');
const opponentDeckSizeElement = document.getElementById('opponent-deck-size');
const gameLogElement = document.getElementById('game-log');

let playerId; // Store the assigned player ID

// Game Constants
const STARTING_HEALTH = 750;


// Function to initialize the game
function initializeGame() {
    socket.on('connect', () => {
        playerId = socket.id;
        console.log('Connected to server. Player ID:', playerId);
        socket.emit('join');
    });

    socket.on('gameState', (gameState) => {
        updateGameUI(gameState);
    });
}

// UI Update Functions

function updateHealthBar(player, healthElement, healthBarElement) {
    healthElement.textContent = "Health: " + player.health;
    healthBarElement.style.width = (player.health / STARTING_HEALTH) * 100 + "%";
}

function updatePipCount(player, pipsElement, powerPipsElement) {
    pipsElement.textContent = player.pips;
    powerPipsElement.textContent = player.powerPips;
}

function displayGameMessage(message) {
    const logMessage = document.createElement('p');
    logMessage.textContent = message;
    gameLogElement.appendChild(logMessage);
    gameLogElement.scrollTop = gameLogElement.scrollHeight;
}

// Add a card to the player's hand (UI)
function addCardToHand(cardData, index) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.textContent = `${cardData.name} (${cardData.cost})`;

    // Add click event to play the card
    cardElement.addEventListener('click', () => {
        handleCardClick(index); // Ensure handleCardClick is defined elsewhere
        socket.emit('playCard', index);
    });

    playerHandElement.appendChild(cardElement);
}

function updateGameUI(gameState) {
    // Display last action message
    gameState.lastAction = undefined;
    gameState.players = undefined;
    if (gameState.lastAction) {
        displayGameMessage(gameState.lastAction);
    }

    // Update Player UI
    const player = gameState.players.find(p => p.id === playerId);

    if (player) {
        updateHealthBar(player, playerHealthElement, playerHealthBarElement);
        updatePipCount(player, playerPipsElement, playerPowerPipsElement);
        playerDeckSizeElement.textContent = player.hand.length;

        // Update Player's Hand
        updatePlayerHand(player);
    }

    // Update Opponent UI
    const opponent = gameState.players.find(p => p.id !== playerId);
    if (opponent) {
        updateHealthBar(opponent, opponentHealthElement, opponentHealthBarElement);
        updatePipCount(opponent, opponentPipsElement, opponentPowerPipsElement);
        opponentDeckSizeElement.textContent = opponent.hand.length;
    }

    // Update Game Board (Placeholder)
    updateGameBoard(gameState);
}

function updatePlayerHand(player) {
    playerHandElement.innerHTML = ''; // Clear previous cards

    player.hand.forEach((card, index) => {
        addCardToHand(card, index);
    });
}

function updateGameBoard(gameState) {
    // Clear previous content
    gameState.currentPlayerIndex = undefined;
    gameBoardElement.innerHTML = '';

    // Example logic: Display current player's turn
    const currentPlayer = gameState.currentPlayerIndex === 0 ? 'Player 1' : 'Player 2';
    const currentPlayerElement = document.createElement('p');
    currentPlayerElement.textContent = `Current Turn: ${currentPlayer}`;
    gameBoardElement.appendChild(currentPlayerElement);

    //Display each player's health
    gameState.players.forEach(player => {

        const playerInfo = document.createElement('div');
        playerInfo.classList.add('player-info');

        const playerName = document.createElement('p');
        playerName.textContent = `Player: ${player.id}`;
        playerInfo.appendChild(playerName);

        const playerHealth = document.createElement('p');
        playerHealth.textContent = `Health: ${player.health}`;
        playerInfo.appendChild(playerHealth);

        //Display player's hand size
        const playerHandSize = document.createElement('p');
        playerHandSize.textContent = `Hand Size: ${player.handSize}`;
        playerInfo.appendChild(playerHandSize);

        gameBoardElement.appendChild(playerInfo);
    });

    // Display other game state information
    const gameInfo = document.createElement('div');
    gameInfo.classList.add('game-info');

    // Display other relevant game state data
    const gameMessage = document.createElement('p');
    gameMessage.textContent = 'Game Message: ' + (gameState.lastAction || 'No actions yet.');
    gameInfo.appendChild(gameMessage);

    gameBoardElement.appendChild(gameInfo);
}


// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = 3000;

app.use(express.static('public'));

// Game State
let players = [];
let currentPlayerIndex = 0;
let deck = [];
let discardPile = [];

// Game Constants
const STARTING_HEALTH = 750;
const SCHOOLS_OF_MAGIC = ["fire", "ice", "storm", "death", "life", "myth", "balance"];

// Card Data
const cardData = [
    { name: "Attack", type: "attack", value: 5 },
    { name: "Defend", type: "defense", value: 3 },
    { name: "Shield", type: "shield", value: 0.5, duration: 1 }, // 50% shield for 1 turn
    { name: "Rusty Blade", type: "blade", multiplier: 1.35 }, // 35% damage boost
    { name: "Sharp Blade", type: "blade", multiplier: 1.45 }  // 45% damage boost
];

// Helper Functions

function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
}

function dealCard(player) {
    if (deck.length > 0) {
        player.hand.push(deck.pop());
    } else {
        // Handle empty deck (reshuffle discard pile or end game)
        if (discardPile.length > 0) {
            // Reshuffle discard pile into deck
            shuffle(discardPile); // Assume 'shuffle' is a function that shuffles an array
            deck.push(...discardPile);
            discardPile = []; // Clear discard pile
            // Deal a card to the player from the newly shuffled deck
            player.hand.push(deck.pop());
        } else {
            // End game logic (example)
            endGame(); // Example function to end the game
        }
    }
}
function isSpellHit(accuracy) {
    const roll = Math.floor(Math.random() * 6) + 1; // Roll a 6-sided dice
    if (accuracy >= 70) return roll >= 3;
    if (accuracy >= 50) return roll >= 5;
    if (accuracy >= 40) return roll === 6;
    return false; // Accuracy below 40% will never hit (adjust as needed)
}
function gameState(players, currentPlayerIndex, lastAction, gameBoard, activeEffects) {
    return {
        players: players || [],              // Array of player objects
        currentPlayerIndex: currentPlayerIndex || 0, // Index of the current player
        lastAction: lastAction || "",        // Last action performed in the game
        gameBoard: gameBoard || {},          // Object representing the game board state
        activeEffects: activeEffects || []   // Array of active effects or buffs/debuffs
    };
}
function handleAttackCard(player, card, target) {
    // 1. Check Accuracy
    if (isSpellHit(card.accuracy)) {
        // 2. Calculate Damage (if the attack hits)
        let damage = calculateDamage(player, card, target);
        if (player.blade) {
            damage *= player.blade;
        }

        // 3. Apply Shield (if target has a shield)
        if (target.shield > 0) {
            const shieldAbsorption = Math.min(target.shield, damage); // Absorb up to shield value
            damage -= shieldAbsorption;
            target.shield -= shieldAbsorption; // Reduce shield
            io.emit('gameState', {
                players: gameState.players.map(p => ({
                    id: p.id,
                    health: p.health,
                    shield: p.shield, // Assuming shield is a property of player object
                    handSize: p.hand.length // Assuming handSize is a property of player object
                })),
                lastAction: `${player.id} casts ${card.name}! Hit! ${target.id} takes ${damage} damage.`,
                // Add any other relevant game state information here
            })
        }
        // 4. Apply Damage to Target
        target.health -= damage;

        // 5. Emit Game Messages/Events
        io.emit('gameState', {
            // ... other game state
            lastAction: `${player.id} casts ${card.name}! Hit! ${target.id} takes ${damage} damage.`,
            // ... (You might need to send updated health and shield values here)
        });

    } else {
        // Attack Missed - Send Game Message/Event
        io.emit('gameState', {
            // 5. Emit Game Messages/Events
                players: gameState.players.map(p => ({
                    id: p.id,
                    health: p.health,
                    shield: p.shield, // Assuming shield is a property of player object
                    handSize: p.hand.length // Assuming handSize is a property of player object
                })),
                lastAction: `${player.id} casts ${card.name}! Hit! ${target.id} takes ${damage} damage.`,
                // Add any other relevant game state information here
            });

        }
}

// Game Logic Functions
function startGame() {
    currentPlayerIndex = 0;
    deck = shuffle([...cardData]);
    discardPile = [];

    players.forEach(player => {
        player.health = STARTING_HEALTH;
        player.shield = 0;
        player.pips = 0;
        player.powerPips = 0;
        player.powerPipChance = 0.1; // Start with 10% chance
        player.hand = [];
        // ... (Logic to create/load player decks)
        for (let i = 0; i < 5; i++) { // Deal initial hand
            dealCard(player);
        }
    });

    io.emit('gameState', {
        currentPlayerIndex,
        players: players.map(player => ({ // Send relevant player data
            id: player.id,
            health: player.health,
            handSize: player.hand.length
        })),
    });
}
// Function to generate card data (replace with your actual card data)
function generateCardData() {
    const cards = [];

    SCHOOLS_OF_MAGIC.forEach(school => {
        if (school === 'fire') {
            cards.push({
                name: "Ember Shot",
                school: school,
                cost: 1,
                type: "attack",
                value: 30,
                accuracy: 80,
            });
            cards.push({
                name: "Fireball",
                school: school,
                cost: 3,
                type: "attack",
                value: 80,
                accuracy: 70,
            });
            cards.push({
                name: "Inferno",
                school: school,
                cost: 5,
                type: "attack",
                value: 150,
                accuracy: 60,
            });
            // Add more Fire cards here if needed
        }

        if (school === 'ice') {
            cards.push({
                name: "Frostbite",
                school: school,
                cost: 2,
                type: "attack",
                value: 50,
                accuracy: 90,
            });
            cards.push({
                name: "Ice Shield",
                school: school,
                cost: 3,
                type: "shield",
                value: 0.4, // 40% shield
                duration: 1, // Lasts for 1 turn
            });
            // Add more Ice cards here if needed
        }

        if (school === 'storm') {
            cards.push({
                name: "Thunderbolt",
                school: school,
                cost: 4,
                type: "attack",
                value: 100,
                accuracy: 65,
            });
            cards.push({
                name: "Storm Shield",
                school: school,
                cost: 3,
                type: "shield",
                value: 0.3, // 30% shield
                duration: 1, // Lasts for 1 turn
            });
            // Add more Storm cards here if needed
        }

        if (school === 'death') {
            cards.push({
                name: "Drain Life",
                school: school,
                cost: 2,
                type: "attack",
                value: 40,
                accuracy: 85,
            });
            cards.push({
                name: "Dark Pact",
                school: school,
                cost: 4,
                type: "buff",
                stat: "damage",
                value: 1.2, // 20% damage increase
                duration: 2, // Lasts for 2 turns
            });
            // Add more Death cards here if needed
        }

        if (school === 'life') {
            cards.push({
                name: "Healing Touch",
                school: school,
                cost: 2,
                type: "heal",
                value: 50,
            });
            cards.push({
                name: "Nature's Embrace",
                school: school,
                cost: 3,
                type: "shield",
                value: 0.25, // 25% shield
                duration: 1, // Lasts for 1 turn
            });
            // Add more Life cards here if needed
        }

        if (school === 'myth') {
            cards.push({
                name: "Minotaur",
                school: school,
                cost: 3,
                type: "attack",
                value: 60,
                accuracy: 75,
            });
            cards.push({
                name: "Summon Golem",
                school: school,
                cost: 5,
                type: "summon",
                minion: "stone golem",
            });
            // Add more Myth cards here if needed
        }

        if (school === 'balance') {
            cards.push({
                name: "Sandstorm",
                school: school,
                cost: 4,
                type: "attack",
                value: 80,
                accuracy: 70,
            });
            cards.push({
                name: "Harmony",
                school: school,
                cost: 3,
                type: "buff",
                stat: "healing",
                value: 1.2, // 20% healing increase
                duration: 2, // Lasts for 2 turns
            });
            // Add more Balance cards here if needed
        }
    });

    return cards;
}
function handlePlayCard(player, cardIndex) {
    const card = player.hand.splice(cardIndex, 1)[0]; // Remove card from hand
    discardPile.push(card); // Add to discard

    // Basic validation
    if (!card) {
        console.error('Invalid card index:', cardIndex);
        return;
    }
    // Check if it's the player's turn
    if (currentPlayerIndex !== players.indexOf(player)) {
        console.error('It\'s not your turn!');
        return;
    }
    // Check if player has enough pips to play this card
    if (card.cost > player.pips) {
        console.error('Not enough pips to play this card!');
        return;
    }

    switch (card.type) {
        case "attack":
            // Apply blade multiplier
            const attackValue = Math.round(card.value * player.blade);
            // Apply damage to opponent, considering shield
            const opponent = players[(currentPlayerIndex + 1) % 2];
            const damageDealt = Math.max(attackValue - opponent.shield, 0);
            opponent.health -= damageDealt;
            break;
        case "defense":
            player.health += card.value;
            break;
        case "shield":
            player.shield += player.health * card.value; // Apply shield percentage
            player.shieldTurns = card.duration; // Set shield duration
            break;
        case "blade":
            player.blade = card.multiplier;
            break;
    }

    // Remove card from hand and add to discard pile
    player.hand.splice(cardIndex, 1);
    discardPile.push(card);

    // Pip and Power Pip Logic
    player.pips++; // Gain 1 pip
    if (Math.random() < player.powerPipChance) {
        player.powerPips++;
        player.powerPipChance = 0.1; // Reset chance
    } else {
        player.powerPipChance += 0.05; // Increase chance by 5%
    }

    // End of turn cleanup (shield, draw card, etc.)
    players.forEach(p => {
        if (p.shieldTurns > 0) {
            p.shieldTurns--;
            if (p.shieldTurns === 0) {
                p.shield = 0;
            }
        }
    });
    dealCard(player); // Player draws a card

    // Check if the game is over
    if (players[0].health <= 0 || players[1].health <= 0) {
        io.emit('gameState', { gameOver: true });
    } else {
        // Switch to the next player's turn
        currentPlayerIndex = (currentPlayerIndex + 1) % 2;
        io.emit('gameState', {
            currentPlayerIndex,
            players: players.map(player => ({
                id: player.id,
                health: player.health,
                shield: player.shield,
                handSize: player.hand.length
            })),
            // ... other game state updates
        });
    }
}
function handlePlayerJoin(socket) {
    if (players.length < 2) { // Assuming 2-player game
        const player = {
            id: socket.id,
            health: STARTING_HEALTH,
            pips: 0,
            powerPips: 0,
            powerPipChance: 0.1,
            hand: [],
            deck: shuffle(generateCardData()).slice(0, 20) // Start with a deck of 20 cards
        };
        players.push(player);

        if (players.length === 2) {
            startGame();
        }
    }
}

// Socket.IO Connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', () => {
        handlePlayerJoin(socket);
    });

    socket.on('playCard', (cardIndex) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) {
            console.error('Player not found for ID:', socket.id);
            return; // Stop if player isn't found
        }
        handlePlayCard(player, cardIndex);
    });
    // 1. Validate the Move
    if (currentPlayerIndex !== players.indexOf(player)) {
        // Not the player's turn
        socket.emit('errorMessage', 'It\'s not your turn!');
        return; // Don't proceed if it's not their turn
    }

    const card = player.hand[cardIndex];
    if (!card) {
        socket.emit('errorMessage', 'Invalid card index!');
        return; // Invalid card index
    }
    if (card.cost > player.pips) {
        socket.emit('errorMessage', 'Not enough pips to play this card!');

    }
});
io.on('connection', (socket) => {
    socket.on('join', () => {
        if (players.length < 2) {
            players.push({ id: socket.id, hand: [] });
            if (players.length === 2) {
                // Start the game when two players have joined
                startGame();
            }
        }
    });


    socket.on('playCard', (cardIndex) => {
        const player = players.find(p => p.id === socket.id);
        if (player && currentPlayerIndex === players.indexOf(player)) {
            handlePlayCard(player, cardIndex);
        }
    });

    // Handle player disconnecting
    socket.on('disconnect', () => {
        const playerIndex = players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            // Remove the disconnected player from the game
            const disconnectedPlayerName = players[playerIndex].name;
            players.splice(playerIndex, 1);

            // ... Handle game logic for a disconnecting player
            // ... (You might end the game, allow reconnections, etc.)
            console.log(`Player ${disconnectedPlayerName} disconnected!`);

            // Emit a game state update or specific event
            io.emit('gameState', { playerDisconnected: true });
        }
});

// Start Server
http.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
})})
// --- server.js ---
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import δεδομένων και Κλάσεων
const { ROOMS_DATA, fullMap } = require('./mapData');
const Board = require('./classes/Board');
const CluedoGame = require('./classes/CluedoGame');

// Setup Server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'character_selection.html'));
});

// Δημιουργία Instances
const gameBoard = new Board(fullMap, ROOMS_DATA);
const game = new CluedoGame(io, gameBoard);

// Socket Routing
io.on('connection', (socket) => {
    
    if (game.isStarted) {
        socket.emit('game-already-started');
        socket.emit('error-message', 'Το παιχνίδι έχει ήδη ξεκινήσει! Δοκίμασε αργότερα.');
        return;
    }

    socket.emit('update-occupied-characters', game.occupiedCharacters);

    socket.on('join-game', (data) => game.addPlayer(socket, data || {}));
    socket.on('start-game-request', () => game.startGame(socket));
    socket.on('roll-dice', () => game.rollDice(socket));
    socket.on('move', (direction) => game.movePlayer(socket, direction));
    socket.on('select-quiz-category', (category) => game.askEducationalQuestion(socket.id, category));
    socket.on('submit-quiz-answer', (answer) => game.handleQuizAnswer(socket, answer));
    socket.on('make-hypothesis', (data) => game.makeHypothesis(socket, data));
    socket.on('submit-disproof-card', (card) => game.submitDisproof(socket, card));
    socket.on('finish-turn-from-room', () => game.finishTurnFromRoom(socket));
    socket.on('make-accusation', (data) => game.makeAccusation(socket, data));
    socket.on('disconnect', () => game.removePlayer(socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
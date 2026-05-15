// --- classes/CluedoGame.js ---
const Player = require('./Player');
const Hypothesis = require('./Hypothesis');
const Accusation = require('./Accusation');
const CrimeEnvelope = require('./CrimeEnvelope');
const Deck = require('./Deck'); // <-- ΝΕΟ: Εισαγωγή της Τράπουλας

class CluedoGame {
    constructor(io, board) {
        this.io = io;
        this.board = board;
        this.players = {};
        this.playerOrder = [];
        this.occupiedCharacters = [];
        this.currentPlayerIndex = 0;
        this.isStarted = false;
        
        this.crimeEnvelope = null; 
        this.activeHypothesis = null;
        this.hypTimerRef = null;
    }

    clearHypTimer() {
        if (this.hypTimerRef) {
            clearTimeout(this.hypTimerRef);
            this.hypTimerRef = null;
        }
    }

    sendTurnSignal() {
        if (this.playerOrder.length > 0 && this.isStarted) {
            const activeId = this.playerOrder[this.currentPlayerIndex];
            const activeName = this.players[activeId].name; // Παίρνουμε το όνομα του παίκτη
            
            // Στέλνουμε ως αντικείμενο το id ΚΑΙ το όνομα
            this.io.emit('next-turn', { id: activeId, name: activeName });
        }
    }

    /*sendTurnSignal() {
        if (this.playerOrder.length > 0 && this.isStarted) {
            const activeId = this.playerOrder[this.currentPlayerIndex];
            this.io.emit('next-turn', activeId);
        }
    }*/

    nextTurn() {
        this.clearHypTimer();
        if (this.playerOrder.length === 0) return;

        let attempts = 0;
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
            attempts++;
        } while (this.players[this.playerOrder[this.currentPlayerIndex]].isEliminated && attempts < this.playerOrder.length);

        const activePlayerId = this.playerOrder[this.currentPlayerIndex];
        if (this.players[activePlayerId]) {
            this.players[activePlayerId].remainingMoves = 0;
        }
        this.sendTurnSignal();
    }

    updateHostStatus() {
        if (this.playerOrder.length === 0) return;
        const hostId = this.playerOrder[0];
        this.playerOrder.forEach((id) => {
            if (this.players[id]) {
                this.players[id].isHost = (id === hostId);
                const canStart = (this.playerOrder.length >= 3 && this.playerOrder.length <= 6 && !this.isStarted);
                this.io.to(id).emit('host-privileges', { isHost: this.players[id].isHost, canStart: canStart });
            }
        });
    }

    isTileOccupied(targetX, targetY, movingPlayerId) {
        for (let id in this.players) {
            if (id !== movingPlayerId && this.players[id].x === targetX && this.players[id].y === targetY) {
                return true;
            }
        }
        return false;
    }

    checkNextResponder() {
        if (!this.activeHypothesis) return;

        const totalPlayers = this.playerOrder.length;
        const responderIndex = (this.activeHypothesis.askerIndex + this.activeHypothesis.currentResponderOffset) % totalPlayers;
        const responderId = this.playerOrder[responderIndex];

        if (responderId === this.activeHypothesis.player.id) {
            this.io.emit('system-message', "🔍 Κανείς δεν μπόρεσε να καταρρίψει την υπόθεση.");
            this.io.emit('no-disproof-available', { 
                askerName: this.activeHypothesis.player.name 
            });
            this.activeHypothesis = null;
            return;
        }

        const responder = this.players[responderId];
        const matchingCards = this.activeHypothesis.getMatchingCardsFrom(responder);

        if (matchingCards.length === 0) {
            this.io.emit('system-message', `❌ Ο/Η ${responder.name} δεν μπορεί να απαντήσει.`);
            this.activeHypothesis.currentResponderOffset++;
            this.checkNextResponder();
        } else if (matchingCards.length === 1) {
            this.showCardToAsker(responderId, matchingCards[0]);
        } else {
            this.io.to(this.activeHypothesis.player.id).emit('waiting-for-disproof', {
                responderName: responder.name
            });

            this.io.to(responderId).emit('request-disproof-choice', {
                matches: matchingCards,
                suspect: this.activeHypothesis.suspect,
                weapon: this.activeHypothesis.weapon,
                room: this.activeHypothesis.room
            });
            this.io.emit('system-message', `🤔 Ο/Η ${responder.name} εξετάζει τα στοιχεία του...`);
        }
    }

    showCardToAsker(responderId, card) {
        const responder = this.players[responderId];
        const askerId = this.activeHypothesis.player.id;
        
        this.players[askerId].learnCard(card);
        
        this.io.emit('system-message', `✅ Ο/Η ${responder.name} έδειξε μια κάρτα στον/στην ${this.activeHypothesis.player.name}.`);
        this.io.to(askerId).emit('hypothesis-result', { from: responder.name, card: card });
        
        this.io.emit('player-showed-card', {
            responderName: responder.name,
            askerName: this.activeHypothesis.player.name
        });
        this.activeHypothesis = null;
    }

    addPlayer(socket, data) {
        if (this.isStarted) {
            socket.emit('game-already-started');
            socket.emit('error-message', 'Το παιχνίδι έχει ήδη ξεκινήσει! Δοκίμασε αργότερα.');
            return;
        }

        const finalName = data.username || "Φοιτητής";
        const char = data.character || "Makis";
        const pitY = 100 + (this.playerOrder.length * 50);

        const newPlayer = new Player(socket.id, finalName, char, pitY, this.board.PIT_X);
        this.players[socket.id] = newPlayer;

        if (!this.playerOrder.includes(socket.id)) this.playerOrder.push(socket.id);
        if (char && !this.occupiedCharacters.includes(char)) this.occupiedCharacters.push(char);
        
        this.io.emit('update-occupied-characters', this.occupiedCharacters);
        this.io.emit('update-players', this.players);
        socket.broadcast.emit('system-message', `${finalName} μπήκε στο παιχνίδι.`);
        this.updateHostStatus();
        
        socket.emit('init-grid', this.board.fullMap.map(t => ({ 
            x: t.points[0].x, 
            y: t.points[0].y, 
            w: Math.abs(t.points[1].x - t.points[0].x), 
            h: Math.abs(t.points[2].y - t.points[0].y) 
        })));
    }

    startGame(socket) {
        if (this.players[socket.id] && this.players[socket.id].isHost && this.playerOrder.length >= 3) {
            this.isStarted = true;
            
            //Η Τράπουλα αναλαμβάνει το ανακάτεμα και το μοίρασμα
            const gameDeck = new Deck(Object.keys(this.board.getAllRooms()));
            const { envelope, remainingCards } = gameDeck.generateEnvelopeAndDeck();
            
            this.crimeEnvelope = new CrimeEnvelope(envelope.suspect, envelope.room, envelope.weapon);
            
            let i = 0;
            while (remainingCards.length > 0) {
                this.players[this.playerOrder[i % this.playerOrder.length]].addCards([remainingCards.pop()]);
                i++;
            }
            
            this.playerOrder.forEach(id => this.io.to(id).emit('receive-cards', this.players[id].cards));
            
            const firstPlayerName = this.players[this.playerOrder[0]].name;
            this.io.emit('game-started-signal', { firstPlayer: firstPlayerName });            this.io.emit('system-message', "🚀 Το παιχνίδι ξεκίνησε! Καλή τύχη.");
            this.sendTurnSignal();
        }
    }

    rollDice(socket) {
        if (!this.isStarted || socket.id !== this.playerOrder[this.currentPlayerIndex]) return;
        
        const p = this.players[socket.id];
        if (p.remainingMoves > 0) return;
        
        let startPoint = { x: p.x, y: p.y };
        if (p.currentRoom) {
            const room = this.board.getRoom(p.currentRoom);
            const center = room ? room.getEntranceCenter() : null;
            if (center) startPoint = center;
        }
        
        if (p.isInPit) { 
            p.moveTo(this.board.START_POS.x, this.board.START_POS.y);
            p.isInPit = false; 
            startPoint = this.board.START_POS; 
        }
        
        const total = (Math.floor(Math.random()*6)+1) + (Math.floor(Math.random()*6)+1);
        p.remainingMoves = total;
        
        this.io.emit('dice-result', { id: socket.id, total, moves: this.board.getPossibleMoves(startPoint, total) });
        this.io.emit('update-players', this.players);
        this.io.emit('system-message', `🎲 Ο/Η ${p.name} έφερε ${total}!`);
    }

    movePlayer(socket, direction) {
        const p = this.players[socket.id];
        if (!this.isStarted || !p || socket.id !== this.playerOrder[this.currentPlayerIndex] || p.remainingMoves <= 0) return;

        if (p.currentRoom) {
            const allowedDirections = this.board.ROOM_EXIT_RULES[p.currentRoom] || [];
            if (!allowedDirections.includes(direction)) return;
        }

        let checkX = p.x; 
        let checkY = p.y;
        
        if (p.currentRoom) {
            const room = this.board.getRoom(p.currentRoom);
            const center = room ? room.getEntranceCenter() : null;
            if (center) { checkX = center.x; checkY = center.y; }
        }

        // Βρίσκουμε απλά το αμέσως επόμενο πλακάκι
        let bestTile = this.board.calculateTileInDirection(checkX, checkY, direction);
        

        if (bestTile) {
            if (p.currentRoom) p.currentRoom = null;
            let enteredRoom = null;
            
            const allRooms = this.board.getAllRooms();
            for (let name in allRooms) {
                if (allRooms[name].entrances.some(e => 
                    bestTile.center.x >= e.x && bestTile.center.x <= e.x + e.w &&
                    bestTile.center.y >= e.y && bestTile.center.y <= e.y + e.h)) {
                    enteredRoom = name; 
                    break;
                }
            }



            if (enteredRoom) {
                const roomObj = this.board.getRoom(enteredRoom);
                const slots = roomObj.getSlots();
                const freeSlot = slots.find(s => !this.isTileOccupied(s.x, s.y, socket.id));
                
                if (freeSlot) {
                    p.enterRoom(enteredRoom, freeSlot.x, freeSlot.y);
                    
                    this.io.emit('update-players', this.players);
                    socket.emit('update-moves', { remaining: 0, paths: [] });
                    this.io.emit('system-message', `📍 Ο/Η ${p.name} μπήκε στο δωμάτιο: ${enteredRoom}`);
                    
                    this.io.emit('start-hyp-timer', { id: socket.id, seconds: 60 });
                    this.hypTimerRef = setTimeout(() => {
                        this.io.emit('system-message', `⏰ Ο χρόνος του/της ${p.name} έληξε!`);
                        this.nextTurn();
                    }, 60000);
                }
            } else {
                if (!this.isTileOccupied(bestTile.center.x, bestTile.center.y, socket.id)) {
                    p.moveTo(bestTile.center.x, bestTile.center.y);
                    p.remainingMoves--; 
                    
                    this.io.emit('update-players', this.players);
                    const nextPaths = this.board.getPossibleMoves({x: p.x, y: p.y}, p.remainingMoves);
                    socket.emit('update-moves', { remaining: p.remainingMoves, paths: nextPaths });
                    
                    if (p.remainingMoves === 0) this.nextTurn();
                }
            }
        }
    }

    makeHypothesis(socket, data) {
        this.clearHypTimer();
        const p = this.players[socket.id];
        
        if (!p || socket.id !== this.playerOrder[this.currentPlayerIndex] || !p.currentRoom) return;

        this.activeHypothesis = p.createHypothesis(this.currentPlayerIndex, data.suspect, data.weapon, p.currentRoom);

        socket.broadcast.emit('global-announcement', {
            asker: p.name,
            suspect: data.suspect,
            weapon: data.weapon,
            room: p.currentRoom
        });

        this.io.emit('system-message', `📢 Υπόθεση: ${p.name} -> ${data.suspect}, ${data.weapon}, ${p.currentRoom}`);
        this.checkNextResponder();
    }

    submitDisproof(socket, card) {
        if (!this.activeHypothesis) return;
        if (this.players[socket.id].hasCard(card)) {
            this.showCardToAsker(socket.id, card);
        }
    }

    finishTurnFromRoom(socket) {
        this.clearHypTimer();
        const p = this.players[socket.id];
        if (!p || socket.id !== this.playerOrder[this.currentPlayerIndex]) return;
        
        p.remainingMoves = 0;
        this.nextTurn();
    }

    makeAccusation(socket, data) {
        if (!this.isStarted || socket.id !== this.playerOrder[this.currentPlayerIndex]) return;
    
        const p = this.players[socket.id];
        const acc = p.createAccusation(data.suspect, data.weapon, data.room);
        const isCorrect = acc.execute(this.crimeEnvelope);
                     
        if (isCorrect) {
            this.isStarted = false;
            this.io.emit('game-over-victory', {
                winner: p.name,
                envelope: this.crimeEnvelope.getArrayFormat()
            });
            this.io.emit('game-stopped-signal'); 
        } else { 
            p.eliminate(); 
            
            // Μεταφέρουμε το πιόνι του ηττημένου εκτός οθόνης (για να αδειάσει το Φουαγιέ)
            p.x = -1000;
            p.y = -1000;
            p.currentRoom = null;

            this.io.emit('player-eliminated', {
                playerName: p.name,
                playerCards: p.cards,
                playerId: socket.id
            });
            this.io.emit('update-players', this.players); 

            // --- ΝΕΟΣ ΜΗΧΑΝΙΣΜΟΣ: ΕΛΕΓΧΟΣ ΓΙΑ "BAD ENDING" ---
            let activePlayersCount = 0;
            for (let id in this.players) {
                if (!this.players[id].isEliminated) {
                    activePlayersCount++;
                }
            }

            if (activePlayersCount === 0) {
                // Αν δεν έμεινε κανείς ζωντανός, ενεργοποιούμε το Κακό Τέλος!
                this.isStarted = false;
                this.io.emit('game-over-bad-ending', {
                    envelope: this.crimeEnvelope.getArrayFormat()
                });
                this.io.emit('game-stopped-signal');
            } else {
                // Αν υπάρχουν ακόμα παίκτες, το παιχνίδι συνεχίζεται κανονικά
                this.nextTurn(); 
            }
        }
    }

    /*
    makeAccusation(socket, data) {
        if (!this.isStarted || socket.id !== this.playerOrder[this.currentPlayerIndex]) return;
    
        const p = this.players[socket.id];
        const acc = p.createAccusation(data.suspect, data.weapon, data.room);
        const isCorrect = acc.execute(this.crimeEnvelope);
                     
        if (isCorrect) {
            this.isStarted = false;
            this.io.emit('game-over-victory', {
                winner: p.name,
                envelope: this.crimeEnvelope.getArrayFormat()
            });
            this.io.emit('game-stopped-signal'); 
        } else { 
            p.eliminate(); 

            // --- ΝΕΑ ΛΟΓΙΚΗ ΓΙΑ ΤΟ ΦΟΥΑΓΙΕ ---
            // Μεταφέρουμε το πιόνι του ηττημένου εκτός οθόνης για να αδειάσει το πλακάκι!
            p.x = -1000;
            p.y = -1000;
            p.currentRoom = null;

            this.io.emit('player-eliminated', {
                playerName: p.name,
                playerCards: p.cards,
                playerId: socket.id
            });

            // Ενημερώνουμε άμεσα το frontend για να εξαφανιστεί το πιόνι από το Φουαγιέ
            this.io.emit('update-players', this.players);
            this.nextTurn(); 
        }
    } */

    removePlayer(socketId) {
        if (this.players[socketId]) {
            if (socketId === this.playerOrder[this.currentPlayerIndex]) this.clearHypTimer();
            
            // Κρατάμε μια αναφορά στον παίκτη που φεύγει πριν τον σβήσουμε
            const leavingPlayer = this.players[socketId];
            const cardsToReveal = [...leavingPlayer.cards]; // Αντιγράφουμε τις κάρτες του
            
            const char = leavingPlayer.character;
            this.occupiedCharacters = this.occupiedCharacters.filter(c => c !== char);
            
            const index = this.playerOrder.indexOf(socketId);
            if (index > -1) this.playerOrder.splice(index, 1);
            
            // Τον διαγράφουμε από το παιχνίδι
            delete this.players[socketId];
            
            if (this.isStarted && this.playerOrder.length < 3) {
                this.isStarted = false; 
                this.playerOrder = []; 
                this.players = {}; 
                this.occupiedCharacters = [];
                this.io.emit('system-message', "⚠️ Reset: Λιγότεροι από 3 παίκτες.");
                this.io.emit('game-stopped-signal');
            } else if (this.isStarted && cardsToReveal.length > 0) {
                // OOP: Ενημερώνουμε τα Σημειωματάρια των υπόλοιπων παικτών!
                for (let id in this.players) {
                    cardsToReveal.forEach(card => this.players[id].learnCard(card));
                }
                
                // Στέλνουμε ειδικό event στο Frontend για το μπλε χρώμα και τη διαγραφή
                this.io.emit('abandoned-cards-revealed', {
                    playerName: leavingPlayer.name,
                    cards: cardsToReveal
                });
                this.io.emit('system-message', `👻 Ο/Η ${leavingPlayer.name} έφυγε! Οι κάρτες του/της βρέθηκαν πεταμένες στο πάτωμα...`);
            }

            this.updateHostStatus(); 
            this.io.emit('update-players', this.players); 
            this.sendTurnSignal();
        }
    }
}

module.exports = CluedoGame;
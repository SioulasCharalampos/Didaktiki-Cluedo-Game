const Notebook = require('./Notebook');
const Hypothesis = require('./Hypothesis');
const Accusation = require('./Accusation');

class Player {
    constructor(id, name, character, pitY, pitX) {
        this.id = id;
        this.name = name;
        this.character = character;
        this.x = pitX;
        this.y = pitY;
        this.isInPit = true;
        this.remainingMoves = 0;
        this.isHost = false;
        this.cards = [];
        this.currentRoom = null;
        this.isEliminated = false;
        
        // Σύνθεση (Composition): Κάθε παίκτης ΕΧΕΙ ένα Σημειωματάριο
        this.notebook = new Notebook(); 
    }

    addCards(cardsArray) {
        this.cards.push(...cardsArray);
        cardsArray.forEach(card => this.notebook.markCardAsKnown(card));
    }

    hasCard(cardName) {
        return this.cards.includes(cardName);
    }

    learnCard(cardName) {
        this.notebook.markCardAsKnown(cardName);
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    enterRoom(roomName, slotX, slotY) {
        this.currentRoom = roomName;
        this.moveTo(slotX, slotY);
        this.remainingMoves = 0;
    }

    eliminate() {
        this.isEliminated = true;
    }

    // Ο παίκτης δημιουργεί μια Υπόθεση
    createHypothesis(askerIndex, suspect, weapon, room) {
        return new Hypothesis(this, askerIndex, suspect, weapon, room);
    }

    // Ο παίκτης δημιουργεί μια Τελική Κατηγορία
    createAccusation(suspect, weapon, room) {
        return new Accusation(this, suspect, weapon, room);
    }
}

module.exports = Player;
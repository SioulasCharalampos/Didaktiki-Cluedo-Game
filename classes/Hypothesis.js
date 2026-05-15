const GameAction = require('./GameAction');

class Hypothesis extends GameAction {
    constructor(playerObj, askerIndex, suspect, weapon, room) {
        super(playerObj, suspect, weapon, room);
        this.askerIndex = askerIndex;
        this.currentResponderOffset = 1;
    }

    getMatchingCardsFrom(responderPlayer) {
        return responderPlayer.cards.filter(c => 
            c === this.suspect || 
            c === this.weapon || 
            c === this.room
        );
    }

    execute() {
        // Η λογική ελέγχου περνάει μέσω του Game Controller 
        // Οπότε εδώ δεν χρειάζεται περίπλοκη υλοποίηση για τώρα.
        return true; 
    }
}

module.exports = Hypothesis;
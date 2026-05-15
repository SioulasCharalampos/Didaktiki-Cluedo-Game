const GameAction = require('./GameAction');

class Accusation extends GameAction {
    constructor(playerObj, suspect, weapon, room) {
        super(playerObj, suspect, weapon, room);
    }

    execute(crimeEnvelope) {
        // Τώρα στέλνουμε "μήνυμα" στον φάκελο να ελέγξει!
        return crimeEnvelope.checkAccusation(this);
    }
}

module.exports = Accusation;
class CrimeEnvelope {
    constructor(suspect, room, weapon) {
        this.suspect = suspect;
        this.room = room;
        this.weapon = weapon;
    }

    getArrayFormat() {
        return [this.suspect, this.room, this.weapon];
    }

    // Ο φάκελος ελέγχει αν μια κατηγορία είναι σωστή
    checkAccusation(accusationObj) {
        return (
            this.suspect === accusationObj.suspect && 
            this.room === accusationObj.room && 
            this.weapon === accusationObj.weapon
        );
    }
}

module.exports = CrimeEnvelope;
class GameAction {
    constructor(playerObj, suspect, weapon, room) {
        this.player = playerObj;
        this.suspect = suspect;
        this.weapon = weapon;
        this.room = room;
    }

    // Αφηρημένη μέθοδος - Υλοποιείται στις υποκλάσεις
    execute() {
        throw new Error("Method 'execute()' must be implemented.");
    }
}

module.exports = GameAction;
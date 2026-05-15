// --- classes/Deck.js ---
class Deck {
    constructor(roomsList) {
        this.suspects = ["Makis", "Nefeli", "Litsa", "Kserolas", "Nikos", "Rania"];
        this.rooms = roomsList;
        this.weapons = ["Pyrosvestiras", "Metalliko_Thermos", "Palio_Laptop", "Marm_Sfragida", "Foit_Taftotita", "Vary_Syggramma"];
    }

    // Ιδιωτική μέθοδος για τυχαίο ανακάτεμα ενός πίνακα
    _shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    // Δημιουργεί τον μυστικό φάκελο και επιστρέφει τις υπόλοιπες κάρτες ανακατεμένες
    generateEnvelopeAndDeck() {
        const s = this._shuffle([...this.suspects]);
        const r = this._shuffle([...this.rooms]);
        const w = this._shuffle([...this.weapons]);

        const envelope = {
            suspect: s.pop(),
            room: r.pop(),
            weapon: w.pop()
        };

        // Ενώνουμε όσες κάρτες περίσσεψαν και τις ανακατεύουμε ξανά
        const remainingCards = this._shuffle([...s, ...r, ...w]);
        
        return { envelope, remainingCards };
    }
}

module.exports = Deck;
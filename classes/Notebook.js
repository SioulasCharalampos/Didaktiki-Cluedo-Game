class Notebook {
    constructor() {
        this.knownCards = new Set();
    }

    markCardAsKnown(cardName) {
        this.knownCards.add(cardName);
    }

    isCardKnown(cardName) {
        return this.knownCards.has(cardName);
    }

    getAllKnownCards() {
        return Array.from(this.knownCards);
    }
}

module.exports = Notebook;
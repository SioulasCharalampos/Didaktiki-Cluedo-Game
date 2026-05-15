class Room {
    constructor(name, data) {
        this.name = name;
        this.zone = data.zone;
        this.entrances = data.entrances;
    }

    getEntranceCenter() {
        if (this.entrances && this.entrances.length > 0) {
            const ent = this.entrances[0];
            return { x: ent.x + (ent.w / 2), y: ent.y + (ent.h / 2) };
        }
        return null;
    }

    getSlots() {
        const slots = [];
        const { x, y, w, h } = this.zone;
        const stepX = w / 4; 
        const stepY = h / 3;
        for (let row = 1; row <= 2; row++) {
            for (let col = 1; col <= 3; col++) {
                slots.push({ 
                    x: Math.floor(x + (col * stepX)), 
                    y: Math.floor(y + (row * stepY)) 
                });
            }
        }
        return slots;
    }
}

module.exports = Room;
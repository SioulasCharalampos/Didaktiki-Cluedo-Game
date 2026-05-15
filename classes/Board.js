const Room = require('./Room');

class Board {
    constructor(mapData, roomsData) {
        //this.fullMap = [...mapData];
        //this.rooms = {};
        //this.START_POS = { x: 635, y: 319 };
        this.START_POS = { x: 647, y: 315 };
        this.rooms = {};

        // Φιλτράρουμε τον χάρτη: Κρατάμε τα πάντα ΕΚΤΟΣ από τα πλακάκια
        // που είναι μέσα στα όρια του Φουαγιέ (αλλά κρατάμε το START_POS)
        this.fullMap = [...mapData].filter(tile => {
            const cx = tile.center.x;
            const cy = tile.center.y;
            
            // Βάσει του mapData.js, αυτά είναι τα όρια του εσωτερικού του Φουαγιέ
            const isInsideFouagie = (cx > 585 && cx < 715 && cy > 290 && cy < 375);
            const isStartPos = (cx === this.START_POS.x && cy === this.START_POS.y);
            
            // Αν είναι μέσα στο Φουαγιέ ΚΑΙ δεν είναι το START_POS, το διαγράφουμε!
            return !isInsideFouagie || isStartPos;
        });

        this.fullMap.push({
            center: { x: this.START_POS.x, y: this.START_POS.y },
            points: [ // Εικονικά σημεία για να μην παραπονιέται το σύστημα
                {x: this.START_POS.x - 10, y: this.START_POS.y - 10}, 
                {x: this.START_POS.x + 10, y: this.START_POS.y - 10}, 
                {x: this.START_POS.x + 10, y: this.START_POS.y + 10}, 
                {x: this.START_POS.x - 10, y: this.START_POS.y + 10}
            ]
        });

        this.PIT_X = 25;
        this.ROOM_EXIT_RULES = {
            "Vivliothiki": ["up", "left"],
            "Gipedo_Basket": ["right"],
            "Aith_Teleton": ["right"],
            "Toualetes": ["up"],
            "Lesxi": ["up"],
            "Grammateia": ["down"],
            "Amfitheatro_12": ["down"],
            "KYD": ["down", "left"],
            "Gr_Katsoufi": ["down", "right"]
        };

        for (let name in roomsData) {
            this.rooms[name] = new Room(name, roomsData[name]);
        }

        this._enrichMap();
    }

    _enrichMap() {
        for (let roomName in this.rooms) {
            this.rooms[roomName].entrances.forEach(ent => {
                const centerX = ent.x + (ent.w / 2);
                const centerY = ent.y + (ent.h / 2);
                this.fullMap.push({
                    points: [
                        { x: ent.x, y: ent.y }, 
                        { x: ent.x + ent.w, y: ent.y }, 
                        { x: ent.x + ent.w, y: ent.y + ent.h }, 
                        { x: ent.x, y: ent.y + ent.h }
                    ],
                    center: { x: centerX, y: centerY }
                });
            });
        }
    }

    getRoom(name) {
        return this.rooms[name];
    }

    getAllRooms() {
        return this.rooms;
    }

    getPossibleMoves(startPos, steps) {
        if (steps <= 0) return [];
        let visitedKeys = new Set();
        let startKey = `${Math.floor(startPos.x)},${Math.floor(startPos.y)}`;
        visitedKeys.add(startKey);
        
        let queue = [{ pos: startPos, dist: 0 }];
        let reachable = [];
        
        while (queue.length > 0) {
            let { pos, dist } = queue.shift();
            if (dist < steps) {
                const neighbors = this.fullMap.filter(tile => {
                    const dx = Math.abs(tile.center.x - pos.x);
                    const dy = Math.abs(tile.center.y - pos.y);
                    const d = Math.sqrt(dx * dx + dy * dy);
                    return d > 5 && d < 70 && ((dy < 30 && dx > 20) || (dx < 30 && dy > 20));
                });
                
                neighbors.forEach(n => {
                    let key = `${Math.floor(n.center.x)},${Math.floor(n.center.y)}`;
                    if (!visitedKeys.has(key)) {
                        visitedKeys.add(key);
                        reachable.push(n.center);
                        queue.push({ pos: n.center, dist: dist + 1 });
                    }
                });
            }
        }
        return reachable;
    }

    // --- ΝΕΑ ΜΕΘΟΔΟΣ ΓΙΑ ΤΗ ΓΕΩΜΕΤΡΙΑ ΤΗΣ ΚΙΝΗΣΗΣ ---
    calculateTileInDirection(checkX, checkY, direction) {
        let bestTile = null; 
        let minDistance = Infinity;
        
        // Βρίσκουμε ποια πλακάκια είναι σε κοντινή ακτίνα
        const candidates = this.fullMap.filter(tile => {
            const dist = Math.sqrt(Math.pow(tile.center.x - checkX, 2) + Math.pow(tile.center.y - checkY, 2));
            return dist > 10 && dist < 70; 
        });

        // Υπολογίζουμε τη γωνία για να βρούμε το σωστό πλακάκι βάσει κατεύθυνσης
        candidates.forEach(tile => {
            const angle = Math.atan2(tile.center.y - checkY, tile.center.x - checkX) * 180 / Math.PI;
            let isCorrect = false;
            
            if (direction === 'right' && Math.abs(angle) < 45) isCorrect = true;
            if (direction === 'left' && Math.abs(angle) > 135) isCorrect = true;
            if (direction === 'down' && angle > 45 && angle < 135) isCorrect = true;
            if (direction === 'up' && angle > -135 && angle < -45) isCorrect = true;
            
            const currentDist = Math.sqrt(Math.pow(tile.center.x - checkX, 2) + Math.pow(tile.center.y - checkY, 2));
            if (isCorrect && currentDist < minDistance) { 
                minDistance = currentDist; 
                bestTile = tile; 
            }
        });

        return bestTile;
    }
}

module.exports = Board;
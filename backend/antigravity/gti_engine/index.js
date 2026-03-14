const express = require('express');
const { WebSocketServer } = require('ws');
const Redis = require('ioredis');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const redisSubscriber = new Redis(6379, REDIS_HOST);

// In-memory active events (for prototype)
let activeEvents = {};

const DECAY_CONSTANT = 0.005; // Decay rate per second. e.g. ~2.3 minutes half-life

// Listen to Brain Service events
redisSubscriber.subscribe('scored_events', (err, count) => {
    if (err) {
        console.error("Failed to subscribe: %s", err.message);
    } else {
        console.log(`Subscribed to ${count} channels. Waiting for scored events...`);
    }
});

redisSubscriber.on('message', (channel, message) => {
    if (channel === 'scored_events') {
        try {
            const event = JSON.parse(message);
            console.log(`Received Event ${event.id}: Base Weight=${event.base_weight}`);
            
            // Store event with UNIX timestamp (ms)
            activeEvents[event.id] = {
                ...event,
                createdAtMs: Date.now()
            };
        } catch (e) {
            console.error("Error parsing message", e);
        }
    }
});

// Update hook every 1 second
setInterval(() => {
    let globalGtiScore = 0;
    const now = Date.now();
    const updatedEvents = [];
    
    for (const [id, event] of Object.entries(activeEvents)) {
        // Time diff in seconds
        const t = (now - event.createdAtMs) / 1000;
        
        // S = W * e^(-λt)
        const currentScore = event.base_weight * Math.exp(-DECAY_CONSTANT * t);
        
        if (currentScore < 0.1) {
            // Event has cooled off completely, remove it
            delete activeEvents[id];
        } else {
            globalGtiScore += currentScore;
            updatedEvents.push({
                ...event,
                current_score: currentScore
            });
        }
    }
    
    // Broadcast to all WebSocket clients
    const payload = JSON.stringify({
        type: 'gti_update',
        global_gti: globalGtiScore.toFixed(2),
        active_events: updatedEvents
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
            client.send(payload);
        }
    });

    if (Object.keys(activeEvents).length > 0) {
        console.log(`[Pulse] Global GTI: ${globalGtiScore.toFixed(2)} | Active Pins: ${updatedEvents.length}`);
    }

}, 1000);

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', gti: Object.keys(activeEvents).length });
});

server.listen(4000, () => {
    console.log(`GTI Engine listening on port 4000...`);
});

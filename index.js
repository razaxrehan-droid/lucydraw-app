const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123";

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("MongoDB Connected"))
        .catch(err => console.error("DB Error:", err));
}

const EntrySchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    transactionId: { type: String, required: true, unique: true },
    ticketNumber: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Entry = mongoose.models.Entry || mongoose.model('Entry', EntrySchema);

// Middleware for Admin Security
const authAdmin = (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    if (secret === ADMIN_SECRET) next();
    else res.status(403).json({ success: false, message: "Unauthorized!" });
};

// --- USER ENDPOINT ---
app.post('/api/buy-ticket', async (req, res) => {
    try {
        const { name, phone, transactionId } = req.body;
        if (!name || !phone || !transactionId) {
            return res.status(400).json({ success: false, message: "Tamam details required hain!" });
        }

        const existing = await Entry.findOne({ transactionId });
        if (existing) {
            return res.status(400).json({ success: false, message: "Ye TRX ID pehle se registered hai!" });
        }

        const count = await Entry.countDocuments();
        const ticketNumber = 1000 + count + 1;

        const newEntry = new Entry({ name, phone, transactionId, ticketNumber });
        await newEntry.save();

        res.json({ success: true, ticketNumber });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- ADMIN ENDPOINTS ---
app.get('/api/admin/entries', authAdmin, async (req, res) => {
    const entries = await Entry.find().sort({ createdAt: -1 });
    res.json({ success: true, count: entries.length, entries });
});

app.post('/api/admin/draw-winner', authAdmin, async (req, res) => {
    const entries = await Entry.find();
    if (entries.length === 0) return res.status(400).json({ success: false, message: "Koi entries nahi hain!" });
    
    const randomIndex = Math.floor(Math.random() * entries.length);
    res.json({ success: true, winner: entries[randomIndex] });
});

app.delete('/api/admin/reset', authAdmin, async (req, res) => {
    await Entry.deleteMany({});
    res.json({ success: true, message: "Database reset successfully!" });
});

module.exports = app;
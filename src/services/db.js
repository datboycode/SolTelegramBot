const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../../config'); 


const dbDir = path.dirname(config.DB_FILE);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true }); // Create the directory if it doesn't exist
}

// Initialize local primary database connection using the path from config
const db = new Database(config.DB_FILE);

// Create the wallets table in the primary database if it doesn't exist
db.prepare(`
    CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT NOT NULL,
        private_key TEXT NOT NULL,
        user_id INTEGER NOT NULL
    )
`).run();

function getUserWallets(userId) {
    const query = db.prepare('SELECT address, private_key FROM wallets WHERE user_id = ?');
    return query.all(userId);
}

function removeWallet(userId, address) {
    const query = db.prepare('DELETE FROM wallets WHERE user_id = ? AND address = ?');
    const result = query.run(userId, address);
    return result.changes > 0;
}

function getWalletCount(userId) {
    const query = db.prepare('SELECT COUNT(*) AS count FROM wallets WHERE user_id = ?');
    return query.get(userId).count;
}

module.exports = {
    db,
    getUserWallets,
    removeWallet,
    getWalletCount,
};

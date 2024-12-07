const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

module.exports = {
    // Bot token for authentication (Required, no default)
    BOT_TOKEN: process.env.BOT_TOKEN || '',

    // Database configuration with a default path
    DB_FILE: process.env.DB_FILE || path.join(__dirname, 'src/data/wallets.db'),

    // RPC endpoints for Solana with defaults
    MAINNET: process.env.MAINNET_RPC || 'https://api.mainnet-beta.solana.com' //Reccommend to use custom rpc from helius (FREE)
};

const { Connection, PublicKey } = require('@solana/web3.js');
const Database = require('better-sqlite3');
const Bottleneck = require('bottleneck');
const config = require('../../config'); // Import the config file

// Use the RPC endpoint from config
const connection = new Connection(config.MAINNET); // Replace DEVNET with MAINNET if needed
const db = new Database(config.DB_FILE);

const limiter = new Bottleneck({
    minTime: 200, // Minimum time between requests (5 requests per second)
    maxConcurrent: 5, // Maximum concurrent requests
});

async function fetchMultipleSolBalances(addresses) {
    try {
        const publicKeys = addresses.map((addr) => new PublicKey(addr));
        const accountsInfo = await limiter.schedule(() =>
            connection.getMultipleAccountsInfo(publicKeys)
        );

        return accountsInfo.map((info, index) => ({
            address: addresses[index],
            solBalance: info?.lamports ? info.lamports / 1e9 : 0, 
        }));
    } catch (error) {
        console.error('Error fetching SOL balances:', error.message);
        return [];
    }
}

async function fetchMultipleSplTokenBalances(addresses) {
    try {
        const results = await Promise.all(
            addresses.map(async (address) => {
                const publicKey = new PublicKey(address);
                const tokenAccounts = await limiter.schedule(() =>
                    connection.getParsedTokenAccountsByOwner(publicKey, {
                        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
                    })
                );

                return {
                    address,
                    tokens: tokenAccounts.value.map(({ account }) => {
                        const tokenAmount = account.data.parsed.info.tokenAmount;
                        return {
                            mint: account.data.parsed.info.mint,
                            balance: tokenAmount.uiAmount || 0,
                            decimals: tokenAmount.decimals,
                        };
                    }),
                };
            })
        );

        return results.reduce((acc, { address, tokens }) => {
            acc[address] = tokens;
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching SPL token balances:', error.message);
        return {};
    }
}

async function fetchSingleSplTokenBalances(address) {
    try {
        const publicKey = new PublicKey(address);
        const tokenAccounts = await limiter.schedule(() =>
            connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            })
        );

        return tokenAccounts.value.map(({ account }) => {
            const tokenAmount = account.data.parsed.info.tokenAmount;
            return {
                mint: account.data.parsed.info.mint,
                balance: tokenAmount.uiAmount || 0,
                decimals: tokenAmount.decimals,
            };
        });
    } catch (error) {
        console.error(`Error fetching SPL token balances for address ${address}:`, error.message);
        return [];
    }
}

// View balances logic
async function viewBalances(userId) {
    const wallets = db.prepare('SELECT address FROM wallets WHERE user_id = ?').all(userId);

    if (wallets.length === 0) {
        return [];
    }

    const addresses = wallets.map((wallet) => wallet.address);

    const solBalances = await fetchMultipleSolBalances(addresses);

    const splBalances = await fetchMultipleSplTokenBalances(addresses);

    const balances = solBalances.map(({ address, solBalance }) => ({
        address,
        solBalance,
        splTokens: splBalances[address] || [],
    }));

    return balances;
}

module.exports = {
    viewBalances,
    fetchSingleSplTokenBalances,
    fetchMultipleSolBalances, 
};

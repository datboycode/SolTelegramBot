const { Connection, SystemProgram, PublicKey, Keypair } = require('@solana/web3.js');
const { createTransaction, sendTransaction } = require('../../utils/solana/transaction');
const { getUserWallets } = require('../../services/db');
const { Markup } = require('telegraf');
const bs58 = require('bs58').default;
const config = require('../../../config');

function createSolTransferInstructions(recipientWallets, senderPublicKey, lamportsPerWallet, remainder) {
    return recipientWallets.map((wallet, index) => {
        const recipientPubKey = new PublicKey(wallet.address);
        let lamportsToSend = lamportsPerWallet;
        if (index === 0) lamportsToSend += remainder;
        return SystemProgram.transfer({
            fromPubkey: senderPublicKey,
            toPubkey: recipientPubKey,
            lamports: Number(lamportsToSend),
        });
    });
}

async function distributeSol(ctx) {
    try {
        const connection = new Connection(config.MAINNET);
        const userId = ctx.from.id;

        const senderWallet = ctx.wizard.state.wallets.find(
            (wallet) => wallet.address === ctx.wizard.state.senderWallet
        );

        if (!senderWallet || !senderWallet.private_key) {
            await ctx.reply('❌ Unable to find the private key for the selected wallet.');
            return ctx.scene.leave();
        }

        const senderKeypair = Keypair.fromSecretKey(bs58.decode(senderWallet.private_key));

        if (ctx.wizard.state.mode === 'single') {
            const recipientWalletAddress = ctx.wizard.state.recipientWallet;
            const inputAmount = parseFloat(ctx.message.text);

            if (isNaN(inputAmount) || inputAmount <= 0) {
                await ctx.reply('❌ Invalid amount. Please enter a valid number greater than 0.');
                return;
            }

            const lamports = Math.floor(inputAmount * 1e9);
            const instruction = SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: new PublicKey(recipientWalletAddress),
                lamports,
            });

            await ctx.reply('⏳ Sending SOL, please wait...');

            const transaction = await createTransaction(connection, senderKeypair.publicKey, [instruction]);
            const signature = await sendTransaction(connection, transaction, [senderKeypair]);

            const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
            const successMessage =
                `<b>Transaction Successful!</b>\n\n` +
                `<b>Tx Hash:</b> <a href="${explorerUrl}">${signature}</a>\n\n` +
                `You can verify this transaction on the Solana Explorer`;

            await ctx.reply(successMessage, {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 Back to Menu', 'menu_main')],
                    [Markup.button.callback('📜 My Wallets', 'menu_my_wallets')],
                ])
            });

            return;
        }

        // Even Distribution Mode
        const recipientWallets = getUserWallets(userId).filter(
            (wallet) => wallet.address !== ctx.wizard.state.senderWallet
        );

        if (recipientWallets.length === 0) {
            await ctx.reply('❌ No wallets found to distribute to.');
            return ctx.scene.leave();
        }

        const amount = ctx.wizard.state.amount;
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('❌ Invalid amount. Please enter a valid number greater than 0.');
            return;
        }

        await ctx.reply('⏳ Distributing SOL evenly, please wait...');

        const totalLamports = BigInt(Math.floor(amount * 1e9));
        const numRecipients = BigInt(recipientWallets.length);
        const lamportsPerWallet = totalLamports / numRecipients;
        const remainder = totalLamports % numRecipients;

        const instructions = createSolTransferInstructions(
            recipientWallets,
            senderKeypair.publicKey,
            lamportsPerWallet,
            remainder
        );

        const transaction = await createTransaction(connection, senderKeypair.publicKey, instructions);
        const signature = await sendTransaction(connection, transaction, [senderKeypair]);

        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
        const successMessage =
            `<b>Transaction Successful!</b>\n\n` +
            `<b>Tx Hash:</b> <a href="${explorerUrl}">${signature}</a>\n\n` +
            `You can verify this transaction on the Solana Explorer`;

        await ctx.reply(successMessage, {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Back to Menu', 'menu_main')],
                [Markup.button.callback('📜 My Wallets', 'menu_my_wallets')],
            ])
        });
    } catch (error) {
        console.error('Error during SOL distribution:', error.message);

        if (error.message.includes('insufficient lamports')) {
            await ctx.reply(
                '❌ Transaction failed due to insufficient funds in the sender wallet. Please ensure you have enough SOL to cover the transaction amount and fees.'
            );
        } else {
            await ctx.reply('❌ An error occurred during distribution. Please try again.');
        }
    } finally {
        return ctx.scene.leave();
    }
}

module.exports = { distributeSol };

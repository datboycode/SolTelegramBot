const { db, getUserWallets, removeWallet, getWalletCount } = require('../services/db');
const { Markup } = require('telegraf');
const { generateWallets, saveWalletsToDatabase } = require('./generateWallets');
const { viewBalances } = require('../services/viewBalances');
const { chunkArray, createPaginationKeyboard } = require('../utils/bot/pagination');
const { handleBackToMainMenu } = require('../utils/bot/navigation');

const MAX_SPL_TOKENS_DISPLAY = 1; 

async function handleMyWallets(ctx, page = 1, isEdit = false) {
    const userId = ctx.from.id;

    const fetchingMessage = await ctx.reply('⏳ Fetching your wallets and balances, please wait...');

    const wallets = getUserWallets(userId);

    if (!wallets || wallets.length === 0) {
        const noWalletMessage = '🪙 You have not generated any wallets yet. Use "💳 Generate Wallets" to create new wallets';

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💳 Generate Wallets', 'menu_generate_wallets')],
            [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
        ]);

        if (isEdit) {
            await ctx.editMessageText(noWalletMessage, {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup,
            });
        } else {
            await ctx.reply(noWalletMessage, {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup,
            });
        }

        await ctx.deleteMessage(fetchingMessage.message_id);
        return;
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(wallets.length / itemsPerPage);
    const currentWallets = chunkArray(wallets, itemsPerPage)[page - 1];

    const balances = await viewBalances(userId);

    if (!Array.isArray(balances)) {
        const errorMessage = '❌ Error fetching wallet balances. Please try again later';
        await ctx.reply(errorMessage, {
            parse_mode: 'HTML',
        });
        await ctx.deleteMessage(fetchingMessage.message_id);
        return;
    }

    const lines = [];
    const timestamp = new Date().toLocaleTimeString();

    lines.push(`📄 Showing ${currentWallets.length} of ${wallets.length} wallets on page ${page} of ${totalPages}`);
    lines.push('');
    lines.push(`🔄 Last refreshed at ${timestamp}`);
    lines.push('');

    const separator = '━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    currentWallets.forEach((wallet, index) => {
        const walletIndex = page > 1 ? (page - 1) * itemsPerPage + index + 1 : index + 1;
        const address = wallet.address;

        let walletText = `<b>${walletIndex}. Wallet</b>: <code>${address}</code>\n`;

        const walletBalance = balances.find((b) => b.address === wallet.address);
        const { splTokens = [] } = walletBalance || {};

        if (splTokens.length > 0) {
            walletText += `\n<b>SPL Tokens</b>:`;
            splTokens.slice(0, MAX_SPL_TOKENS_DISPLAY).forEach(({ mint, balance }) => {
                walletText += `\n<b>CA</b>: <code>${mint}</code>\n<b>Balance</b>: ${balance}`;
            });

            if (splTokens.length > MAX_SPL_TOKENS_DISPLAY) {
                const additionalTokensCount = splTokens.length - MAX_SPL_TOKENS_DISPLAY;
                walletText += `\n<b>+${additionalTokensCount} more tokens</b>`;
            }
        }

        lines.push(walletText);
        lines.push(separator); 
        lines.push('');
    });

    const fullMessage = lines.join('\n');

    const walletButtons = currentWallets.map((wallet, index) => {
        const shortAddress = `...${wallet.address.slice(-4)}`;
        const walletBalance = balances.find((b) => b.address === wallet.address);
        const solBalance = walletBalance ? walletBalance.solBalance.toFixed(4) : 'N/A';

        return [
            Markup.button.callback(`🔑 ${shortAddress}`, `view_key_${wallet.address}`),
            Markup.button.callback(`💰 ${solBalance} SOL`, `balance_${wallet.address}`),
            Markup.button.callback('🔍 SPL Tokens', `view_all_tokens_${wallet.address}`),
            Markup.button.callback('🗑️ Remove', `remove_wallet_${wallet.address}`), 
        ];
    });

    const paginationButtons = createPaginationKeyboard(page, totalPages, 'my_wallets_page_');
    const footerButtons = [
        [Markup.button.callback('🔄 Refresh', `refresh_wallets_page_${page}`)],
        [Markup.button.callback('➕ Add New Wallet', 'add_new_wallet')],
        [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
    ];

    const inlineKeyboard = [...walletButtons, ...paginationButtons, ...footerButtons];

    if (isEdit) {
        await ctx.editMessageText(fullMessage, {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard(inlineKeyboard).reply_markup,
        });
    } else {
        await ctx.reply(fullMessage, {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard(inlineKeyboard).reply_markup,
        });
    }

    await ctx.deleteMessage(fetchingMessage.message_id);
}

async function handleViewAllTokens(ctx) {
    const walletAddress = ctx.match[1];
    const userId = ctx.from.id;

    const balances = await viewBalances(userId);
    const walletBalance = balances.find((b) => b.address === walletAddress);

    if (!walletBalance || walletBalance.splTokens.length === 0) {
        await ctx.answerCbQuery('❌ No SPL tokens found for this wallet.', { show_alert: true });
        return;
    }

    const tokenLines = walletBalance.splTokens.map(({ mint, balance }) => {
        return `<b>CA</b>: <code>${mint}</code>\n<b>Balance</b>: ${balance}`;
    });

    const fullTokensMessage = `<b>All SPL Tokens for Wallet:</b>\n<code>${walletAddress}</code>\n\n${tokenLines.join('\n\n')}`;

    const closeButton = Markup.inlineKeyboard([
        [Markup.button.callback('❌ Close', 'close_tokens_message')],
    ]);

    const message = await ctx.reply(fullTokensMessage, {
        parse_mode: 'HTML',
        reply_markup: closeButton.reply_markup,
    });

    ctx.session.splTokensMessageId = message.message_id;
}

async function handleCloseTokensMessage(ctx) {
    if (ctx.session?.splTokensMessageId) {
        await ctx.deleteMessage(ctx.session.splTokensMessageId);
        ctx.session.splTokensMessageId = null; 
    }
    await ctx.answerCbQuery(); 
}

async function handleViewKey(ctx) {
    const walletAddress = ctx.match[1];
    const wallet = db.prepare('SELECT private_key FROM wallets WHERE address = ?').get(walletAddress);

    if (!wallet) {
        return ctx.answerCbQuery('❌ Wallet not found', { show_alert: true });
    }

    await ctx.answerCbQuery();

    const message = `🔑 <b>Private Key</b> for wallet <code>${walletAddress}</code>:\n\n<tg-spoiler>${wallet.private_key}</tg-spoiler>`;

    await ctx.reply(message, { parse_mode: 'HTML' });
}

async function handleRemoveWallet(ctx) {
    const walletAddress = ctx.match[1];
    const userId = ctx.from.id;

    if (!removeWallet(userId, walletAddress)) {
        return ctx.answerCbQuery('❌ Wallet not found or already removed', { show_alert: true });
    }

    await ctx.answerCbQuery('✅ Wallet removed successfully', { show_alert: true });

    const match = ctx.callbackQuery?.data.match(/^my_wallets_page_(\d+)$/);
    const currentPage = match ? parseInt(match[1], 10) : 1;

    await handleMyWallets(ctx, currentPage, true);
}

async function handleAddNewWallet(ctx) {
    const userId = ctx.from.id;
    const walletCount = getWalletCount(userId);

    if (walletCount >= 100) {
        const limitMessage = '❌ You have reached the maximum limit of 100 wallets';
        await ctx.reply(limitMessage, { parse_mode: 'HTML' });
        return;
    }

    const [newWallet] = generateWallets(1);
    saveWalletsToDatabase([newWallet], userId);

    const match = ctx.callbackQuery?.data.match(/^my_wallets_page_(\d+)$/);
    const currentPage = match ? parseInt(match[1], 10) : 1;

    await handleMyWallets(ctx, currentPage, true);
}

function handleWalletPagination(bot) {
    bot.action(/^my_wallets_page_(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[1], 10);
        await handleMyWallets(ctx, page, true);
    });

    bot.action(/^refresh_wallets_page_(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[1], 10);
        await handleMyWallets(ctx, page, true);
    });

    bot.action(/^balance_/, async (ctx) => {
        await ctx.answerCbQuery(); 
    });

    bot.action(/^view_all_tokens_(.+)$/, handleViewAllTokens);

    bot.action('close_tokens_message', handleCloseTokensMessage); 

    bot.action('menu_main', (ctx) => handleBackToMainMenu(ctx));
}

module.exports = {
    handleMyWallets,
    handleViewKey,
    handleRemoveWallet,
    handleAddNewWallet,
    handleWalletPagination,
};

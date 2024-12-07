const { Scenes, Markup } = require('telegraf');
const { getUserWallets } = require('../../services/db');
const { distributeSol } = require('./distributeSol');
const { handleBackToMainMenu } = require('../../utils/bot/navigation');
const { fetchMultipleSolBalances } = require('../../services/viewBalances'); 

const distributeSolWizard = new Scenes.WizardScene(
  'distribute_sol_wizard',
  // Step 1: Choose distribution mode
  async (ctx) => {
    if (ctx.callbackQuery?.data === 'menu_main') {
      await handleBackToMainMenu(ctx);
      return ctx.scene.leave();
    }

    const msg = '🔄 Select a distribution mode:';
    await ctx.reply(msg, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Even Distribution', 'mode_even')],
        [Markup.button.callback('Single Transfer', 'mode_single')],
        [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
      ]).reply_markup,
    });
    return ctx.wizard.next();
  },
  // Step 2: Handle mode-specific logic
  async (ctx) => {
    if (ctx.callbackQuery?.data === 'menu_main') {
      await handleBackToMainMenu(ctx);
      return ctx.scene.leave();
    }

    const mode = ctx.callbackQuery?.data.replace('mode_', '');
    ctx.wizard.state.mode = mode;

    const userId = ctx.from.id;
    const wallets = getUserWallets(userId);

    if (!wallets || wallets.length === 0) {
      await ctx.reply('❌ No wallets found.', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
        ]).reply_markup,
      });
      return ctx.scene.leave();
    }

    ctx.wizard.state.wallets = wallets;

    // Fetch balances for all wallets
    const walletAddresses = wallets.map((wallet) => wallet.address);
    const balances = await fetchMultipleSolBalances(walletAddresses);

    const msg = 'Select a wallet to send SOL FROM:';
    await ctx.reply(msg, {
      reply_markup: Markup.inlineKeyboard(
        balances.map((wallet, index) => {
          const shortAddress = `${wallet.address.slice(0, 3)}...${wallet.address.slice(-4)}`;
          const balance = wallet.solBalance.toFixed(4); // Show balance up to 4 decimal places
          return [
            Markup.button.callback(`${index + 1}. ${shortAddress}`, `select_sender_${wallet.address}`),
            Markup.button.callback(`💰 ${balance} SOL`, `balance_${wallet.address}`),
          ];
        }).concat([[Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]])
      ).reply_markup,
    });
    return ctx.wizard.next();
  },
  // Step 3: Handle recipient wallets
  async (ctx) => {
    if (ctx.callbackQuery?.data === 'menu_main') {
      await handleBackToMainMenu(ctx);
      return ctx.scene.leave();
    }

    if (ctx.callbackQuery?.data?.startsWith('select_sender_')) {
      const senderWallet = ctx.callbackQuery.data.replace('select_sender_', '');
      ctx.wizard.state.senderWallet = senderWallet;

      const wallets = ctx.wizard.state.wallets.filter((wallet) => wallet.address !== senderWallet);

      if (ctx.wizard.state.mode === 'even') {
        const msg =
          `✅ Sender Wallet: ${senderWallet}\n\n` +
          'Enter the total amount of SOL to distribute evenly across all recipient wallets:';
        await ctx.reply(msg, {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
          ]).reply_markup,
        });
        return ctx.wizard.next();
      }

      const walletAddresses = wallets.map((wallet) => wallet.address);
      const balances = await fetchMultipleSolBalances(walletAddresses);

      const msg = 'Select a wallet to send SOL TO:';
      await ctx.reply(msg, {
        reply_markup: Markup.inlineKeyboard(
          balances.map((wallet, index) => {
            const shortAddress = `${wallet.address.slice(0, 3)}...${wallet.address.slice(-4)}`;
            const balance = wallet.solBalance.toFixed(4);
            return [
              Markup.button.callback(`${index + 1}. ${shortAddress}`, `select_recipient_${wallet.address}`),
              Markup.button.callback(`💰 ${balance} SOL`, `balance_${wallet.address}`),
            ];
          }).concat([[Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]])
        ).reply_markup,
      });
      return; 
    }

    if (ctx.callbackQuery?.data?.startsWith('select_recipient_')) {
      const recipientWallet = ctx.callbackQuery.data.replace('select_recipient_', '');
      ctx.wizard.state.recipientWallet = recipientWallet;

      const msg =
        `✅ Sender Wallet:\n${ctx.wizard.state.senderWallet}\n\n` +
        `✅ Recipient Wallet:\n${ctx.wizard.state.recipientWallet}\n\n` +
        'Enter the amount of SOL to send (e.g., 0.5, 1, 1.345):';
      await ctx.reply(msg, {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
        ]).reply_markup,
      });
      return ctx.wizard.next();
    }

    await ctx.reply('❌ Please select a wallet.', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
      ]).reply_markup,
    });
  },
  // Step 4: Finalize and process the transaction
  async (ctx) => {
    if (ctx.callbackQuery?.data === 'menu_main') {
      await handleBackToMainMenu(ctx);
      return ctx.scene.leave();
    }

    if (!ctx.message?.text) {
      await ctx.reply('❌ Please enter a valid input.');
      return;
    }

    const amount = parseFloat(ctx.message.text);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Invalid amount. Please enter a valid number greater than 0.');
      return;
    }

    ctx.wizard.state.amount = amount;

    await distributeSol(ctx);
    await handleBackToMainMenu(ctx);
    ctx.scene.leave();
  }
);

module.exports = {
  distributeSolWizard,
};

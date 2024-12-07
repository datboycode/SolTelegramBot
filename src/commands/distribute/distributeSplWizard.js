const { Scenes, Markup } = require('telegraf');
const { getUserWallets } = require('../../services/db');
const { distributeSpl } = require('./distributeSpl');
const { handleBackToMainMenu } = require('../../utils/bot/navigation');
const { fetchSingleSplTokenBalances } = require('../../services/viewBalances');

const distributeSplWizard = new Scenes.WizardScene(
  'distribute_spl_wizard',
  // Step 1: Select the wallet to distribute from
  async (ctx) => {
    try {
      const userId = ctx.from.id;
      const wallets = getUserWallets(userId);
      ctx.wizard.state.wallets = wallets;

      if (!wallets || wallets.length === 0) {
        await ctx.reply('❌ No wallets found.', {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]
          ]).reply_markup,
        });
        return ctx.scene.leave();
      }

      await ctx.reply('Select a wallet to distribute tokens from:', {
        reply_markup: Markup.inlineKeyboard(
          wallets.map((wallet) => {
            const shortAddress = `${wallet.address.slice(0, 3)}...${wallet.address.slice(-4)}`;
            return [Markup.button.callback(`🔑 ${shortAddress}`, `select_sender_${wallet.address}`)];
          }).concat([
            [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]
          ])
        ).reply_markup,
      });
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error in Step 1:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
      return ctx.scene.leave();
    }
  },

  // Step 2: Fetch SPL Token Balances and Ask for Contract Address
async (ctx) => {
  try {
      if (ctx.callbackQuery?.data === 'menu_main') {
          await handleBackToMainMenu(ctx);
          return ctx.scene.leave();
      }

      if (!ctx.callbackQuery?.data.startsWith('select_sender_')) {
          await ctx.reply('❌ Please select a wallet to distribute tokens from.');
          return;
      }

      const senderWallet = ctx.callbackQuery.data.replace('select_sender_', '');
      ctx.wizard.state.senderWallet = senderWallet;

      await ctx.reply('⏳ Fetching tokens for the selected wallet...');

      const splTokens = await fetchSingleSplTokenBalances(senderWallet);

      if (splTokens.length === 0) {
          await ctx.reply(
              '❌ This wallet does not hold any SPL tokens. Please select another wallet:',
              {
                  reply_markup: Markup.inlineKeyboard(
                      ctx.wizard.state.wallets
                          .filter((wallet) => wallet.address !== senderWallet) 
                          .map((wallet) => {
                              const shortAddress = `${wallet.address.slice(0, 3)}...${wallet.address.slice(-4)}`;
                              return [
                                  Markup.button.callback(
                                      `🔑 ${shortAddress}`,
                                      `select_sender_${wallet.address}`
                                  ),
                              ];
                          }).concat([
                              [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
                          ])
                  ).reply_markup,
              }
          );
          return; 
      }

      ctx.wizard.state.splTokens = splTokens;

      await ctx.reply('🪙 Choose the SPL Token Contract Address or enter it manually:', {
          reply_markup: Markup.inlineKeyboard(
              splTokens.map((token) => {
                  const shortMint = `${token.mint.slice(0, 3)}...${token.mint.slice(-4)}`;
                  return [
                      Markup.button.callback(
                          `💳 ${shortMint} (${token.balance})`,
                          `select_token_${token.mint}`
                      ),
                  ];
              }).concat([[Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]])
          ).reply_markup,
      });
      return ctx.wizard.next();
  } catch (error) {
      console.error('Error in Step 2:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
      return ctx.scene.leave();
  }
},


  // Step 3: Choose SPL Token Contract Address or Manual Entry
  async (ctx) => {
    try {
      if (ctx.callbackQuery?.data === 'menu_main') {
        await handleBackToMainMenu(ctx);
        return ctx.scene.leave();
      }

      if (ctx.callbackQuery?.data?.startsWith('select_token_')) {
        const tokenMint = ctx.callbackQuery.data.replace('select_token_', '');
        ctx.wizard.state.tokenMint = tokenMint;
      } else if (ctx.message?.text) {
        ctx.wizard.state.tokenMint = ctx.message.text.trim();
      } else {
        await ctx.reply('❌ Please select or enter a valid SPL Token Contract Address.');
        return;
      }

      await ctx.reply('🔄 Select a distribution mode:', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('Even Distribution', 'mode_even')],
          [Markup.button.callback('Single Transfer', 'mode_single')],
          [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
        ]).reply_markup,
      });
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error in Step 3:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
      return ctx.scene.leave();
    }
  },

  // Step 4: Handle mode-specific logic
  async (ctx) => {
    try {
      if (ctx.callbackQuery?.data === 'menu_main') {
        await handleBackToMainMenu(ctx);
        return ctx.scene.leave();
      }

      const mode = ctx.callbackQuery?.data.replace('mode_', '');
      ctx.wizard.state.mode = mode;

      const wallets = ctx.wizard.state.wallets.filter((wallet) => wallet.address !== ctx.wizard.state.senderWallet);

      if (mode === 'even') {
        ctx.wizard.state.recipients = wallets.map((wallet) => wallet.address);
        const msg =
          `✅ Sender Wallet: ${ctx.wizard.state.senderWallet}\n\n` +
          `Enter the total amount of SPL Tokens to distribute evenly across ${wallets.length} wallets:`;
        await ctx.reply(msg, {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]
          ]).reply_markup,
        });

        return ctx.wizard.next();
      } else if (mode === 'single') {
        const msg = 'Select a recipient wallet for SPL Tokens:';
        await ctx.reply(msg, {
          reply_markup: Markup.inlineKeyboard(
            wallets.map((wallet) => {
              const shortAddress = `${wallet.address.slice(0, 3)}...${wallet.address.slice(-4)}`;
              return [
                Markup.button.callback(
                  `🔑 ${shortAddress}`,
                  `select_recipient_${wallet.address}`
                ),
              ];
            }).concat([[Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]])
          ).reply_markup,
        });
        return ctx.wizard.next();
      }
    } catch (error) {
      console.error('Error in Step 4:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
      return ctx.scene.leave();
    }
  },

  // Step 5: For even mode, handle user input for total amount
  // For single mode, handle recipient selection
  async (ctx) => {
    try {
      if (ctx.callbackQuery?.data === 'menu_main') {
        await handleBackToMainMenu(ctx);
        return ctx.scene.leave();
      }

      if (ctx.wizard.state.mode === 'even') {
        if (!ctx.message?.text) {
          await ctx.reply('❌ Please enter a valid total amount.');
          return;
        }

        const totalAmount = parseFloat(ctx.message.text);

        if (isNaN(totalAmount) || totalAmount <= 0) {
          await ctx.reply('❌ Invalid amount. Please enter a valid number greater than 0.');
          return;
        }

        const recipients = ctx.wizard.state.recipients.map((address) => ({
          wallet: address,
          amount: totalAmount / ctx.wizard.state.recipients.length,
        }));

        ctx.wizard.state.allocations = recipients;
        await distributeSpl(ctx);
        await handleBackToMainMenu(ctx);
        return ctx.scene.leave();
      } else {
        if (ctx.callbackQuery?.data?.startsWith('select_recipient_')) {
          const recipientWallet = ctx.callbackQuery.data.replace('select_recipient_', '');
          ctx.wizard.state.recipientWallet = recipientWallet;

          const msg =
            `✅ Sender Wallet:\n${ctx.wizard.state.senderWallet}\n\n` +
            `✅ Recipient Wallet:\n${ctx.wizard.state.recipientWallet}\n\n` +
            `Enter the amount of tokens to send:`;

          await ctx.reply(msg, {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')]
            ]).reply_markup,
          });
          return ctx.wizard.next();
        } else {
          await ctx.reply('❌ Please select a recipient wallet.');
        }
      }
    } catch (error) {
      console.error('Error in Step 5:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
      return ctx.scene.leave();
    }
  },

  // Step 6: For single mode, handle the amount input
  async (ctx) => {
    try {
      if (ctx.callbackQuery?.data === 'menu_main') {
        await handleBackToMainMenu(ctx);
        return ctx.scene.leave();
      }

      if (!ctx.message?.text) {
        await ctx.reply('❌ Please enter a valid amount.');
        return;
      }

      const amount = parseFloat(ctx.message.text);

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Invalid amount. Please enter a valid number greater than 0.');
        return;
      }

      ctx.wizard.state.amount = amount;
      await distributeSpl(ctx);
      await handleBackToMainMenu(ctx);
      ctx.scene.leave();
    } catch (error) {
      console.error('Error in Step 6:', error.message);
      await ctx.reply('❌ An error occurred. Please try again.');
      return ctx.scene.leave();
    }
  }
);

module.exports = {
  distributeSplWizard,
};

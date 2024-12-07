const { Markup } = require('telegraf');

/**
 * Registers the help menu handler for the bot.
 * @param {Telegraf} bot 
 */
function registerHelpMenu(bot) {
  bot.action('menu_help', async (ctx) => {
    const helpMessage = await ctx.reply(
      `ℹ️ <b>How to Use This Bot:</b>\n\n` +
      `1️⃣ Use "💳 Generate Wallets" to create wallets.\n` +
      `2️⃣ Use "📜 My Wallets" to manage wallets.\n` +
      `3️⃣ Use "💸 Distribute Tokens" to send SOL or SPL tokens to your wallets.\n\n` +
      `⚠️ <b>Safety Reminders:</b>\n\n` +
      `🔒 Keep your private keys private.\n` +
      `💾 Save your .txt file securely.\n` +
      `🗑️ Delete the .txt file from the chat history for security.`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
          [Markup.button.callback('❌ Close', 'close_help_message')],
        ]),
      }
    );

    ctx.session.helpMessageId = helpMessage.message_id;
  });

  bot.action('close_help_message', async (ctx) => {
    if (ctx.session?.helpMessageId) {
      try {
        await ctx.deleteMessage(ctx.session.helpMessageId);
        ctx.session.helpMessageId = null; 
      } catch (err) {
        console.error('Error deleting help message:', err.message);
      }
    }
    await ctx.answerCbQuery(); 
  });
}

module.exports = {
  registerHelpMenu,
};

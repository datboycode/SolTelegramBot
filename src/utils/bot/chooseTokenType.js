const { Markup } = require('telegraf');

/**
 * Sends a token type selection message.
 * @param {Object} ctx 
 */
async function chooseTokenType(ctx) {
  await ctx.reply(
    `💸 Choose the type of token to distribute:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('💰 Distribute SOL', 'distribute_sol')],
      [Markup.button.callback('🪙 Distribute SPL Tokens', 'distribute_spl')],
      [Markup.button.callback('🔙 Back to Main Menu', 'menu_main')],
    ])
  );
}

/**
 * Registers bot actions for token distribution wizards.
 * @param {Object} bot 
 */
function registerTokenTypeActions(bot) {
  bot.action('distribute_sol', (ctx) => {
    ctx.scene.enter('distribute_sol_wizard'); 
  });

  bot.action('distribute_spl', (ctx) => {
    ctx.scene.enter('distribute_spl_wizard'); 
  });
}

module.exports = {
  chooseTokenType,
  registerTokenTypeActions,
};

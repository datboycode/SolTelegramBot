const { Markup } = require('telegraf');

/**
 * Handle navigation back to the main menu.
 * @param {Object} ctx 
 */
async function handleBackToMainMenu(ctx) {
  ctx.reply(
    `📋 <b>Main Menu</b>\n\n` +
    `Use the buttons below to navigate through the available features:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💳 Generate Wallets', callback_data: 'menu_generate_wallets' },
            { text: '📜 My Wallets', callback_data: 'menu_my_wallets' },
          ],
          [
            { text: '💸 Distribute Tokens', callback_data: 'menu_distribute_tokens' },
            { text: 'ℹ️ Help', callback_data: 'menu_help' },
          ],
        ]
      }
    }
  );
}

module.exports = { handleBackToMainMenu };

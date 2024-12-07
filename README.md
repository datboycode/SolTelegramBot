
# SolTelegramBot

**SolTelegramBot** is a locally run Telegram bot for managing Solana wallets and tokens. It allows users to generate wallets, view balances, distribute SOL and SPL tokens, and manage their keys—all through an easy-to-use Telegram interface. 

---

## Features

- 💳 **Generate Wallets**: Quickly create Solana wallets with secure private keys.
- 📜 **Manage Wallets**: View, remove, or interact with your wallets.
- 💰 **View Balances**: Check SOL and SPL token balances for all wallets.
- 💸 **Distribute Tokens**: Send SOL or SPL tokens to multiple addresses efficiently.
- 🔒 **Secure Private Keys**: Private keys are stored locally on your machine and displayed only when you require.
- ⚙️ **Customizable Endpoints**: Option to use your own RPC endpoint for transactions. (recommended)

---

## Installation

Follow these steps to set up and run `SolTelegramBot` on your local machine.

### Prerequisites

1. **Node.js** (v16 or higher recommended)
   - Download and install Node.js from the [official website](https://nodejs.org/).
   - Alternatively, you can use the following commands to install Node.js on your system:

     **For Linux/macOS**:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```

     **For Windows**:
     - Download the installer from the [Node.js website](https://nodejs.org/).
     - Run the installer and follow the setup instructions.

     After installation, verify the version:
     ```bash
     node -v
     npm -v
     ```

2. **Telegram Bot Token** 
   - Obtain a token from [BotFather](https://core.telegram.org/bots#botfather).

3. **RPC Endpoint**
   - Create a free [RPC endpoint on Helius](https://www.helius.dev) (optional but recommended for enhanced performance and reliability).


### Quick Start (Windows Users)

For Windows users, a convenient `run.bat` script is included to streamline the setup and launch process. This script automates checking for prerequisites, installing dependencies, and starting the bot.
Make sure you get your bot token first before running `run.bat`:

**Get Your Bot Token**:
   - Open Telegram and search for [BotFather](https://core.telegram.org/bots#botfather).
   - Start a chat with BotFather and use the `/newbot` command.
   - Follow the instructions to name your bot and choose a username for it.
   - BotFather will provide you with a token. Copy this token for later use.
   - Save the link to your newly created bot as you'll need to directly message it later.
   - *(Optional)* You can register custom commands (e.g., `/start`, `/help`) for your bot by using the `/setcommands` command in BotFather. This allows users to interact with predefined commands for further customization.

#### Steps to Use `run.bat`:

1. **Locate `run.bat`**:  
   Ensure the `run.bat` file is in the root directory of your project (where `bot.js` is located).

2. **Run the Script**:  
   Double-click on the `run.bat` file or execute it in the command prompt:
   ```cmd
   run.bat
   ```

3. **Follow the Instructions**:
   - The script will verify that Node.js is installed. If it's missing, you'll be prompted to install it.
   - It will check for dependencies and install them automatically.
   - If the `.env` file is missing, it will create one with placeholders for the bot token and RPC endpoint.

4. **Start the Bot**:  
   Once the script completes, the bot will launch. Open Telegram and send a `/start` message to your bot to begin using it.

#### Notes:
- Ensure you update the `.env` file with your bot token and any optional custom RPC endpoint.
- If any errors occur, they will be displayed in the command prompt. You can troubleshoot and re-run the script after resolving them.



### Manual installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/loguru-log/SolTelegramBot
   cd SolTelegramBot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Get Your Bot Token**:
   - Open Telegram and search for [BotFather](https://core.telegram.org/bots#botfather).
   - Start a chat with BotFather and use the `/newbot` command.
   - Follow the instructions to name your bot and choose a username for it.
   - BotFather will provide you with a token. Copy this token for later use.
   - Save the link to your newly created bot as you'll need to directly message it later.
   - *(Optional)* You can register custom commands (e.g., `/start`, `/help`) for your bot by using the `/setcommands` command in BotFather. This allows users to interact with predefined commands for further customization.


4. **Set Up `.env` File**:
   Create a new `.env.example` file in the root directory and remove the `.example` extention:
   ```bash
   BOT_TOKEN=your_telegram_bot_token
   MAINNET_RPC=https://api.mainnet-beta.solana.com
   ```
   - Replace `your_telegram_bot_token` with the token from [BotFather](https://core.telegram.org/bots#botfather).
   - You can optionally provide a custom RPC endpoint for `MAINNET_RPC`. (recommended)

5. **Run the Bot**:
   ```bash
   node bot.js
   ```
    - You should see the bot successfully launching in the terminal.
    - Open Telegram and send a message to the bot you created. Use `/start` to interact with it.

---

## Configuration

The bot uses environment variables for sensitive information. Here's a breakdown:

| Variable        | Description                                        | Default                               |
|------------------|----------------------------------------------------|---------------------------------------|
| `BOT_TOKEN`      | Token for your Telegram bot (from BotFather)       | **Required**                          |
| `MAINNET_RPC`    | Solana Mainnet RPC endpoint                        | `https://api.mainnet-beta.solana.com` |
| `DB_FILE`        | Path to the SQLite database for wallet storage     | `src/data/wallets.db`                 |

---

## Usage

### Bot Commands

- **/start**: Access the main menu.
- **Generate Wallets**: Create and save new Solana wallets.
- **My Wallets**: View balances, private keys, or remove wallets.
- **Distribute Tokens**: Send SOL or SPL tokens to multiple addresses.
- **Help**: Learn how to use the bot.

### Inline Features

- **Manage Wallets**: View wallets with real-time SOL and SPL balances.
- **Token Management**: Quickly distribute tokens or inspect wallet details.

---

## Security

1. 🔐 **Private Keys**: Private keys are only displayed upon request and hidden after use. Ensure they are stored securely.
2. 💾 **Database**: Wallets are saved locally on your machine in a SQLite database (`wallets.db`).
3. ⚠️ **Data Cleanup**: Regularly clear chat history containing sensitive data like `.txt` wallet files.

---

## Troubleshooting

- **Bot fails to start**:
  - Ensure `BOT_TOKEN` is correctly set in `.env`.
  - Verify Node.js and npm are installed and up-to-date.

- **No response from bot**:
  - Check your internet connection.
  - Ensure the Telegram bot token is valid.

- **RPC endpoint errors**:
  - Verify the `MAINNET_RPC` endpoint in the `.env` file.

For additional help, open an issue in this repository.

---


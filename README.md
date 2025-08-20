# Acrylic Discord Bot

A Discord bot for interacting with Acrylic AI models on Hugging Face. [Link](https://huggingface.co/spaces/lasercatz/image2painting)

*Demo only, not intended for production use.*

*Note: The current version may not work well on detailed images.*

---

## Features

- Generate paintings from images and output painting processes as GIF files
- Interact via Discord slash commands
- Use an Express server to keep the bot online, combined with an uptime service

---

## Setup

1. Clone this repository:

```bash
git clone https://github.com/lasercatz/acrylic-discord-bot
```

2. Move into the project folder:

```bash
cd acrylic-discord-bot
```

3. Install dependencies:

```bash
npm install
```
This bot also requires FFmpeg to be installed on your system for media processing. Make sure FFmpeg is installed and accessible via your system PATH before running the bot.

4. Create a .env file in the root directory with your credentials:

```
BOT_TOKEN=your-token-goes-here
CLIENT_ID=your-application-id-goes-here
GUILD_ID=your-server-id-goes-here (optional, for guild-based deployment)
```

5. Deploy Discord slash commands:

```bash
node deploy-commands.js
```

6. Start the bot:
```bash
node index.js
```

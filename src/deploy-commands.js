import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commands = [];

// Rekursive Funktion zum Finden aller JS-Dateien
function getAllFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Commands aus src/commands laden
const commandsPath = path.join(__dirname, './commands');
const commandFiles = getAllFiles(commandsPath);

// Alle Commands importieren
for (const file of commandFiles) {
  const commandModule = await import(pathToFileURL(file).href);
  const command = commandModule.default;
  if (command?.data) {
    commands.push(command.data.toJSON());
  }
}

// Discord REST API Setup
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

// Registriere Befehle (Server-spezifisch oder global)
try {
  console.log('🔁 Registriere Slash Commands bei Discord...');

  // Option 1: Nur auf einem Server (schnell für Tests)
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
  );

  // Option 2: Global (für alle Server, dauert bis zu 1h)
  // await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

  console.log('✅ Slash Commands erfolgreich registriert!');
} catch (error) {
  console.error(error);
}

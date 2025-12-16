import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CommandHandler {
  constructor(client) {
    this.client = client;
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = this.getAllFiles(commandsPath, '.js');

    for (const file of commandFiles) {
      import(pathToFileURL(file).href).then((cmdModule) => {
        const command = cmdModule.default;
        if (command && command.data && command.execute) {
          this.client.commands.set(command.data.name, command);
        }
      });
    }
  }

  getAllFiles(dir, ext, files = []) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((file) => {
      const res = path.resolve(dir, file.name);
      if (file.isDirectory()) this.getAllFiles(res, ext, files);
      else if (res.endsWith(ext)) files.push(res);
    });
    return files;
  }
}

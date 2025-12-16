import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class EventHandler {
  constructor(client) {
    this.client = client;
  }

  loadEvents() {
    const eventsPath = path.join(__dirname, '../events');
    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

    for (const file of eventFiles) {
      import(pathToFileURL(path.join(eventsPath, file)).href).then((eventModule) => {
        const event = eventModule.default;
        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(...args, this.client));
        } else {
          this.client.on(event.name, (...args) => event.execute(...args, this.client));
        }
      });
    }
  }
}

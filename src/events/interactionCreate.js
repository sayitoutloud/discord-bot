// src/events/interactionCreate.js
import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // Kurzes Debug
      if (interaction.isChatInputCommand?.()) {
        console.log(`[INT] Command: ${interaction.commandName} by ${interaction.user.tag}`);
      } else if (interaction.isButton?.()) {
        console.log(`[INT] Button pressed: customId=${interaction.customId} by ${interaction.user.tag}`);
      } else if (interaction.isStringSelectMenu?.()) {
        console.log(`[INT] StringSelectMenu: ${interaction.customId}`);
      }

      // Einmaliger Komponenten-Cache
      if (!client._componentHandlers) {
        const componentsPath = path.join(process.cwd(), 'src', 'components');
        const handlers = new Map();
        const walk = (dir) => {
          for (const file of fs.readdirSync(dir)) {
            const full = path.join(dir, file);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) walk(full);
            else if (file.endsWith('.js')) {
              handlers.set(full, null);
            }
          }
        };
        try { walk(componentsPath); }
        catch (e) { console.warn('Could not walk components dir:', e.message); }

        client._componentHandlers = handlers;      // Map<modulePath, moduleOrNull>
        client._componentPrefixMap = new Map();    // Map<prefix, module>
      }

      // Helper: Resolve by prefix (lazy load)
      const resolveByPrefix = async (prefix) => {
        let handler = client._componentPrefixMap.get(prefix);
        if (handler) return handler;

        for (const modulePath of client._componentHandlers.keys()) {
          try {
            if (!client._componentHandlers.get(modulePath)) {
              const fileUrl = pathToFileURL(modulePath).href;
              const imported = await import(fileUrl);
              const mod = imported.default || imported;
              client._componentHandlers.set(modulePath, mod);
              if (mod?.customIdPrefix) {
                client._componentPrefixMap.set(mod.customIdPrefix, mod);
                console.log(`Loaded component: ${mod.customIdPrefix} from ${modulePath}`);
              }
            }
          } catch (e) {
            console.warn('❌ Failed to import component module', modulePath, e?.message);
          }
        }
        return client._componentPrefixMap.get(prefix);
      };

      // Buttons
      if (interaction.isButton?.()) {
        const customId = interaction.customId || '';
        const prefix = customId.split(':')[0] || customId;

        const handler = await resolveByPrefix(prefix);
        if (!handler || typeof handler.execute !== 'function') {
          try { await interaction.reply({ content: 'Handler für diesen Button nicht gefunden.', flags: 1 << 6 }); } catch {}
          return;
        }
        try { await handler.execute(interaction); }
        catch (e) {
          console.error('Error while executing component handler', e);
          try { 
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: 'Fehler beim Verarbeiten des Buttons.', flags: 1 << 6 });
            } else {
              await interaction.followUp({ content: 'Fehler beim Verarbeiten des Buttons.', flags: 1 << 6 });
            }
          } catch {}
        }
        return;
      }

      // Modals
      if (interaction.isModalSubmit?.()) {
        const customId = interaction.customId || '';
        const prefix = customId.split(':')[0] || customId;

        const handler = await resolveByPrefix(prefix);
        if (!handler || typeof handler.execute !== 'function') {
          try { await interaction.reply({ content: 'Handler für dieses Modal nicht gefunden.', flags: 1 << 6 }); } catch {}
          return;
        }
        try { await handler.execute(interaction); }
        catch (e) {
          console.error('Error while executing modal handler', e);
          try { 
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: 'Fehler beim Verarbeiten des Modals.', flags: 1 << 6 });
            } else {
              await interaction.followUp({ content: 'Fehler beim Verarbeiten des Modals.', flags: 1 << 6 });
            }
          } catch {}
        }
        return;
      }

      // Slash-Commands (Chat Input)
      if (interaction.isChatInputCommand?.()) {
        try {
          const cmd = client.commands?.get(interaction.commandName);
          if (!cmd || typeof cmd.execute !== 'function') {
            // freundlich reagieren, damit kein Timeout entsteht
            return await interaction.reply({ content: 'Unbekannter Command.', flags: 1 << 6 });
          }

          // Command ausführen (defer/reply macht der Command selbst)
          await cmd.execute(interaction, client);
        } catch (e) {
          console.error(`Command error in /${interaction.commandName}:`, e);
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: '❌ Fehler bei der Ausführung des Commands.', flags: 1 << 6 });
            } else {
              await interaction.followUp({ content: '❌ Fehler bei der Ausführung des Commands.', flags: 1 << 6 });
            }
          } catch {}
        }
        return;
      }


      // Andere Typen hier bei Bedarf (Autocomplete etc.)
    } catch (err) {
      console.error('interactionCreate event error', err);
      try {
        if (interaction && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Interner Fehler beim Verarbeiten der Interaktion.', flags: 1 << 6 });
        }
      } catch {}
    }
  },
};

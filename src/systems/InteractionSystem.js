import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export class InteractionSystem {
  constructor(client) {
    this.client = client;
    this.modals = new Map();   // id -> callback
    this.buttons = new Map();  // id -> callback
  }

  // Button registrieren
  registerButton(customId, callback) {
    this.buttons.set(customId, callback);
  }

  // Modal registrieren
  registerModal(customId, callback) {
    this.modals.set(customId, callback);
  }

  // Button-Interaktion ausführen
  async handleButton(interaction) {
    const callback = this.buttons.get(interaction.customId);
    if (!callback) return;
    await callback(interaction);
  }

  // Modal-Interaktion ausführen
  async handleModal(interaction) {
    const callback = this.modals.get(interaction.customId);
    if (!callback) return;
    await callback(interaction);
  }

  // Utility: Button erstellen
  static createButton(id, label, style = ButtonStyle.Primary) {
    return new ButtonBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(style);
  }

  // Utility: Modal erstellen mit Textinput
  static createModal(id, title, inputs = []) {
    const modal = new ModalBuilder().setCustomId(id).setTitle(title);
    const rows = inputs.map(input =>
      new ActionRowBuilder().addComponents(input)
    );
    modal.addComponents(...rows);
    return modal;
  }

  // Utility: TextInput
  static createTextInput(id, label, style = TextInputStyle.Short, placeholder = '', required = true) {
    return new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(style)
      .setPlaceholder(placeholder)
      .setRequired(required);
  }
}

// src/components/modals/profile-modal.js
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

/**
 * Erzeugt ein ModalBuilder mit vorausgefüllten Werten.
 * customId sollte eindeutig sein (z.B. `profile_modal:<targetId>:<random>`).
 * profile: object mit keys (name,nickname,steamhex,bio,gender,level,xp,em_points,sp_points,amp_points,rp_points,roles)
 */
export function createProfileModal(customId, profile = {}) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle('Profil bearbeiten');

  const mk = (id, label, value = '', short = true, style = TextInputStyle.Short) => {
    const input = new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(style)
      .setRequired(false);
    if (value !== undefined && value !== null) {
      try { input.setValue(String(value).slice(0, 4000)); } catch {}
    }
    return new ActionRowBuilder().addComponents(input);
  };

  const rows = [
    mk('name', 'Name (Servername)', profile.name || ''),
    mk('nickname', 'Nickname', profile.nickname || ''),
    mk('steamhex', 'Steam Hex', profile.steamhex || ''),
    mk('bio', 'Bio (mehrzeilig)', profile.bio || '', false, TextInputStyle.Paragraph),
    mk('gender', 'Gender', profile.gender || ''),
    mk('level', 'Level (Zahl)', profile.level ?? ''),
    mk('xp', 'XP (0-99)', profile.xp ?? ''),
    mk('em_points', 'EM Points', profile.em_points ?? ''),
    mk('sp_points', 'SP Points', profile.sp_points ?? ''),
    mk('amp_points', 'AMP Points', profile.amp_points ?? ''),
    mk('rp_points', 'RP Points', profile.rp_points ?? ''),
    mk('roles', 'Rollen (kommagetrennt, Role IDs oder Namen)', (profile.roles && profile.roles.join(', ')) || ''),
  ];

  // Discord modal supports max 5 action rows (each with one text input).
  // To stay within modal limits, we will include first 5 inputs in modal immediately,
  // and include remaining fields in a follow-up ephemeral message prompting the user to use a second command
  // BUT user requested to have all fields — most servers use up to 5 inputs.
  // Workaround: put the most important fields in the modal: name, nickname, steamhex, bio, roles.
  // Then we'll accept additional optional fields via a single 'extra' JSON field — but user asked specifically.
  //
  // To be faithful, we'll pack important fields into modal (5 rows) and then open a second modal if needed.
  //
  // Simpler and safer: include the most important 5 fields: name, nickname, steamhex, bio, roles.
  // For numeric points we will allow managers to edit via /set_profile_points or by re-running set_profile
  //
  // However the user explicitly requested many inputs. Modal limit is 5. We must obey Discord API.
  // Therefore we'll include the most important fields (name, nickname, bio, roles, steamhex),
  // and after saving, if the manager wants to set points/level/xp they can be provided via ephemeral follow-up questions.
  //
  // BUT user insisted all fields — trade-off: we implement a two-step modal flow:
  // 1) first modal with 5 fields (as above)
  // 2) after submit, show a second modal with remaining numeric fields
  //
  // We'll implement the two-step flow: the initial modal id will include suffix ":step1" and the second ":step2".
  //
  // For now create only the step1 modal (name,nickname,steamhex,bio,roles).
  //
  return modal.addComponents(
    new ActionRowBuilder().addComponents(
      // name
      new TextInputBuilder().setCustomId('name').setLabel('Name (Servername)').setStyle(TextInputStyle.Short).setRequired(false).setValue(profile.name || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('nickname').setLabel('Nickname').setStyle(TextInputStyle.Short).setRequired(false).setValue(profile.nickname || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('steamhex').setLabel('Steam Hex').setStyle(TextInputStyle.Short).setRequired(false).setValue(profile.steamhex || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('bio').setLabel('Bio (mehrzeilig)').setStyle(TextInputStyle.Paragraph).setRequired(false).setValue(profile.bio || '')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('roles').setLabel('Rollen (kommagetrennt, Role IDs oder Namen)').setStyle(TextInputStyle.Short).setRequired(false).setValue((profile.roles && profile.roles.join(', ')) || '')
    )
  );
}

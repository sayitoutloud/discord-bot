// src/config.js
// einfache zentrale Konfiguration, liest aus process.env mit sinnvollen Defaults

const envBool = (v, def = true) => {
  if (v === undefined) return def;
  return v.toString().toLowerCase() === 'true';
};

export default {
  // Welcome Channel
  WELCOME_CHANNEL_ID: process.env.WELCOME_CHANNEL_ID || null,
  WELCOME_SCREEN_IMAGE: process.env.WELCOME_SCREEN_IMAGE || 'https://cdn.discordapp.com/attachments/1427356566687977493/1427356606395318313/bg.png?ex=68ee90ed&is=68ed3f6d&hm=53f10ad3aa771f342937fb3f9b5b32a2b1f43ddc0f119cc0dc36878e902d3690&',

  // Left Channel ID
  LEFT_CHANNEL_ID: process.env.LEFT_CHANNEL_ID || null,

  TICKET_LOG_CHANNEL_ID: process.env.TICKET_LOG_CHANNEL_ID || null,
  // ticket counter (persisted) ON/OFF (default: true)
  TICKET_COUNTER_ENABLED: envBool(process.env.TICKET_COUNTER_ENABLED, true),
  // dateipfad für counter (wird automatisch angelegt)
  TICKET_COUNTER_FILE: process.env.TICKET_COUNTER_FILE || './data/ticket_counter.json',
  // prevent duplicate open tickets per category ON/OFF (default: true)
  PREVENT_DUPLICATE_PER_CATEGORY: envBool(process.env.PREVENT_DUPLICATE_PER_CATEGORY, true),

  // --- neu für Role-Management ---
  // Role-Name, dessen Inhaber die Commands benutzen dürfen (z.B. "Role Manager")
  ROLE_MANAGER_ROLE_NAME: process.env.ROLE_MANAGER_ROLE_NAME || 'role manager',

  // Channel-ID für Role-Change-Logs (falls leer, sucht nach "role-logs" Channel)
  ROLE_LOG_CHANNEL_ID: process.env.ROLE_LOG_CHANNEL_ID || null,

  // Grades
  GRADE_FILE: process.env.GRADE_FILE || './data/grades.json',
  GRADE_MANAGER_ROLE_NAME: process.env.GRADE_MANAGER_ROLE_NAME || 'grade manager',
  GRADE_LOG_CHANNEL_ID: process.env.GRADE_LOG_CHANNEL_ID || null,

  // Rank Manager (speziell für rankup/rankdown)
  RANK_MANAGER_ROLE_NAME: process.env.RANK_MANAGER_ROLE_NAME || 'rank manager',
  RANK_LOG_CHANNEL_ID: process.env.RANK_LOG_CHANNEL_ID || null,

  // Level system
  LEVEL_FILE: process.env.LEVEL_FILE || './data/levels.json',
  LEVEL_MANAGER_ROLE_NAME: process.env.LEVEL_MANAGER_ROLE_NAME || 'Level Manager',
  LEVEL_LOG_CHANNEL_ID: process.env.LEVEL_LOG_CHANNEL_ID || null,

  // Profile System
  PROFILE_FILE: process.env.PROFILE_FILE || './data/profiles.json',
  PROFILE_MANAGER_ROLE_NAME: process.env.PROFILE_MANAGER_ROLE_NAME || 'Profile Manager',
  PROFILE_LOG_CHANNEL_ID: process.env.PROFILE_LOG_CHANNEL_ID || null,

  // Warn System
  WARN_FILE: process.env.WARN_FILE || './data/warns.json',
  WARN_MANAGER_ROLE_NAME: process.env.WARN_MANAGER_ROLE_NAME || 'Warn Manager',
  WARN_LOG_CHANNEL_ID: process.env.WARN_LOG_CHANNEL_ID || null,

  // Timeout System
  TIMEOUT_FILE: process.env.TIMEOUT_FILE || './data/timeouts.json',
  TIMEOUT_MANAGER_ROLE_NAME: process.env.TIMEOUT_MANAGER_ROLE_NAME || 'Timeout Manager',
  TIMEOUT_LOG_CHANNEL_ID: process.env.TIMEOUT_LOG_CHANNEL_ID || null,
  TIMEOUT_ROLE_NAME: process.env.TIMEOUT_ROLE_NAME || 'Timed Out',

  SERVER_SUPPORT_ROLE_NAME: 'Server Support',
  SUPPORT_LOG_CHANNEL_ID: '1428497927898136727',

};

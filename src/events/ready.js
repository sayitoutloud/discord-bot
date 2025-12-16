// export default {
//   name: 'ready',
//   once: true,
//   execute(client) {
//     console.log(`✅ Eingeloggt als ${client.user.tag}`);
//     client.user.setActivity('ready to help!');
//   },
// };


import { ActivityType } from 'discord.js';
import fetch from 'node-fetch';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    
    try {
      const response = await fetch('https://mujix.at/version.txt');
      const text = (await response.text()).trim();

      if (text.toLowerCase() === 'false') {
        console.log('❌ Version Check fehlgeschlagen. Bot wird beendet...');
        process.exit(1);
      } else {
        console.log(`ℹ️ Version Info: ${text}`);
      }
    } catch (error) {
      console.error('⚠️ Fehler beim Laden der Version-Datei:', error);
      process.exit(1);
    }
    
    console.log(`✅ Eingeloggt als ${client.user.tag}`);

    // Profilbild und App-Infos setzen
    //await client.user.setAvatar('https://cdn.discordapp.com/attachments/1427356566687977493/1428861131035770930/6422482.png?ex=68f40a20&is=68f2b8a0&hm=7e2392f7712f01d87b41e2d7f9ac105868c838082eb3bd6159383d7dde5c6edf&');
    //await client.user.setUsername('abcdxyzasdf'); // optional
    await client.application?.fetch(); // Fetch der App-Infos
    if (client.application) {
      //await client.application.setDescription('Beschreibung der App');
      //await client.application.setOwner({ id: '1316513496392929404' }); // optional
    }

    // Array mit Aktivitäten
    const activities = [
      { type: ActivityType.Playing, text: 'RP sometimes 🎮' },
      { type: ActivityType.Watching, text: 'server tickets 🎫' },
      { type: ActivityType.Listening, text: 'server problems 💡' },
      { type: ActivityType.Watching, text: () => `all ${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)} users 👀` }, // dynamisch
      { type: ActivityType.Listening, text: () => `sayit_outloud ❤` },
      { type: ActivityType.Listening, text: () => `https://discord.gg/GkZAC9GQfs ❤` },
      
    ];

    let index = 0;
    setInterval(() => {
      const activity = activities[index];

      // Prüfen ob text eine Funktion ist (für dynamische Inhalte)
      const text = typeof activity.text === 'function' ? activity.text() : activity.text;

      client.user.setActivity(text, { type: activity.type });
      
      index = (index + 1) % activities.length; // Nächste Aktivität
    }, 10000); // 15 Sekunden
  },
};

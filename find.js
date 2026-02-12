// mention-relay-webhook.js
const TARGET_GUILD_ID = '871405550703878187';
const TARGET_CHANNEL_IDS = [
  '1430028232920535090',
  '1428647247779987578',
];
const NOTIFY_GUILD_ID = '1401622759582466229'; // ยังเก็บไว้เผื่อเช็กภายหลัง ถ้าอยากตัดก็ได้

const MENTION_CONFIGS = {
    '<@&1428636454036176899>': '1430308350209560721', 
    '<@&1428636438815309834>': '1430308351958323210', 
    '<@&1428636298746396774>': '1430308353413742807', 
    '<@&1428636522189426733>': '1434195723821252760',
    '<@&1428636402391711817>': '1434195942764187848',
    '<@&1428636208963125351>': '1434195998992760832',
    '<@&1428636517273833473>': '1434195893392900178',
    '<@&1428636499137794140>': '1470808533455994934',

    '<@&1428636361463828481>': '1471545275838632029',
    '<@&1428636154982305884>': '1471545328179085473',
    '<@&1428636255381618768>': '1471545362094493800',
  
};

const ROLE_MENTION_REGEX = /<@&\d+>/g;

// ===================== BOT 2 (TOKENBOT) CONFIG =====================

const TOKENBOT = process.env.TOKENBOT;
if (!TOKENBOT) {
  console.warn('⚠️ ไม่พบ env.TOKENBOT โหมดส่งผ่าน webhook ด้วยบอทตัวที่ 2 จะไม่ทำงาน');
}

// cache webhook ต่อ channel: { id, token }
const webhookCache = new Map();

/**
 * เรียก Discord API ด้วย TOKENBOT
 */
async function discordApi(path, options = {}) {
  if (!TOKENBOT) throw new Error('TOKENBOT_NOT_SET');

  const url = `https://discord.com/api/v10${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bot ${TOKENBOT}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord API ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

/**
 * ดึงหรือสร้าง webhook สำหรับ channel ปลายทาง
 */
async function getOrCreateWebhookForChannel(channelId) {
  if (webhookCache.has(channelId)) {
    return webhookCache.get(channelId);
  }

  // 1) หา webhook ที่มีอยู่ก่อน
  const hooks = await discordApi(`/channels/${channelId}/webhooks`);
  let hook = hooks.find(h => h.name === 'Mention Relay');

  // 2) ถ้าไม่มีให้สร้างใหม่
  if (!hook) {
    hook = await discordApi(`/channels/${channelId}/webhooks`, {
      method: 'POST',
      body: { name: 'Mention Relay' },
    });
  }

  const data = { id: hook.id, token: hook.token };
  webhookCache.set(channelId, data);
  return data;
}

/**
 * ส่งข้อความผ่าน webhook โดยปลอมชื่อ/รูปเป็นคนส่งจริง
 */
async function sendAsUserViaWebhook(channelId, author, content) {
  if (!TOKENBOT) return; // กัน error ถ้าไม่มี token

  const webhook = await getOrCreateWebhookForChannel(channelId);

  const username =
    (author.globalName /* Discord ใหม่มี globalName */) ||
    author.username;

  // ถ้าใช้ discord.js-selfbot-v13 รองรับ displayAvatarURL อยู่แล้ว
  const avatarUrl = author.displayAvatarURL
    ? author.displayAvatarURL({ format: 'png', size: 256 })
    : author.avatarURL?.({ format: 'png', size: 256 });

  await fetch(`https://discord.com/api/v10/webhooks/${webhook.id}/${webhook.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      username,
      avatar_url: avatarUrl || undefined,
    }),
  });
}

// ===================== MAIN LISTENER =====================

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    try {
      if (!message.guild || message.author.id === client.user.id) return;

      // ฟังเฉพาะกิลด์เป้าหมาย
      if (message.guild.id !== TARGET_GUILD_ID) return;

      // ฟังเฉพาะช่องตามลิสต์
      if (!TARGET_CHANNEL_IDS.includes(message.channel.id)) return;

      for (const [TARGET_ROLE_MENTION, NOTIFY_CHANNEL_ID] of Object.entries(MENTION_CONFIGS)) {
        if (!message.content.includes(TARGET_ROLE_MENTION)) continue;

        // สร้างลิงก์ไปข้อความต้นทางปกติ
        const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

        // ตัด role mention ออก
        const cleanedContent = message.content
          .replace(ROLE_MENTION_REGEX, '')
          .trim();

        // ถ้าข้อความกลายเป็นว่าง ก็ส่งแค่ลิงก์
        const notificationMessage =
          cleanedContent.length > 0
            ? `<@${message.author.id}> : ${cleanedContent}\n[ ${messageLink} ]`
            : `<@${message.author.id}> \n[ ${messageLink} ]`;

        // ส่งด้วย TOKENBOT ผ่าน webhook (ปลอมชื่อ/รูปเป็นคนคนนั้น)
        await sendAsUserViaWebhook(NOTIFY_CHANNEL_ID, message.author, notificationMessage).catch((e) => {
          console.error(`❌ ส่ง webhook แจ้งเตือน Role ${TARGET_ROLE_MENTION} ไม่สำเร็จ:`, e);
        });

        console.log(
          `✅ ส่งการแจ้งเตือน (webhook) Role ${TARGET_ROLE_MENTION} จาก ${message.author.tag} ไปยังช่อง ${NOTIFY_CHANNEL_ID}`
        );

        break; // เจอ role อันแรกแล้วก็พอ
      }
    } catch (e) {
      console.error('❌ Mention Detector Error:', e);
    }
  });
};



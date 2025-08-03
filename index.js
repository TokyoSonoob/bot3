const { Client } = require('discord.js-selfbot-v13');

const client = new Client();

const listenChannelIds = [
  '1080187563073081454',
  '1086201661929832500',
  '1084807182098370731',
  '1377816772354244689'
];

const forwardChannelId = '1401622760496562269'; // ห้องเป้าหมาย
const logChannelId = '1401627069393272912'; // ห้อง log แจ้งว่าบอทส่งไปที่ไหน
const keywords = ['<@&1082277102830764152>'];
const mentionMessage = '<@&1082277102830764152> หา ญ นัด';

let currentSendIndex = 0;

client.on('ready', async () => {
  console.log(`✅ เข้าระบบในชื่อ ${client.user.tag}`);

  // เริ่มวนส่งข้อความ
  setInterval(async () => {
    const targetChannelId = listenChannelIds[currentSendIndex];

    try {
      const channel = await client.channels.fetch(targetChannelId);
      const logChannel = await client.channels.fetch(logChannelId);

      if (!channel) {
        console.log(`❌ ไม่พบช่อง ${targetChannelId}`);
        return;
      }

      await channel.send(mentionMessage);
      console.log(`✅ ส่งข้อความไปยังห้อง ${targetChannelId} เรียบร้อย`);

      if (logChannel) {
        await logChannel.send(`[ LOG ] ได้ส่งข้อความลงไปยังห้อง <#${targetChannelId}>`);
      }
    } catch (error) {
      console.error(`❌ ส่งข้อความล้มเหลวที่ห้อง ${targetChannelId}:`, error);
    }

    currentSendIndex = (currentSendIndex + 1) % listenChannelIds.length;
  }, 60000);
});

client.on('messageCreate', async (message) => {
  if (!listenChannelIds.includes(message.channel.id)) return;
  if (message.author.id === client.user.id) return;

  const content = message.content.toLowerCase();
  if (keywords.some(word => content.includes(word))) {
    console.log(`📩 พบข้อความ: [${message.author.tag}] ${message.content}`);

    try {
      const forwardChannel = await client.channels.fetch(forwardChannelId);
      if (forwardChannel) {
        const cleaned = message.content.replace(/<@&1082277102830764152>/g, '').trim();
        await forwardChannel.send(`<@${message.author.id}> : ${cleaned}`);
        console.log('✅ ส่งต่อข้อความไปยังห้องเป้าหมายเรียบร้อย');
      } else {
        console.log('❌ ไม่พบห้องปลายทาง');
      }
    } catch (error) {
      console.error('❌ ไม่สามารถส่งต่อข้อความ:', error);
    }
  }
});

client.login(process.env.token);

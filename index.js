const { Client } = require('discord.js-selfbot-v13');

const client = new Client();
require("./server");
// ห้องเป้าหมายพร้อมน้ำหนักความน่าจะเป็น
const weightedChannelIds = [
  { id: '1080187563073081454', weight: 40 },
  { id: '1086201661929832500', weight: 10 },
  { id: '1084807182098370731', weight: 20 },
  { id: '1377816772354244689', weight: 30 },
];

// ห้องสำหรับ log และส่งต่อข้อความ
const forwardChannelId = '1401622760496562269';
const logChannelId = '1401627069393272912';

// คำที่ใช้ตรวจสอบในข้อความ
const keywords = ['<@&1082277102830764152>'];

// ข้อความสุ่มที่ใช้ mention
const mentionMessages = [
  '<@&1082277102830764152> หา ญ นอนกอด',
  '<@&1082277102830764152> หา ญ นอนกอดคืนนี้',
  '<@&1082277102830764152> หานัดชิวๆ ขอ ญ',
  '<@&1082277102830764152> หาเพื่อนเที่ยว ขอ ญ',
  '<@&1082277102830764152> หา One Night',
  '<@&1082277102830764152> ใครเหงาทักมา ขอ ญ',
  '<@&1082277102830764152> หา ญ',
  '<@&1082277102830764152> ปะทิว เดม',
  '<@&1082277102830764152> ท่าแซะ เดม',
];

// ฟังก์ชันสุ่มข้อความ
function getRandomMentionMessage() {
  const index = Math.floor(Math.random() * mentionMessages.length);
  return mentionMessages[index];
}

// ฟังก์ชันสุ่มห้องตามน้ำหนัก
function getRandomChannelId() {
  const totalWeight = weightedChannelIds.reduce((sum, ch) => sum + ch.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const channel of weightedChannelIds) {
    cumulative += channel.weight;
    if (random < cumulative) {
      return channel.id;
    }
  }
}

client.on('ready', async () => {
  console.log(`✅ เข้าระบบในชื่อ ${client.user.tag}`);

  // ส่งข้อความสุ่มทุก 2 นาที
  setInterval(async () => {
    const targetChannelId = getRandomChannelId();

    try {
      const channel = await client.channels.fetch(targetChannelId);
      const logChannel = await client.channels.fetch(logChannelId);

      if (!channel) {
        console.log(`❌ ไม่พบช่อง ${targetChannelId}`);
        return;
      }

      const messageToSend = getRandomMentionMessage();
      await channel.send(messageToSend);
      console.log(`✅ ส่งข้อความไปยังห้อง ${targetChannelId} เรียบร้อย`);

      if (logChannel) {
        await logChannel.send(`[ LOG ] ได้ส่งข้อความลงไปยังห้อง <#${targetChannelId}>`);
      }
    } catch (error) {
      console.error(`❌ ส่งข้อความล้มเหลวที่ห้อง ${targetChannelId}:`, error);
    }
  }, 60000);
});

client.on('messageCreate', async (message) => {
  if (!weightedChannelIds.some(ch => ch.id === message.channel.id)) return;
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

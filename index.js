const { Client } = require('discord.js-selfbot-v13');

const client = new Client();
require("./server");

// ห้องเป้าหมายพร้อมน้ำหนักความน่าจะเป็น
const weightedChannelIds = [
  { id: '1080187563073081454', weight: 100 },
  { id: '1377142261363638363', weight: 0 },
];

// ห้องสำหรับ log และส่งต่อข้อความ
const forwardChannelId = '1401622760496562269';
const logChannelId = '1401627069393272912';

// คำที่ใช้ตรวจสอบในข้อความ
const keywords = ['<@&1082277102830764152>'];

const mentionMessages = ['<@&1082277102830764152> ปะทิว'];


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

  async function sendRandomMessage() {
    const targetChannelId = getRandomChannelId();

    try {
      const channel = await client.channels.fetch(targetChannelId);
      const logChannel = await client.channels.fetch(logChannelId);

      if (!channel) {
        console.log(`❌ ไม่พบช่อง ${targetChannelId}`);
        return;
      }

      // ดึงข้อความล่าสุดในช่องนั้น (limit=1)
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();

      // ถ้ามีข้อความล่าสุด และข้อความนั้นเป็นของบอทเอง ให้ข้ามไม่ส่ง
      if (lastMessage && lastMessage.author.id === client.user.id) {
        console.log(`⚠️ ข้อความล่าสุดในช่อง ${targetChannelId} เป็นของบอทเอง, ข้ามการส่งข้อความซ้ำ`);
      } else {
        const messageToSend = getRandomMentionMessage();
        await channel.send(messageToSend);
        console.log(`✅ ส่งข้อความไปยังห้อง ${targetChannelId} เรียบร้อย`);

        if (logChannel) {
          await logChannel.send(`[ LOG ] ได้ส่งข้อความลงไปยังห้อง <#${targetChannelId}>`);
        }
      }
    } catch (error) {
      console.error(`❌ ส่งข้อความล้มเหลวที่ห้อง ${targetChannelId}:`, error);
    }

    const randMinutes = (minM, maxM) =>
  Math.floor(Math.random() * ((maxM - minM) * 60_000 + 1)) + minM * 60_000;

const delay = randMinutes(5, 10); // ms

    setTimeout(sendRandomMessage, delay);
  }
  sendRandomMessage();
});

client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;

  // เช็คคำสั่ง !test จาก user ID ที่กำหนด
  if (message.author.id === '849964668177088562' && message.content.trim() === '!test') {
    try {
      await message.channel.send('บอทกำลังทำงานอยู่ครับ');
      console.log(`✅ ตอบคำสั่ง !test ให้กับผู้ใช้ ${message.author.tag}`);
    } catch (error) {
      console.error('❌ ไม่สามารถตอบคำสั่ง !test:', error);
    }
    return; // ไม่ต้องทำงานส่วนอื่นต่อ
  }

  if (!weightedChannelIds.some(ch => ch.id === message.channel.id)) return;

  const content = message.content.toLowerCase();
  if (keywords.some(word => content.includes(word))) {
    console.log(`📩 พบข้อความ: [${message.author.tag}] ${message.content}`);

    try {
      const forwardChannel = await client.channels.fetch(forwardChannelId);
      if (forwardChannel) {
        const cleaned = message.content.replace(/<@&1082277102830764152>/g, '').trim();
const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
await forwardChannel.send(`<@${message.author.id}> : ${cleaned}\n${messageLink}`);
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

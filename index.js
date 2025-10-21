require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const client = new Client();
require("./server"); 

const TARGET_GUILD   = '770902518238019594'; 
const TARGET_CHANNEL = '1386727676353450095'; 
const TMN_REGEX = /(https?:\/\/gift\.truemoney\.com\/campaign\/(\?v=)?[\w\-_]+)/i; 
const TEST_USER_ID = '849964668177088562'; 

function extractGiftInput(input) {
  const raw = (input || "").trim();
  if (!raw) return null;
  
  try {
    const u = new URL(raw);
    if (/(^|\.)gift\.truemoney\.com$/i.test(u.hostname) && (!!u.searchParams.get("v") || !!u.pathname.split('/').pop())) {
        return raw;
    }
  } catch {}
  
  const code = raw.replace(/[^A-Za-z0-9]/g, "");
  return code.length >= 8 ? code : null;
}

client.on('ready', async () => {
  console.log(`✅ เข้าระบบในชื่อ ${client.user.tag}`);
  console.log('🤖 Selfbot กำลังทำงานในโหมดตรวจจับลิงก์อั่งเปา...');
  console.log('----------------------------------------------------');
});

const config = {
    TARGET_GUILD,
    TARGET_CHANNEL,
    TMN_REGEX,
    TEST_USER_ID,
    extractGiftInput,
};
require('./money')(client, config); 
require('./find')(client, config); 
require('./word')(client, config);
require('./friend')(client, config);

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ ไม่พบ BOT_TOKEN ใน .env');
  process.exit(1);
}
client.login(token).catch(err => {
  console.error('❌ Login failed:', err);
  process.exit(1);
});
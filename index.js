require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const client1 = new Client(); // เปลี่ยนชื่อ client เป็น client1 เพื่อความชัดเจน
const client2 = new Client(); // เพิ่ม Client 2
require("./server"); 

// === GLOBAL STATE ===
// ตัวแปร Global สำหรับ Logic การจองเวลา (ที่เคยเกิดปัญหา TypeError)
const todayTimers = []; 

// === CONFIGURATION ===
const TARGET_GUILD   = '770902518238019594'; // Guild ID สำหรับ Truemoney
const TARGET_CHANNEL = '1386727676353450095'; // Channel ID สำหรับ Truemoney
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

// === LOGIN CLIENT 2 (ต้องทำก่อน Client 1 เพื่อความรวดเร็ว) ===
const token2 = process.env.BOT_TOKEN2;
if (!token2) {
    console.error('❌ ไม่พบ BOT_TOKEN2 ใน .env');
} else {
    client2.login(token2).catch(err => {
        console.error('❌ Client 2 Login failed:', err.message);
    });
}


// === MAIN ENTRY POINT ===
client1.on('ready', async () => {
  console.log(`✅ Client 1 เข้าระบบในชื่อ ${client1.user.tag}`);
  console.log('🤖 Selfbot กำลังทำงานในโหมดรวม...');
  console.log('----------------------------------------------------');

    const config = {
        TARGET_GUILD,
        TARGET_CHANNEL,
        TMN_REGEX,
        TEST_USER_ID,
        extractGiftInput,
        // ส่งตัวแปร Global เข้าไปใน config
        todayTimers, 
    };

    // ส่ง client1, client2 และ config เข้าไปใน Module ต่างๆ
    require('./money')(client1, config); // ส่ง client2 ไปด้วย
    require('./find')(client1, config); 
    require('./word')(client1, config);
    require('./friend')(client1, config);
    
    require('./test')(client1, client2, todayTimers); 
});

// === LOGIN CLIENT 1 ===
const token1 = process.env.BOT_TOKEN;
if (!token1) {
  console.error('❌ ไม่พบ BOT_TOKEN ใน .env');
  process.exit(1);
}
client1.login(token1).catch(err => {
  console.error('❌ Client 1 Login failed:', err);
  process.exit(1);
});

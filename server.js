const express = require("express");
const app = express();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatStatusChip(ok, yesText, noText) {
  return ok
    ? `<span class="chip chip-green">${escapeHtml(yesText)}</span>`
    : `<span class="chip chip-red">${escapeHtml(noText)}</span>`;
}

function formatDiscordChip(state, ready) {
  if (ready) return '<span class="chip chip-green">เข้า Discord ได้</span>';
  if (state === "logging_in") return '<span class="chip chip-yellow">กำลังลองเข้า</span>';
  return '<span class="chip chip-red">เข้า Discord ไม่ได้</span>';
}

function card(title, body) {
  return `<section class="card"><div class="card-title">${title}</div>${body}</section>`;
}

app.get("/__bot/status", (_, res) => {
  const state = global.BOT_RUNTIME;
  const payload = typeof state?.getPublicStatus === "function" ? state.getPublicStatus() : { ok: false };
  res.json(payload);
});

app.get("/", (_, res) => {
  const state = global.BOT_RUNTIME;
  const data = typeof state?.getPublicStatus === "function" ? state.getPublicStatus() : null;

  if (!data) {
    return res.send("Bot status unavailable");
  }

  const activeHostText = data.workingHost === "none" || data.workingHost === "unknown"
    ? "ยังไม่มีตัวไหนทำงานอยู่"
    : data.workingHost;

  const logsHtml = (data.logs || [])
    .slice(0, 8)
    .map(
      (log) => `
        <div class="log-item">
          <div class="log-time">${escapeHtml(log.at)}</div>
          <div class="log-type">${escapeHtml(log.type)}</div>
          <div class="log-message">${escapeHtml(log.message)}</div>
        </div>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="5" />
  <title>${escapeHtml(data.name)} status</title>
  <style>
    :root {
      color-scheme: dark;
      --bg1: #081120;
      --bg2: #13284a;
      --panel: rgba(14, 28, 52, 0.88);
      --border: rgba(255,255,255,0.08);
      --text: #eef4ff;
      --muted: #a8b8d8;
      --green: #15c977;
      --red: #ff5d73;
      --yellow: #f6b94a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background: linear-gradient(135deg, var(--bg1), var(--bg2));
      min-height: 100vh;
    }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 28px 20px 36px; }
    .hero {
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
      margin-bottom: 18px;
      backdrop-filter: blur(8px);
    }
    h1 { margin: 0 0 8px; font-size: 38px; }
    .sub { color: var(--muted); font-size: 16px; }
    .main-status {
      margin-top: 18px;
      padding: 18px 20px;
      border-radius: 20px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
    }
    .main-status-label { color: var(--muted); font-size: 13px; margin-bottom: 8px; }
    .main-status-value { font-size: 34px; font-weight: 800; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    }
    .card-title { color: var(--muted); font-size: 13px; margin-bottom: 14px; letter-spacing: .03em; }
    .big { font-size: 28px; font-weight: 800; line-height: 1.15; margin-bottom: 8px; }
    .muted { color: var(--muted); }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.07); }
    .row:first-of-type { border-top: 0; padding-top: 0; }
    .row .k { color: var(--muted); }
    .row .v { text-align: right; font-weight: 600; word-break: break-word; }
    .chip { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 8px 12px; font-weight: 700; font-size: 14px; }
    .chip-green { background: rgba(21,201,119,0.16); color: #89f0be; }
    .chip-red { background: rgba(255,93,115,0.14); color: #ff96a5; }
    .chip-yellow { background: rgba(246,185,74,0.18); color: #ffd98a; }
    .wide { margin-top: 16px; display: grid; grid-template-columns: 1.1fr .9fr; gap: 16px; }
    .log-item { padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.07); }
    .log-item:first-child { border-top: 0; padding-top: 0; }
    .log-time { color: var(--muted); font-size: 12px; margin-bottom: 4px; }
    .log-type { font-size: 12px; color: #8eb7ff; font-weight: 700; margin-bottom: 4px; }
    .log-message { font-size: 14px; }
    a { color: #9fc3ff; }
    @media (max-width: 900px) {
      .grid, .wide { grid-template-columns: 1fr; }
      h1 { font-size: 30px; }
      .main-status-value { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="sub">Bot failover dashboard</div>
      <h1>สถานะบอทแบบอ่านง่าย</h1>
      <div class="sub">สรุป 3 เรื่องหลัก: host นี้คือใคร, ตอนนี้เข้า Discord ได้ไหม, และคุยกับอีกตัวได้ไหมพร้อมบอกว่าตัวไหนกำลังทำงานจริง</div>
      <div class="main-status">
        <div class="main-status-label">ตัวที่กำลังทำงานจริง</div>
        <div class="main-status-value">${escapeHtml(activeHostText)}</div>
        <div class="sub">${escapeHtml(activeHostText === "ยังไม่มีตัวไหนทำงานอยู่" ? "ตอนนี้ยังไม่มีตัวไหนพร้อมทำงานจริง" : `ตอนนี้ ${activeHostText} เป็นตัวที่รับงานอยู่`)}</div>
      </div>
    </section>

    <div class="grid">
      ${card(
        "1. HOST ของหน้านี้",
        `<div class="big">${escapeHtml(data.name)}</div>
         <div class="muted">role: ${escapeHtml(data.role)} • activity: ${escapeHtml(data.active ? "active" : "standby")}</div>
         <div class="row"><div class="k">Host</div><div class="v">${escapeHtml(data.host)}</div></div>
         <div class="row"><div class="k">Desired</div><div class="v">${escapeHtml(data.desiredRole)}</div></div>`
      )}

      ${card(
        "2. ตอนนี้เข้าถึง DISCORD ได้ไหม",
        `<div class="big">${escapeHtml(data.discordReady ? "ได้" : (data.loginState === "logging_in" ? "กำลังลองเข้า" : "ไม่ได้"))}</div>
         <div>${formatDiscordChip(data.loginState, data.discordReady)}</div>
         <div class="row"><div class="k">loginState</div><div class="v">${escapeHtml(data.loginState)}</div></div>
         <div class="row"><div class="k">ready</div><div class="v">${escapeHtml(String(data.discordReady))}</div></div>
         <div class="row"><div class="k">user</div><div class="v">${escapeHtml(data.discordUser || "-")}</div></div>`
      )}

      ${card(
        "3. ติดต่ออีกตัวได้ไหม",
        `<div class="big">${escapeHtml(data.peer?.name || "-")}</div>
         <div>${formatStatusChip(!!data.peer?.reachable, "ติดต่ออีกตัวได้", "ติดต่ออีกตัวไม่ได้")}</div>
         <div class="row"><div class="k">Peer URL</div><div class="v">${escapeHtml(data.peer?.statusUrl || "-")}</div></div>
         <div class="row"><div class="k">อีกตัวกำลังทำงานไหม</div><div class="v">${escapeHtml(String(!!data.peer?.active))}</div></div>
         <div class="row"><div class="k">ตรวจล่าสุด</div><div class="v">${escapeHtml(data.peer?.checkedAt || "-")}</div></div>`
      )}
    </div>

    <div class="wide">
      ${card(
        "กติกาการสลับงาน",
        `<div class="muted" style="margin-bottom:12px; line-height:1.7;">
           ถ้า <b>bot4seamuww</b> เข้า Discord ได้และพร้อมใช้งาน ก็ให้ตัวนี้ทำงานต่อไป<br>
           ถ้า <b>bot4seamuww</b> ไม่พร้อมหรือเข้า Discord ไม่ได้ ให้ <b>bot4seamuwwx</b> รับงานแทน
         </div>
         <div class="row"><div class="k">primary check</div><div class="v">${escapeHtml(data.peer?.statusUrl || "-")}</div></div>
         <div class="row"><div class="k">primary reachable</div><div class="v">${escapeHtml(String(!!data.peer?.reachable))}</div></div>
         <div class="row"><div class="k">primary discordReady</div><div class="v">${escapeHtml(String(!!data.peer?.discordReady))}</div></div>`
      )}

      ${card(
        "คำสั่งล่าสุด",
        `<div class="big">${escapeHtml(data.lastCommand?.command || "ยังไม่มีคำสั่งล่าสุด")}</div>
         <div class="muted">เวลา: ${escapeHtml(data.lastCommand?.at || "-")}</div>
         <div class="row"><div class="k">lastError</div><div class="v">${escapeHtml(data.lastError || "-")}</div></div>
         <div class="row"><div class="k">lastLoginAttemptAt</div><div class="v">${escapeHtml(data.lastLoginAttemptAt || "-")}</div></div>
         <div class="row"><div class="k">lastLoginSuccessAt</div><div class="v">${escapeHtml(data.lastLoginSuccessAt || "-")}</div></div>`
      )}
    </div>

    <div style="margin-top:16px;" class="card">
      <div class="card-title">log ล่าสุด</div>
      ${logsHtml || '<div class="muted">ยังไม่มี log</div>'}
      <div style="margin-top:12px;" class="muted"><a href="/__bot/status">JSON status</a> • refresh auto ทุก 5 วินาที</div>
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  if (global.BOT_RUNTIME && Array.isArray(global.BOT_RUNTIME.logs)) {
    global.BOT_RUNTIME.logs.unshift({
      at: new Date().toISOString(),
      type: "SYSTEM",
      message: `Web server running on port ${PORT}`,
    });
  }
  console.log(`🌐 Web server running on port ${PORT}`);
});

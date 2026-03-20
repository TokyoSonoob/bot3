const express = require('express');
const app = express();
const port = process.env.PORT || 3542;

function esc(value) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function badge(ok, yesText, noText) {
  const good = !!ok;
  return `<span class="badge ${good ? 'ok' : 'bad'}">${good ? yesText : noText}</span>`;
}

function getState() {
  return global.BOT3_STATE || {
    name: 'unknown', host: '-', role: '-', desiredRole: '-', activeWorker: 'unknown',
    discordReady: false, loginState: 'unknown', peer: { reachable: null, activeWorker: 'unknown' }, logs: []
  };
}

app.get('/__bot/status', (req, res) => {
  const s = getState();
  res.json({
    name: s.name,
    host: s.host,
    role: s.role,
    desiredRole: s.desiredRole,
    activeWorker: s.activeWorker,
    statusText: s.statusText,
    loginState: s.loginState,
    discordReady: !!s.discordReady,
    discordReachable: !!s.discordReachable,
    userTag: s.userTag,
    peerName: s.peerName,
    peer: s.peer,
    lastCommand: s.lastCommand,
    lastCommandAt: s.lastCommandAt,
    lastError: s.lastError,
    lastLoginAttemptAt: s.lastLoginAttemptAt,
    lastLoginSuccessAt: s.lastLoginSuccessAt,
    lastReadyAt: s.lastReadyAt,
    lastDisconnectAt: s.lastDisconnectAt,
    uptimeSec: Math.floor((Date.now() - s.startedAt) / 1000),
    now: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  const s = getState();
  const currentWorker = s.activeWorker === 'none' ? 'ไม่มีตัวไหนทำงานอยู่' : s.activeWorker;
  const discordOk = s.discordReady === true;
  const peerOk = s.peer?.reachable === true;

  const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>bot3 failover dashboard</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,sans-serif;background:linear-gradient(180deg,#0b1730,#091126);color:#e8eefc}
  .wrap{max-width:1180px;margin:0 auto;padding:20px}
  .pill{display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);font-size:14px}
  h1{font-size:48px;margin:18px 0 8px} p.sub{margin:0 0 22px;color:#adc0e8}
  .hero,.grid .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
  .hero{padding:22px 24px;margin-bottom:18px}.hero .label{font-size:13px;color:#9bb0d7}.hero .value{font-size:42px;font-weight:800;margin-top:6px}
  .hero .desc{margin-top:8px;color:#bbcae8}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{padding:18px}
  .card h2{font-size:18px;margin:0 0 12px;color:#b3c4ea}.big{font-size:28px;font-weight:800;margin:8px 0 4px}.muted{color:#9fb3da}
  .row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid rgba(255,255,255,.08)}
  .row:first-of-type{border-top:0;padding-top:0}.k{color:#9fb3da}.v{font-weight:700;word-break:break-word;text-align:right}
  .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font-weight:700;margin-top:8px}
  .ok{background:rgba(26,183,89,.18);color:#69f0a2}.bad{background:rgba(255,94,94,.18);color:#ff9d9d}.warn{background:rgba(255,190,40,.18);color:#ffd56b}
  .bottom{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;margin-top:16px}.mono{font-family:ui-monospace,SFMono-Regular,monospace}
  .log{margin-top:14px;max-height:280px;overflow:auto;padding-right:4px}.logItem{padding:12px 14px;border-top:1px solid rgba(255,255,255,.08)}
  .logItem:first-child{border-top:0}.logType{font-size:12px;color:#9bb0d7}.logMsg{font-size:16px;font-weight:700;margin-top:4px}.json{margin-top:8px;padding:12px;border-radius:16px;background:rgba(0,0,0,.2);color:#cfe1ff;white-space:pre-wrap}
  a{color:#9cc3ff} @media (max-width:960px){.grid,.bottom{grid-template-columns:1fr} h1{font-size:36px}.hero .value{font-size:34px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="pill">bot3 failover dashboard</div>
  <h1>สถานะบอทแบบอ่านง่าย</h1>
  <p class="sub">หน้านี้ตอบ 3 เรื่องหลัก: ตอนนี้ host นี้คือใคร, เข้าถึง Discord ได้ไหม, และคุยกับอีกตัวได้ไหมรวมถึงใครกำลังทำงานจริง</p>

  <section class="hero">
    <div class="label">ตัวที่กำลังทำงานจริง</div>
    <div class="value">${esc(currentWorker)}</div>
    <div class="desc">${currentWorker === 'ไม่มีตัวไหนทำงานอยู่' ? 'ตอนนี้ยังไม่มีตัวไหนพร้อมทำงานจริง' : `ตัวที่ระบบตัดสินให้ทำงานตอนนี้คือ ${esc(currentWorker)}`}</div>
  </section>

  <section class="grid">
    <div class="card">
      <h2>1. HOST ของหน้านี้</h2>
      <div class="big">${esc(s.name)}</div>
      <div class="muted">role: ${esc(s.role)} • activity: ${esc(s.desiredRole)}</div>
      <div class="row"><div class="k">Host</div><div class="v">${esc(s.host)}</div></div>
      <div class="row"><div class="k">สถานะรวม</div><div class="v">${esc(s.statusText)}</div></div>
    </div>

    <div class="card">
      <h2>2. ตอนนี้เข้าถึง DISCORD ได้ไหม</h2>
      <div class="big">${discordOk ? 'ได้' : 'ยังไม่ได้'}</div>
      ${s.loginState === 'logging_in' ? '<div class="badge warn">🟠 กำลังพยายามเข้า Discord</div>' : badge(discordOk, '🟢 เข้าถึง Discord ได้', '🔴 เข้าถึง Discord ไม่ได้')}
      <div class="row"><div class="k">loginState</div><div class="v">${esc(s.loginState)}</div></div>
      <div class="row"><div class="k">ready</div><div class="v">${esc(String(!!s.discordReady))}</div></div>
      <div class="row"><div class="k">user</div><div class="v">${esc(s.userTag || '-')}</div></div>
      <div class="row"><div class="k">lastError</div><div class="v">${esc(s.lastError || '-')}</div></div>
    </div>

    <div class="card">
      <h2>3. ติดต่ออีกตัวได้ไหม</h2>
      <div class="big">${esc(s.peerName)}</div>
      ${badge(peerOk, '🟢 ติดต่ออีกตัวได้', '🔴 ติดต่ออีกตัวไม่ได้')}
      <div class="row"><div class="k">Peer URL</div><div class="v">${esc(s.peerStatusUrl)}</div></div>
      <div class="row"><div class="k">อีกตัวพร้อมไหม</div><div class="v">${esc(String(!!s.peer?.discordReady))}</div></div>
      <div class="row"><div class="k">อีกตัวที่บอกว่าทำงานอยู่</div><div class="v">${esc(s.peer?.activeWorker || 'unknown')}</div></div>
    </div>
  </section>

  <section class="bottom">
    <div class="card">
      <h2>กติกาการสลับงาน</h2>
      <div class="muted">ถ้า <b>bot3seamuww</b> เข้าถึง Discord ได้และพร้อมใช้งาน ก็ให้ตัวนี้ทำงานต่อไป<br/>ถ้า <b>bot3seamuww</b> ไม่พร้อมหรือเข้า Discord ไม่ได้ ให้ <b>bot3seamuwwx</b> รับงานแทน</div>
      <div class="row"><div class="k">primary check</div><div class="v">${esc(s.role === 'primary' ? 'self' : 'peer')}</div></div>
      <div class="row"><div class="k">primary reachable</div><div class="v">${esc(String(s.role === 'primary' ? true : !!s.peer?.reachable))}</div></div>
      <div class="row"><div class="k">primary discordReady</div><div class="v">${esc(String(s.role === 'primary' ? !!s.discordReady : !!s.peer?.discordReady))}</div></div>
      <div class="row"><div class="k">refresh auto</div><div class="v">ทุก 5 วินาที</div></div>
    </div>

    <div class="card">
      <h2>คำสั่งล่าสุด</h2>
      <div class="big">${s.lastCommand ? esc(s.lastCommand.content || '(ไม่มีข้อความ)') : 'ยังไม่มีคำสั่งล่าสุด'}</div>
      <div class="muted">เวลา: ${esc(s.lastCommandAt || '-')}</div>
    </div>
  </section>

  <section class="card" style="margin-top:16px">
    <div class="row"><div class="k"><a href="/__bot/status">JSON status</a></div><div class="v">uptime: ${esc(String(Math.floor((Date.now() - (s.startedAt || Date.now())) / 1000)))}s • now: ${esc(new Date().toISOString())}</div></div>
    <div class="log">
      ${(s.logs || []).slice(0, 20).map(item => `
        <div class="logItem">
          <div class="logType">${esc(item.at)} • ${esc(item.type)}</div>
          <div class="logMsg">${esc(item.message)}</div>
          ${item.extra ? `<div class="json mono">${esc(JSON.stringify(item.extra, null, 2))}</div>` : ''}
        </div>
      `).join('') || '<div class="logItem"><div class="logMsg">ยังไม่มี log</div></div>'}
    </div>
  </section>
</div>
<script>setTimeout(()=>location.reload(),5000)</script>
</body>
</html>`;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.send(html);
});

app.listen(port, () => {
  console.log(`[ SERVER ] Health check server listening on port ${port}`);
});

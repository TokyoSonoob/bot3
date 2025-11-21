"use strict";

const express = require("express");
const app = express();

const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");

app.get("/", (req, res) => {
  res.type("text/plain").send("bot3 OK");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    bot: "bot3",
    time: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "not_found" });
});

app.listen(PORT, () => {
  console.log(`[SERVER] bot3 health server listening on port ${PORT}`);
});

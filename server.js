// server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Selfbot is running and healthy.');
});

app.listen(port, () => {
  console.log(`[ SERVER ] Health check server listening on port ${port}`);
});
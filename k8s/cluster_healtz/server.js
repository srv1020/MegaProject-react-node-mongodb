const express = require('express');
const app = express();
const port = 8080;

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(port, () => {
  console.log(`Health check server running on port ${port}`);
});
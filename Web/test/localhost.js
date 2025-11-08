const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../src')));

app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});

require('dotenv').config();
const express = require('express');
const ngrok = require('@ngrok/ngrok');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static('.'));

app.listen(PORT, async () => {
    console.log(`로컬 서버: http://localhost:${PORT}`);

    try {
      const listener = await ngrok.forward({
        addr: PORT,
        authtoken: process.env.NGROK_AUTHTOKEN,
      });
      console.log(`🌐 외부 접속 URL: ${listener.url()}`);
    } catch (err) {
      console.error('ngrok 오류:', err.message);
    }
});

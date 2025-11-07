// server.js
const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

// 각 액션별 실행 함수
async function executeAction(page, action, url) {
  switch (action.type) {
    case 'fill':
      await page.fill(action.selector, action.value);
      break;
  }
}

// 웹 페이지 조작 API 엔드포인트
app.post('/api/automate', async (req, res) => {
  const { url, actions } = req.body;

  try {
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(url, actions)

    await page.goto(url, { waitUntil: 'networkidle' });

    for (const action of actions) {
      await executeAction(page, action, url);
    }

    const title = await page.title();

    await context.close();

    res.json({ success: true, title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('API 서버 실행 중'));

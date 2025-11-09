// server.js
const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
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
    case 'click':
      await page.click(action.selector);
      break;
  }
}

// 웹 페이지 조작 API 엔드포인트
app.post('/api/automate', async (req, res) => {
  const { url, actions } = req.body;

  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      permissions: ['local-network-access']
    });
    const page = await context.newPage();

    console.log(url, actions)

    await page.goto(url, { waitUntil: 'networkidle' });

    for (const action of actions) {
      // 'submitBtn' 클릭 액션인지 확인
      if (action.type === 'click' && action.selector === '#submitBtn') {
        await Promise.all([
          // 1. /submit-data 엔드포인트로부터 200 응답이 올 때까지 대기
          page.waitForResponse(
            resp => resp.url().includes('/submit-data') && resp.status() === 200,
            { timeout: 10000 } // 10초 타임아웃
          ),
          // 2. 실제 클릭 실행
          executeAction(page, action, url)
        ]);
        console.log('[/submit-data] 응답 수신 완료.');

      } else {
        // 'fill' 등 다른 액션은 그냥 실행
        await executeAction(page, action, url);
      }
    }

    const title = await page.title();

    await context.close();

    res.json({ success: true, title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/submit-data', (req, res) => {
  const data = req.body;

  console.log('클라이언트로부터 데이터 수신:', data);
  console.log(`이름: ${data.name}, 연령: ${data.age}`);

  res.status(200).json({
    status: 200
  });
});

app.post('/api/get-elements', async (req, res) => {
  try {
    const { url } = req.body;

    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);

    const elements = [];

    // body 내의 모든 자식 요소를 순회
    $('body').contents().each((i, node) => {
      const element = $(node);

      // p 태그
      if (node.name === 'p') {
        elements.push({
          tag: 'p',
          text: element.text(),
          html: element.html()
        });
      }

      // form label
      if (node.name === 'form') {
        // form 내의 label들을 순회
        element.find('label').each((index, labelEl) => {
          const label = $(labelEl);
          const labelFor = label.attr('for');

          if (labelFor) {
            const input = element.find(`input#${labelFor}`);

            if (input.length > 0) {
              const inputId = input.attr('id');
              const inputType = input.attr('type');

              elements.push({
                labelFor: labelFor,
                inputId: inputId,
                inputType: inputType || 'text'
              });
            }
          }
        });
      }

      // button 태그 (form 내 버튼 제외)
      if (node.name === 'button') {
        const isInForm = element.parents('form').length === 0;

        if (isInForm) {
          elements.push({
            tag: 'button',
            text: element.text(),
            id: element.attr('id'),
            class: element.attr('class')
          });
        }
      }
    });

    res.json({ elements });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post('/api/call-webhook', async (req, res) => {
  try {
    const response = await fetch('https://naga361111.store/webhook-test/86ef1185-c21b-4935-a87b-e17e37c56b0a', {
      method: 'GET'
    });

    if (response.ok) {
      console.log('웹훅 호출 성공');
      res.status(200).json({
        status: response.status
      });
    } else {
      console.error('웹훅 호출 실패:', response.status);
      res.status(response.status).json({
        status: response.status
      });
    }
  } catch (error) {
    console.error('요청 실패:', error);
    res.status(500).json({
      error: error.message
    });
  }
});


app.listen(8888, () => console.log('API 서버 실행 중'));

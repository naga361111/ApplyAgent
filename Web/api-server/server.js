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

  // 기본 유효성 검사
  if (!url || !actions || !Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({
      error: 'Invalid request body. "url" and "actions" (array) are required.',
    });
  }

  let browser = null;
  try {
    // 1. 브라우저 실행 (Chromium 사용)
    browser = await chromium.launch({
      headless: true, // true로 설정하면 UI 없이 백그라운드에서 실행됩니다.
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 2. 타겟 URL로 이동
    await page.goto(url, { waitUntil: 'networkidle' });

    console.log(`Mapsd to ${url}. Executing ${actions.length} actions...`);

    // 3. actions 배열을 순차적으로 실행
    for (const action of actions) {
      if (!action.type || !action.selector) {
        console.warn('Skipping invalid action:', action);
        continue; // 필수 필드가 없으면 건너뜀
      }

      // 'type'에 따라 분기
      switch (action.type) {
        case 'fill':
          if (typeof action.value === 'undefined') {
            console.warn(`Skipping fill action: 'value' is missing for selector ${action.selector}`);
            continue;
          }
          console.log(`Filling ${action.selector} with value: ${action.value}`);
          // 'fill' 액션: 요소를 찾아 값 입력
          await page.fill(action.selector, action.value);
          break;

        case 'click':
          console.log(`Clicking ${action.selector}`);
          // 'click' 액션: 요소를 찾아 클릭
          await page.click(action.selector);
          break;

        default:
          // 지원하지 않는 액션 타입
          console.warn(`Unknown action type: ${action.type}. Skipping.`);
          break;
      }
    }

    // 4. 성공 응답 전송
    console.log('Automation completed successfully.');
    res.status(200).json({
      message: 'Automation completed successfully.',
    });

  } catch (error) {
    // 5. 에러 처리
    console.error('Automation failed:', error.message);
    res.status(500).json({
      error: `Automation failed: ${error.message}`,
    });

  } finally {
    // 6. 브라우저 종료 (성공/실패 여부와 관계없이 항상 실행)
    if (browser) {
      // await browser.close();
      console.log('Browser closed.');
    }
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

      // <p> tag
      if (node.name === 'p') {
        elements.push({
          tag: 'p',
          text: element.text()
        });
      }

      // <form> tag
      if (node.name === 'form') {
        element.find('label').each((index, labelEl) => {
          const label = $(labelEl);
          const labelFor = label.attr('for');

          if (labelFor) {
            const input = element.find(`input#${labelFor}`);

            if (input.length > 0) {
              const inputId = input.attr('id');
              const inputType = input.attr('type');

              elements.push({
                tag: 'input',
                inputId: inputId,
                inputType: inputType || 'text'
              });
            }
          }
        });
      }

      // <button> tag
      if (node.name === 'button') {
        const isInForm = element.parents('form').length === 0;

        if (isInForm) {
          elements.push({
            tag: 'button',
            text: element.text(),
            id: element.attr('id')
          });
        }
      }
    });

    res.status(200).json({ elements });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post('/api/call-webhook', async (req, res) => {
  try {
    const response = await fetch('https://naga361111.store/webhook-test/022066dc-5a7f-491b-a21d-fd6dd4061618', {
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

app.post('/api/find-modal-id', async (req, res) => {
  try {
    const { url } = req.body;

    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);

    const divIds = [];

    $('div').each((index, element) => {
      const id = $(element).attr('id');
      if (id) {
        divIds.push(id);
      }
    });

    console.log(divIds);

    res.status(200).json({ divIds });
  } catch (error) {
    res.json({ error: error.message });
  }
})

app.post('/api/find-modal-elements', async (req, res) => {
  try {
    const modalBtns = []

    const { url, modalId } = req.body;

    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);

    for (const id of modalId) {
      const modal = $('#' + id);
      const buttons = [];

      modal.find('button').each((index, element) => {
        const $btn = $(element);
        buttons.push({
          id: $btn.attr('id'),
          text: $btn.text().trim()
        });
      });

      const btns = {
        id: id,
        btns: buttons
      }

      modalBtns.push(btns);
    }

    console.log(elements)
    res.status(200).json({ elements });
  } catch (error) {
    res.json({ error: error.message });
  }
})


app.listen(8888, () => console.log('API 서버 실행 중'));

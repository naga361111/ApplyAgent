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

  // 여기서 수신한 data를 데이터베이스에 저장하는 등의 실제 작업을 수행할 수 있습니다.

  res.status(200).json({
    status: 'success',
    message: '데이터를 성공적으로 받았습니다.',
    receivedData: data
  });
});

app.post('/api/get-elements', async (req, res) => {
  try {
    // 페이지 URL을 request body에서 받기
    const { url } = req.body;

    // fetch로 HTML 가져오기
    const response = await fetch(url);
    const html = await response.text();

    // cheerio로 파싱
    const $ = cheerio.load(html);

    // 모든 태그 추출
    const elements = [];

    $('p').each((i, el) => {
      elements.push({
        tag: 'p',
        text: $(el).text(),
        html: $(el).html()
      });
    });

    $('form label').each((index, element) => {
      const label = $(element);

      // 1. label의 'for' 속성값을 가져옵니다.
      const labelFor = label.attr('for');

      // 'for' 속성이 있는 label만 처리합니다.
      if (labelFor) {

        // 2. 'for' 속성값과 일치하는 'id'를 가진 input 요소를 찾습니다.
        //    (form 내부에서만 찾는 것이 더 정확합니다)
        const input = $(`form input#${labelFor}`);

        // 일치하는 input을 찾았을 경우
        if (input.length > 0) {

          // 3. input의 'id'와 'type' 속성을 가져옵니다.
          const inputId = input.attr('id');   // (labelFor 값과 동일합니다)
          const inputType = input.attr('type');

          // 4. elements 리스트에 객체 형태로 추가합니다.
          elements.push({
            labelFor: labelFor,
            inputId: inputId,
            inputType: inputType || 'text' // type이 명시되지 않으면 'text'가 기본인 경우가 많음
          });
        }
      }
    });

    $('button').not('form button').each((i, el) => {
      elements.push({
        tag: 'button',
        text: $(el).text(),
        id: $(el).attr('id'),
        class: $(el).attr('class')
      });
    });

    res.json({ success: true, elements });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(8888, () => console.log('API 서버 실행 중'));

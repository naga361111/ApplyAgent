// server.js
const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const jsonServerURL = "https://my-json-server.typicode.com/naga361111/ApplyAgent/user"

const app = express();
app.use(cors());
app.use(express.json());

const jobStorage = {};
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
async function executeAction(page, action) {
  switch (action.type) {
    case 'fill':
      await page.fill(action.selector, action.value);
      break;
    case 'click':
      await page.click(action.selector);
      break;
  }
}

// 웹 페이지에서 요소 가져오는 함수
async function getElementFromHTML(url) {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // console.log(`페이지로 이동 중: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const selector = ':is(input, button):visible';;

    const elementsData = await page.locator(selector).evaluateAll(elements => {
      const data = [];

      elements.forEach(el => {
        const tagName = el.tagName.toLowerCase();

        if (tagName === 'input') {
          data.push({
            tag: tagName,
            id: el.id || null,
            type: el.type || text,
            disabled: el.disabled || false
          });
        } else if (tagName === 'button') {
          data.push({
            tag: tagName,
            id: el.id || null,
            disabled: el.disabled || false
          });
        }
      });
      return data;
    });

    // console.log(`--- ${url} 에서 찾은 요소 (${elementsData.length}개) ---`);
    // console.log(JSON.stringify(elementsData, null, 2));

    console.log(`>> ${url} 에서 요소 (${elementsData.length}개)를 성공적으로 가져왔습니다.`);
    return elementsData;

  } catch (error) {
    console.error('HTML 태그 추출 중 오류 발생:', error);
  } finally {
    if (browser) {
      await browser.close();
      // console.log('브라우저가 종료되었습니다.');
    }
  }
}

async function filteringValidData(elements) {
  const validElements = elements.filter(element => {

    if (element.tag === 'input') {
      return element.disabled === false;
    }

    if (element.tag === 'button') {
      return element.id !== 'runAgentBtn';
    }

    return true;
  });

  console.log("불필요한 요소 필터링이 완료되었습니다.");
  console.log(validElements);
  return validElements;
}

async function filteringInputFields(data) {
  const inputFields = data.filter(data => {

    if (data.tag === 'input') {
      return true
    }
  });

  console.log("input field 필터링이 완료되었습니다.");
  return inputFields;
}

async function getUserInfoFromServer() {
  try {
    const response = await fetch(jsonServerURL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("유저 데이터를 성공적으로 가져왔습니다.");
    return data;

  } catch (error) {
    console.error('데이터를 가져오는 중 오류 발생:', error);
    return error.message;
  }
}

async function promptGenerator(requiredData, userData) {
  const prompt = `
  Role: You are a data mapping specialist.
  Primary Goal: Your primary goal is to intelligently map values from a User Data object to a list of Required Data input fields.
  Context: The RequiredData object defines a set of input fields that need values. Each field is defined by its id and type.
  The UserData object provides various pieces of information about a single user (e.g., name, age, id).
  Your Task: Analyze each input field defined in Required Data. For each field, you must search the User Data to find the most appropriate and semantically corresponding value.
  This is a smart-mapping task. For example, if Required Data requests a field with the id "userName", you must find the best possible match in User Data, which might be a key like "name", "full_name", or "username".
  Strive to populate all input fields in Required Data with the correct values from User Data.
  When return, you should like that: { "id": "inputId", "value": "inputValue" }
  RequiredData: ${JSON.stringify(requiredData)}
  UserData: ${JSON.stringify(userData)}
  ExpectedStructure: [{data...}, {data...}, ...] -> one dimention array
`;

  console.log("프롬프트 생성이 완료되었습니다.");
  return prompt;
}

async function runJsonAgent(prompt) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // console.log(`[USER] JSON 요청:\n${prompt}`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonObj = JSON.parse(text);

    // console.log("\n[AI] JSON 응답 객체:");
    // console.log(jsonObj);

    console.log("JSON 에이전트 실행이 완료되었습니다.");
    return jsonObj;
  } catch (error) {
    console.error("AI 에이전트 실행 중 오류 발생:", error.message);
    return error.message;
  }
}

async function processChainBuild(processData, userData) {
  const userDataMap = userData.reduce((acc, item) => {
    acc[item.id] = item.value;
    return acc;
  }, {});

  const executionSteps = processData.reduce((acc, element) => {
    if (element.tag === 'input') {
      acc.push({
        type: 'fill',
        selector: "#" + element.id,
        value: userDataMap[element.id].toString()
      });
    } else if (element.tag === 'button') {
      acc.push({
        type: 'click',
        selector: "#" + element.id
      });
    }
    return acc;
  }, []);

  console.log("체인 생성이 완료되었습니다.");
  console.log(executionSteps);
  return executionSteps;
}

async function automate(url, processChainData) {
  let browser;

  try {
    console.log('>>> 자동 신청 시작...');

    browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    for (const step of processChainData) {
      if (!step.type || !step.selector) {
        console.warn('Skipping invalid action:', step);
        continue;
      }

      // 'type'에 따라 분기
      switch (step.type) {
        case 'fill':
          if (typeof step.value === 'undefined') {
            console.warn(`Skipping fill action: 'value' is missing for selector ${step.selector}`);
            continue;
          }
          await page.fill(step.selector, step.value);
          console.log(`Filling ${step.selector} with value: ${step.value}`);
          break;

        case 'click':
          await page.click(step.selector);
          console.log(`Clicking ${step.selector}`);
          break;

        default:
          console.warn(`Unknown action type: ${step.type}. Skipping.`);
          break;
      }
    }

    console.log('>>> 자동 신청 완료...');
  } catch (error) {
    console.error('자동 신청 중 오류 발생:', error);
    return error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
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

// 제출 버튼 함수
app.post('/submit-data', (req, res) => {
  const data = req.body;

  console.log('클라이언트로부터 데이터 수신:', data);
  console.log(`이름: ${data.name}, 연령: ${data.age}`);

  res.status(200).json({
    status: 200
  });
});

app.post('/api/run-agent', async (req, res) => {
  const jobId = 'job_' + Date.now();

  jobStorage[jobId] = { status: 'pending', result: null };

  res.status(200).json({
    status: 200,
    jobId: jobId
  })

  const element = await getElementFromHTML(req.body.url);
  const vaildData = await filteringValidData(element);

  const inputFields = await filteringInputFields(vaildData);

  const userDataFromServer = await getUserInfoFromServer();

  const jsonPrompt = await promptGenerator(inputFields, userDataFromServer);

  const agentResult = await runJsonAgent(jsonPrompt);

  const processChain = await processChainBuild(vaildData, agentResult);

  automate(req.body.url, processChain);
});

app.post('/api/job-status', (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required in the body' });
  }
  const job = jobStorage[jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.status(200).json(job);
});

app.post('/api/mark-job-complete', (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required in the body' });
  }
  const job = jobStorage[jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (job.status === 'complete') {
    return res.status(200).json({ message: 'Job already marked as complete.' });
  }

  job.status = 'complete';

  console.log(`Job ${jobId} was marked complete by an external POST!`);
  res.status(200).json({ message: 'Job marked as complete.' });
});

app.listen(8888, () => console.log('API 서버 실행 중'));

// server.ts
import express, { Request, Response } from 'express';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// --- 타입 정의 ---

// 스크래핑된 HTML 요소
type InputElement = {
  tag: 'input';
  id: string | null;
  type: string | 'text';
  disabled: boolean;
};

type ButtonElement = {
  tag: 'button';
  id: string | null;
  disabled: boolean;
};

type WebElement = InputElement | ButtonElement;

// 자동화 작업 단계
type ActionStep = {
  type: 'fill';
  selector: string;
  value: string;
} | {
  type: 'click';
  selector: string;
  purpose: string;
};

// JSON 서버에서 가져온 원본 사용자 정보
type RawUserInfo = Record<string, any>;

// AI가 사용자 정보를 매핑한 결과
type UserInputMapping = {
  result: {
    id: string;
    value: string | number;
  }[];
};

// 작업 상태 관리
type Job = {
  status: 'pending' | 'complete' | 'error';
  result: any | null;
};

// API 요청 본문 타입
interface RunAgentRequestBody {
  url: string;
}

interface JobStatusRequestBody {
  jobId: string;
}

// AI가 생성할 버튼 분류 데이터의 정확한 타입
type AgentButtonClassification = {
  id: string;
  purpose: "submit" | "additional_action";
};

// --- 전역 변수 및 설정 ---

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const OLLAMA_API_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "deepseek-r1:8b";

const jsonServerURL = "https://my-json-server.typicode.com/naga361111/ApplyAgent/user";

const app = express();
app.use(cors());
app.use(express.json());

let browser: Browser | undefined;

const jobStorage: Record<string, Job> = {};

// --- 함수 정의 ---

// 웹 페이지에서 요소 가져오는 함수 - 확인
async function getElementFromHTML(url: string, page: Page): Promise<WebElement[]> {
  try {
    console.log(`>> ${url} 에서 요소 가져오기 시작 <<`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const selector = ':is(input, button):visible';

    const elementsData = await page.locator(selector).evaluateAll((elements): WebElement[] => {
      const data: WebElement[] = [];

      elements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        const element = el as HTMLInputElement | HTMLButtonElement; // 타입 캐스팅

        if (tagName === 'input') {
          data.push({
            tag: tagName,
            id: element.id || null,
            type: (element as HTMLInputElement).type || 'text',
            disabled: element.disabled
          });
        } else if (tagName === 'button') {
          data.push({
            tag: tagName,
            id: element.id || null,
            disabled: element.disabled
          });
        }
      });
      return data;
    });

    console.log(`===== ${url} 에서 요소 (${elementsData.length}개) 가져오기 완료 =====`);
    return elementsData;

  } catch (error: unknown) {
    let errorMessage;

    if (error instanceof Error) {
      errorMessage = error.message;
    }
    else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('HTML 태그 추출 중 오류 발생:', error);
    throw new Error(`HTML 태그 추출 중 오류 발생: ${errorMessage}`);
  }
}

// 모달창에서 요소 가져오는 함수
async function getElementsFromModal(page: Page, modalSelector: string): Promise<WebElement[]> {
  try {
    await page.waitForSelector(modalSelector, { state: 'visible' });
    console.log(`>> 모달(${modalSelector})이 감지되었습니다. 요소 검색을 시작합니다.`);

    const modal = page.locator(modalSelector);
    const selector = ':is(input, button):visible';

    const elementsData = await modal.locator(selector).evaluateAll((elements): WebElement[] => {
      const data: WebElement[] = [];

      elements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        const element = el as HTMLInputElement | HTMLButtonElement; // 타입 캐스팅

        if (tagName === 'input') {
          data.push({
            tag: tagName,
            id: element.id || null,
            type: (element as HTMLInputElement).type || 'text',
            disabled: element.disabled || false
          });
        } else if (tagName === 'button') {
          data.push({
            tag: tagName,
            id: element.id || null,
            disabled: element.disabled || false
          });
        }
      });
      return data;
    });

    console.log(`>> 모달(${modalSelector})에서 요소 (${elementsData.length}개)를 성공적으로 가져왔습니다.`);
    return elementsData;

  } catch (error) {
    console.error(`모달(${modalSelector}) 내부 요소 추출 중 오류 발생:`, error);
    return [];
  }
}

// 불필요한 태그 제거 - 확인
async function filteringValidData(elements: WebElement[]): Promise<WebElement[]> {
  console.log(">> 불필요한 요소 필터링 시작... <<");

  const validElements = elements.filter(element => {
    if (element.tag === 'input') {
      return element.disabled === false;
    }
    if (element.tag === 'button') {
      return element.id !== 'runAgentBtn';
    }
    return true;
  });

  console.log(validElements);
  console.log("===== 불필요한 요소 필터링 완료... =====");

  return validElements;
}

// 필요한 태그만 걸러냄
async function filteringInputFields(data: WebElement[]): Promise<InputElement[]> {
  console.log("input field 필터링 시작...");
  const inputFields = data.filter(data => {
    if (data.tag === 'input') {
      return true;
    }
    return false;
  }) as InputElement[]; // InputElement 타입으로 캐스팅

  console.log(inputFields);
  console.log("input field 필터링이 완료...");
  return inputFields;
}

// 버튼 태그만 걸러냄 - 확인
async function filteringButtons(vaildData: WebElement[]): Promise<ButtonElement[]> {
  console.log(">> button 필터링 시작... <<");

  const buttons = vaildData.filter(vaildData => {
    if (vaildData.tag === 'button') {
      return true;
    }
    return false;
  }) as ButtonElement[];

  console.log(buttons);
  console.log("===== button 필터링 완료... =====");
  return buttons;
}

// 서버에서 유저 데이터 가져옴 - 확인
async function getUserInfoFromServer(): Promise<RawUserInfo> {
  try {
    console.log(">> 유저 데이터를 가져오는 중... <<");
    const response = await fetch(jsonServerURL);

    if (!response.ok) {
      console.error(`HTTP error! status: ${response}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data[0]);
    console.log("===== 유저 데이터 가져오기 완료 =====");
    return data[0] as RawUserInfo;

  } catch (error: unknown) {
    let errorMessage;

    if (error instanceof Error) {
      errorMessage = error.message;
    }
    else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error('데이터를 가져오는 중 오류 발생:', error);
    throw new Error(`유저 데이터를 가져오는 중 오류 발생: ${errorMessage}`);
  }
}

// agent에게 전달하기 위한 prompt 생성
async function inputPromptGenerator(requiredData: InputElement[], userData: RawUserInfo): Promise<string> {
  const prompt = `
  You will receive two JSON objects. The first object contains metadata for a set of input fields. The second object contains user information. Your goal is to map the user information to the correct input fields and populate them.
  metadata for input field: ${JSON.stringify(requiredData)}
  user information: ${JSON.stringify(userData)}
  only return one array -> result array (array title must be result: result [...])
  `;

  console.log("프롬프트 생성이 완료되었습니다.");
  return prompt;
}

// 버튼 판별 (제출 vs 추가과정) prompt 생성 - 확인
async function buttonPromptGenerator(buttonElement: ButtonElement[]): Promise<string> {
  const prompt = `
  You are a JSON processor. Your task is to modify an userInputData that consists of anrray of button objects. You MUST return the full, modified array based on userInputData.
  For EACH object in the userInputData array, you MUST follow these two steps:
  Keep ALL original key-value pairs (like 'tag', 'id', 'disabled').
  Add ONE new key named "purpose".
  The value for "purpose" is determined by the "id" string:
  Use "submit" if the "id" contains any of these keywords (case-insensitive): submit, save, apply, complete, send, finish, next, confirm, ok, run
  Otherwise, use "additional_action".
  You are a JSON processor. Your task is to modify an array of button objects. You MUST return the full, modified array.
  Critical Rule: There MUST be exactly ONE "submit" purpose in the entire array. All other objects must be "additional_action".
  And You must return same struct of userInputData ARRAY. That array consists of objects that contain legacy key:value and new info: purpose.
  **YOU MUST FOLLOW THE JSON(ARRARY OF OBJECTS) STRUCTURE IN userInputData**
  And you should return ONLY JSON(ARRAY OF OBJECTS).
  userInputData: ${JSON.stringify(buttonElement)}
  `;

  // console.log(prompt);
  console.log("===== 프롬프트 생성이 완료되었습니다. =====");
  return prompt;
}

// prompt를 받아서 agent 실행
async function runJsonAgent(prompt: string): Promise<any> {
  try {
    console.log("Json 에이전트 실행 시작...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonObj = JSON.parse(text);

    console.log(jsonObj);
    console.log("JSON 에이전트 실행이 완료...");
    return jsonObj;
  } catch (error: any) {
    console.error("AI 에이전트 실행 중 오류 발생:", error.message);
    return error.message;
  }
}

// input 채우기 데이터 빌드
async function inputChainBuild(processData: WebElement[], userData: UserInputMapping): Promise<ActionStep[]> {
  console.log("Input 체인 생성 시작...");

  const userDataMap = userData.result.reduce((acc, item) => {
    acc[item.id] = item.value;
    return acc;
  }, {} as Record<string, string | number>);

  const inputSteps = processData.reduce((acc, element) => {
    if (element.tag === 'input' && element.id && userDataMap[element.id] !== undefined) {
      acc.push({
        type: 'fill',
        selector: "#" + element.id,
        value: userDataMap[element.id].toString()
      });
    }
    return acc;
  }, [] as ActionStep[]);

  console.log(inputSteps);
  console.log("Input 체인 생성이 완료...");
  return inputSteps;
}

// button 클릭 데이터 빌드 - 완료
async function buttonClickBuild(toBuildData: unknown): Promise<ActionStep[]> {
  console.log(">> Button 클릭 데이터 생성 시작... <<");

  let btnDataToProcess: AgentButtonClassification[] = [];

  // --- 헬퍼 로직 ---
  if (Array.isArray(toBuildData)) {
    btnDataToProcess = toBuildData as AgentButtonClassification[];

  } else if (typeof toBuildData === 'object' && toBuildData !== null) {
    const firstArrayValue = Object.values(toBuildData).find(Array.isArray);

    if (firstArrayValue) {
      btnDataToProcess = firstArrayValue as AgentButtonClassification[];
    } else if ('id' in toBuildData && 'purpose' in toBuildData) {
      // 단일 객체를 배열로 감싸줍니다.
      btnDataToProcess = [toBuildData as AgentButtonClassification];
    } else {
      console.warn("AI 응답 객체에서 처리할 배열 데이터를 찾지 못했습니다.");
      throw new Error("AI 응답 객체에서 처리할 배열 데이터를 찾지 못했습니다.");
    }

  } else {
    // 4. 입력이 배열도, 객체도 아닌 경우 (string, null 등)
    console.warn(`AI 응답이 예상치 못한 형식입니다: ${typeof toBuildData}`);
    throw new Error(`AI 응답이 예상치 못한 형식입니다: ${typeof toBuildData}`);
  }
  // --- 헬퍼 로직 종료 ---

  const buttonSteps = btnDataToProcess.reduce((acc, element) => {
    if (element.id && element.purpose === 'additional_action') {
      acc.push({
        type: 'click',
        selector: "#" + element.id,
        purpose: element.purpose
      });
    }
    return acc;
  }, [] as ActionStep[]);

  console.log(buttonSteps);
  console.log("===== Button 클릭 데이터 생성 완료... =====");
  return buttonSteps;
}

app.post('/submit-data', (req: Request, res: Response) => {
  const data = req.body;
  console.log('클라이언트로부터 데이터 수신:', data);
  res.status(200).json({
    status: 200
  });
});

app.post('/api/run-agent', async (req: Request<{}, {}, RunAgentRequestBody>, res: Response) => {
  const jobId = 'job_' + Date.now();
  jobStorage[jobId] = { status: 'pending', result: null };

  res.status(200).json({
    status: 200,
    jobId: jobId
  });

  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    const userDataFromServer = await getUserInfoFromServer();

    await page.goto(req.body.url, { waitUntil: 'domcontentloaded' });

    const elements = await getElementFromHTML(req.body.url, page);
    const vaildData = await filteringValidData(elements);

    // input 처리
    const inputFields = await filteringInputFields(vaildData);
    const inputJsonPrompt = await inputPromptGenerator(inputFields, userDataFromServer);
    const inputAgentResult = await runJsonAgent(inputJsonPrompt);
    const inputChain = await inputChainBuild(inputFields, inputAgentResult);
    for (const step of inputChain) {
      if (!step.type || !step.selector) {
        console.warn('Skipping invalid action:', step);
        continue;
      }

      if (step.type === 'fill') {
        console.log(`Filling ${step.selector} with value: ${step.value}`);
        await page.fill(step.selector, step.value);
      }
    }

    // additional_action 버튼 수행
    const buttons = await filteringButtons(vaildData);
    const jsonPrompt = await buttonPromptGenerator(buttons);
    const agentResult = await runJsonAgent(jsonPrompt);
    const buttonChain = await buttonClickBuild(agentResult);
    for (const step of buttonChain) {
      if (!step.type || !step.selector) {
        console.warn('Skipping invalid action:', step);
        continue;
      }

      // 모달 작업 수행
      if (step.type === 'click' && step.purpose === 'additional_action') {
        await page.click(step.selector);
        console.log(`Clicking ${step.selector}`);

        const modalElements = await getElementsFromModal(page, "#paperApplyModal");
        const modalVaildData = await filteringValidData(modalElements);

        // input 입력
        const modalInputFields = await filteringInputFields(modalVaildData);
        const jsonPrompt = await inputPromptGenerator(modalInputFields, userDataFromServer);
        const agentResult = await runJsonAgent(jsonPrompt);
        const inputChain = await inputChainBuild(modalInputFields, agentResult);

        for (const step of inputChain) {
          if (!step.type || !step.selector) {
            console.warn('Skipping invalid action:', step);
            continue;
          }

          if (step.type === 'fill') {
            console.log(`Filling ${step.selector} with value: ${step.value}`);
            await page.fill(step.selector, step.value);
          }
        }

        const modalButton = await filteringButtons(modalVaildData);
        const modalButtonPrompt = await buttonPromptGenerator(modalButton);
        const modalAgentResult = await runJsonAgent(modalButtonPrompt);
        const modalButtonChain = await buttonClickBuild(modalAgentResult);

        for (const step of modalButtonChain) {
          if (!step.type || !step.selector) {
            console.warn('Skipping invalid action:', step);
            continue;
          }

          if (step.type === 'click' && step.purpose === 'additional_action') {
            await page.click(step.selector);
            console.log(`Clicking ${step.selector}`);
          }
        }
      }

      // 제출 작업 수행
      if (step.type === 'click' && step.purpose === 'submit') {
        await page.click(step.selector);
        console.log(`Clicking ${step.selector}`);
      }
    }
  } catch (error: any) {
    console.error('자동 신청중 에러 발생:', error.message);
    jobStorage[jobId] = { status: 'error', result: error.message };
  } finally {
    if (jobStorage[jobId] && jobStorage[jobId].status === 'pending') {
      console.log(`[Job ${jobId}] 자동 신청 완료.`);
      jobStorage[jobId] = {
        status: 'complete',
        result: '자동 신청이 성공적으로 완료되었습니다.'
      };
    }

    if (browser) {
      // await browser.close();
    }
  }
});

app.post('/api/job-status', (req: Request<{}, {}, JobStatusRequestBody>, res: Response) => {
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

app.post('/api/mark-job-complete', (req: Request<{}, {}, JobStatusRequestBody>, res: Response) => {
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

app.listen(8888, () => console.log('API 서버 실행 중 (포트 8888)'));
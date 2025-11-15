"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const express_1 = __importDefault(require("express"));
const playwright_1 = require("playwright");
const cors_1 = __importDefault(require("cors"));
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// --- 전역 변수 및 설정 ---
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const OLLAMA_API_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3.1:8b-instruct-q8_0";
const jsonServerURL = "https://my-json-server.typicode.com/naga361111/ApplyAgent/user";
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let browser;
const jobStorage = {};
// --- 함수 정의 ---
// 각 액션별 실행 함수
function executeAction(page, action) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (action.type) {
            case 'fill':
                yield page.fill(action.selector, action.value);
                break;
            case 'click':
                yield page.click(action.selector);
                break;
        }
    });
}
// 웹 페이지에서 요소 가져오는 함수 - 확인
function getElementFromHTML(url, page) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`>> ${url} 에서 요소 가져오기 시작 <<`);
            yield page.goto(url, { waitUntil: 'domcontentloaded' });
            const selector = ':is(input, button):visible';
            const elementsData = yield page.locator(selector).evaluateAll((elements) => {
                const data = [];
                elements.forEach(el => {
                    const tagName = el.tagName.toLowerCase();
                    const element = el; // 타입 캐스팅
                    if (tagName === 'input') {
                        data.push({
                            tag: tagName,
                            id: element.id || null,
                            type: element.type || 'text',
                            disabled: element.disabled
                        });
                    }
                    else if (tagName === 'button') {
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
        }
        catch (error) {
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
    });
}
// 모달창에서 요소 가져오는 함수
function getElementsFromModal(page, modalSelector) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield page.waitForSelector(modalSelector, { state: 'visible' });
            console.log(`>> 모달(${modalSelector})이 감지되었습니다. 요소 검색을 시작합니다.`);
            const modal = page.locator(modalSelector);
            const selector = ':is(input, button):visible';
            const elementsData = yield modal.locator(selector).evaluateAll((elements) => {
                const data = [];
                elements.forEach(el => {
                    const tagName = el.tagName.toLowerCase();
                    const element = el; // 타입 캐스팅
                    if (tagName === 'input') {
                        data.push({
                            tag: tagName,
                            id: element.id || null,
                            type: element.type || 'text',
                            disabled: element.disabled || false
                        });
                    }
                    else if (tagName === 'button') {
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
        }
        catch (error) {
            console.error(`모달(${modalSelector}) 내부 요소 추출 중 오류 발생:`, error);
            return [];
        }
    });
}
// 불필요한 태그 제거 - 확인
function filteringValidData(elements) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
// 필요한 태그만 걸러냄
function filteringInputFields(data) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("input field 필터링 시작...");
        const inputFields = data.filter(data => {
            if (data.tag === 'input') {
                return true;
            }
            return false;
        }); // InputElement 타입으로 캐스팅
        console.log(inputFields);
        console.log("input field 필터링이 완료...");
        return inputFields;
    });
}
// 버튼 태그만 걸러냄 - 확인
function filteringButtons(vaildData) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(">> button 필터링 시작... <<");
        const buttons = vaildData.filter(vaildData => {
            if (vaildData.tag === 'button') {
                return true;
            }
            return false;
        });
        console.log(buttons);
        console.log("===== button 필터링 완료... =====");
        return buttons;
    });
}
// 서버에서 유저 데이터 가져옴 - 확인
function getUserInfoFromServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(">> 유저 데이터를 가져오는 중... <<");
            const response = yield fetch(jsonServerURL);
            if (!response.ok) {
                console.error(`HTTP error! status: ${response}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = yield response.json();
            console.log(data[0]);
            console.log("===== 유저 데이터 가져오기 완료 =====");
            return data[0];
        }
        catch (error) {
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
    });
}
// agent에게 전달하기 위한 prompt 생성
function inputPromptGenerator(requiredData, userData) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `
  You will receive two JSON objects. The first object contains metadata for a set of input fields. The second object contains user information. Your goal is to map the user information to the correct input fields and populate them.
  metadata for input field: ${JSON.stringify(requiredData)}
  user information: ${JSON.stringify(userData)}
  only return one array -> result array (array title must be result: result [...])
  `;
        console.log("프롬프트 생성이 완료되었습니다.");
        return prompt;
    });
}
// 버튼 판별 (제출 vs 추가과정) prompt 생성 - 확인
function buttonPromptGenerator(buttonElement) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `
  [SYSTEM]
  You are a silent JSON processing tool. You will receive an array of button objects.
  Your task is to process this array and return a new array. Each object in the new array must contain **only two keys**: 'id' (from the original object) and 'purpose' (which you will generate).
  You MUST return ONLY the transformed JSON array. Do not provide any explanation, preamble, or markdown formatting. **Even if the 'InputData' contains only one button object, your response must still be an array. like [ {key: value} ]**
  ---
  Rules for 'purpose' key:
  1.  The 'purpose' is "submit" if the original 'id' string contains any of the following keywords:
      submit, save, apply, complete, run, send
  2.  For all other 'id' values, the 'purpose' is "additional_action".
  ---
  Strict Output Format:
  [{ "id": "...", "purpose": "..." }, { "id": "...", "purpose": "..." }] 
  [USER]
  InputData: ${JSON.stringify(buttonElement)}
  `;
        console.log("===== 프롬프트 생성이 완료되었습니다. =====");
        return prompt;
    });
}
function modalButtonPromptGenerator(buttons) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `
  Your input will be an array of objects, where each object represents a button element and includes an id.
  Your goal is to process this array and determine the function of each button, primarily by inferring from its id. You must add a new key named propose to every object in the array based on this logic:
  If the button's inferred function is finalizing or completing the task (e.g., 'submit', 'finish', 'done', 'complete'), set its propose value to 'complete'.
  If the button's function is anything else (e.g., 'close', 'cancel', 'back', 'details'), set its propose value to 'others'.
  The output must be an array of the same objects, each now including the new propose property.
  `;
        console.log("프롬프트 생성이 완료되었습니다.");
        return prompt;
    });
}
// prompt를 받아서 agent 실행
function runJsonAgent(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Json 에이전트 실행 시작...");
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                },
            });
            const result = yield model.generateContent(prompt);
            const response = yield result.response;
            const text = response.text();
            const jsonObj = JSON.parse(text);
            console.log(jsonObj);
            console.log("JSON 에이전트 실행이 완료...");
            return jsonObj;
        }
        catch (error) {
            console.error("AI 에이전트 실행 중 오류 발생:", error.message);
            return error.message;
        }
    });
}
// prompt를 받아서 ollama agent 실행 - 확인
function ollamaRunJsonAgent(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        let ollamaRawResponse = '';
        try {
            console.log(">> Ollama JSON 에이전트 실행 시작... <<");
            const response = yield fetch(OLLAMA_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: prompt,
                    format: "json",
                    stream: false
                }),
            });
            if (!response.ok) {
                const errorBody = yield response.text();
                console.error("Ollama API Error Body:", errorBody);
                throw new Error(`Ollama API error! status: ${response.status}`);
            }
            const data = yield response.json();
            ollamaRawResponse = data.response;
            const jsonObj = JSON.parse(ollamaRawResponse);
            console.log(jsonObj);
            console.log("===== Ollama JSON 에이전트 실행이 완료... =====");
            return jsonObj;
        }
        catch (error) {
            let errorMessage;
            if (error instanceof SyntaxError) {
                console.error("Ollama가 유효한 JSON을 반환하지 않았습니다. (JSON.parse 실패)");
                throw new Error(`Ollama 원본 응답: ${ollamaRawResponse}`);
            }
            else if (error instanceof Error) {
                errorMessage = error.message;
                console.error("Ollama 에이전트 실행 중 오류 발생:", error);
            }
            else {
                errorMessage = String(error);
                console.error("Ollama 에이전트 실행 중 오류 발생:", error);
            }
            throw new Error(`Ollama 에이전트 실행 중 오류 발생: ${errorMessage}`);
        }
    });
}
// input 채우기 데이터 빌드
function inputChainBuild(processData, userData) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Input 체인 생성 시작...");
        const userDataMap = userData.result.reduce((acc, item) => {
            acc[item.id] = item.value;
            return acc;
        }, {});
        const inputSteps = processData.reduce((acc, element) => {
            if (element.tag === 'input' && element.id && userDataMap[element.id] !== undefined) {
                acc.push({
                    type: 'fill',
                    selector: "#" + element.id,
                    value: userDataMap[element.id].toString()
                });
            }
            return acc;
        }, []);
        console.log(inputSteps);
        console.log("Input 체인 생성이 완료...");
        return inputSteps;
    });
}
// button 클릭 데이터 빌드 - 완료
function buttonClickBuild(toBuildData) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(">> Button 클릭 데이터 생성 시작... <<");
        let btnDataToProcess = [];
        // --- 헬퍼 로직 ---
        if (Array.isArray(toBuildData)) {
            btnDataToProcess = toBuildData;
        }
        else if (typeof toBuildData === 'object' && toBuildData !== null) {
            const firstArrayValue = Object.values(toBuildData).find(Array.isArray);
            if (firstArrayValue) {
                btnDataToProcess = firstArrayValue;
            }
            else if ('id' in toBuildData && 'purpose' in toBuildData) {
                // 단일 객체를 배열로 감싸줍니다.
                btnDataToProcess = [toBuildData];
            }
            else {
                console.warn("AI 응답 객체에서 처리할 배열 데이터를 찾지 못했습니다.");
                throw new Error("AI 응답 객체에서 처리할 배열 데이터를 찾지 못했습니다.");
            }
        }
        else {
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
                });
            }
            return acc;
        }, []);
        console.log(buttonSteps);
        console.log("===== Button 클릭 데이터 생성 완료... =====");
        return buttonSteps;
    });
}
// async function moodalButtonClickBuild(processData: any): Promise<ActionStep[]> {
//   console.log("Button 클릭 데이터 생성 시작...");
//   // AI 응답이 객체 안에 배열로 래핑되어 올 수 있으므로 정규화
//   const dataToProcess = normalizeAiResponse(processData);
//   const buttonSteps = dataToProcess.reduce((acc, element) => {
//     // 질문 1: element.propse -> element.propose 로 수정
//     if (element && element.tag === 'button' && element.propose === 'complete' && element.id) {
//       acc.push({
//         type: 'click',
//         selector: "#" + element.id,
//       });
//     }
//     return acc;
//   }, [] as ActionStep[]);
//   console.log(buttonSteps);
//   console.log("Button 클릭 데이터 생성 완료...");
//   return buttonSteps;
// }
// 자동 신청 실행
function automate(page_1, browser_1, processChainData_1) {
    return __awaiter(this, arguments, void 0, function* (page, browser, processChainData, userDataFromServer = null) {
        try {
            console.log('>>> 자동 신청 시작...');
            for (const step of processChainData) {
                if (!step.type || !step.selector) {
                    console.warn('Skipping invalid action:', step);
                    continue;
                }
                switch (step.type) {
                    case 'fill':
                        if (typeof step.value === 'undefined') {
                            console.warn(`Skipping fill action: 'value' is missing for selector ${step.selector}`);
                            continue;
                        }
                        yield page.fill(step.selector, step.value);
                        console.log(`Filling ${step.selector} with value: ${step.value}`);
                        break;
                    case 'click':
                        yield page.click(step.selector);
                        console.log(`Clicking ${step.selector}`);
                        console.log("$ 모달 액션 실행중...");
                        // TODO: 모달 셀렉터를 하드코딩하지 않고 동적으로 감지하는 로직 필요
                        const elements = yield getElementsFromModal(page, "#paperApplyModal");
                        const vaildData = yield filteringValidData(elements);
                        // input 먼저 처리
                        const inputFields = yield filteringInputFields(vaildData);
                        if (inputFields.length > 0 && userDataFromServer) {
                            const jsonPrompt = yield inputPromptGenerator(inputFields, userDataFromServer);
                            const agentResult = yield ollamaRunJsonAgent(jsonPrompt);
                            const inputChain = yield inputChainBuild(vaildData, agentResult);
                            yield automate(page, browser, inputChain); // userDataFromServer는 모달 내부 재귀호출 시 필요 없음
                        }
                        // button 처리
                        const buttons = yield filteringButtons(vaildData);
                        if (buttons.length > 0) {
                            const buttonPrompt = yield modalButtonPromptGenerator(buttons);
                            const buttonAgentResult = yield ollamaRunJsonAgent(buttonPrompt);
                            // const buttonChain = await moodalButtonClickBuild(buttonAgentResult);
                            // await automate(page, browser, buttonChain); // userDataFromServer는 모달 내부 재귀호출 시 필요 없음
                        }
                        break;
                    default:
                        // 'fill' 또는 'click'이 아닌 경우를 처리하기 위한 타입 단언
                        const exhaustiveCheck = step;
                        console.warn(`Unknown action type: ${exhaustiveCheck.type}. Skipping.`);
                        break;
                }
            }
            console.log('>>> 자동 신청 완료...');
        }
        catch (error) {
            console.error('자동 신청 중 오류 발생:', error);
            return error.message;
        }
        finally {
            // 최상위 호출에서만 브라우저를 닫도록 로직 수정 필요 (현재는 재귀 호출 시 닫힐 수 있음)
            // 이 부분은 원본 로직을 따름
            if (browser) {
                // await browser.close(); // 원본 코드에서는 이 부분이 주석 처리되어 있었음
            }
        }
    });
}
// --- API 엔드포인트 ---
app.post('/submit-data', (req, res) => {
    const data = req.body;
    console.log('클라이언트로부터 데이터 수신:', data);
    res.status(200).json({
        status: 200
    });
});
app.post('/api/run-agent', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobId = 'job_' + Date.now();
    jobStorage[jobId] = { status: 'pending', result: null };
    res.status(200).json({
        status: 200,
        jobId: jobId
    });
    try {
        browser = yield playwright_1.chromium.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = yield browser.newContext();
        const page = yield context.newPage();
        const userDataFromServer = yield getUserInfoFromServer();
        yield page.goto(req.body.url, { waitUntil: 'domcontentloaded' });
        const elements = yield getElementFromHTML(req.body.url, page);
        const vaildData = yield filteringValidData(elements);
        // input 처리
        // const inputFields = await filteringInputFields(vaildData);
        // const jsonPrompt = await inputPromptGenerator(inputFields, userDataFromServer);
        // const agentResult = await runJsonAgent(jsonPrompt);
        // const inputChain = await inputChainBuild(vaildData, agentResult);
        // await automate(page, browser, inputChain, userDataFromServer); // browser 전달
        // additional_action 버튼 수행
        const buttons = yield filteringButtons(vaildData);
        const jsonPrompt = yield buttonPromptGenerator(buttons);
        const agentResult = yield ollamaRunJsonAgent(jsonPrompt);
        const buttonChain = yield buttonClickBuild(agentResult);
        for (const step of buttonChain) {
            if (!step.type || !step.selector) {
                console.warn('Skipping invalid action:', step);
                continue;
            }
            yield page.click(step.selector);
            console.log(`Clicking ${step.selector}`);
        }
        // await automate(page, browser, buttonChain, userDataFromServer); // <- 새로 만들 필요가 있음
        // 참고: automate 함수 내부에서 finally 블록이 browser를 닫을 수 있으므로
        // 이 지점에서는 browser 객체가 이미 닫혔을 수 있습니다.
        // 원본 코드에서 automate의 finally 블록이 주석처리 되어있어 유지합니다.
    }
    catch (error) {
        console.error('자동 신청중 에러 발생:', error.message);
        jobStorage[jobId] = { status: 'error', result: error.message };
        // return error.message; // 여기서 반환하면 안 됨 (응답은 이미 보냄)
    }
    finally {
        if (browser) {
            // await browser.close(); // 최상위 레벨에서 닫기 (원본 코드 주석 유지)
        }
    }
}));
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
app.listen(8888, () => console.log('API 서버 실행 중 (포트 8888)'));

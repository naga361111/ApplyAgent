require('dotenv').config(); // .env 파일에서 환경 변수를 불러옵니다.
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080; // .env 파일의 PORT 혹은 8080 포트 사용

// 현재 디렉토리(.)의 파일들을 정적 파일로 제공합니다.
// (예: index.html 파일이 있으면 http://localhost:8080 에서 바로 보입니다)
app.use(express.static('.'));

// 지정된 포트에서 서버를 시작합니다.
app.listen(PORT, () => {
  console.log(`로컬 서버가 시작되었습니다: http://localhost:${PORT}`);
});

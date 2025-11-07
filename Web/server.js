const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
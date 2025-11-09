const backendURL = 'https://applyagent.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitBtn');
    const runAgentBtn = document.getElementById('runAgentBtn');

    submitButton.addEventListener('click', () => {
        const userName = document.getElementById('userName').value;
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const nationalId = document.getElementById('nationalId').value;
        const residence = document.getElementById('residence').value;

        const formData = {
            name: userName,
            age: age,
            gender: gender,
            nationalId: nationalId,
            residence: residence,
        };

        fetch(backendURL + '/submit-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(response => response.json())
            .then(data => {
                console.log('서버 응답:', data);
                alert('제출 성공!');
            })
            .catch(error => {
                console.error('전송 실패:', error);
                alert('제출 실패.');
            });
    });

    runAgentBtn.addEventListener('click', () => {
        const data = {
            dummy: "dummy"
        }

        fetch(backendURL + '/api/call-webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                console.log('서버 응답:', data);
                alert('제출 성공!');
            })
            .catch(error => {
                console.error('전송 실패:', error);
                alert('제출 실패.');
            });
    })
});

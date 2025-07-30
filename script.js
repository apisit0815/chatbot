const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// ! สำคัญ: แก้ไข URL นี้เป็น URL ของ Cloudflare Worker ของคุณ
const WORKER_URL = 'https://openai-proxy.a-tongchai.workers.dev';

async function getBotResponse(prompt) {
    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error(`Worker error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error fetching bot response:", error);
        return "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อ";
    }
}

function appendMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function handleUserInput() {
    const userMessage = userInput.value;
    if (!userMessage) return;

    appendMessage(userMessage, 'user');
    userInput.value = '';

    const botMessage = await getBotResponse(userMessage);
    appendMessage(botMessage, 'bot');
}

sendBtn.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});

// โค้ดสำหรับ Frontend (script.js)

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// ! สำคัญ: แก้ไข URL นี้เป็น URL ของ Cloudflare Worker ของคุณ
const WORKER_URL = 'https://openai-proxy.your-worker.workers.dev';

// ฟังก์ชันสำหรับเพิ่มข้อความลงในกล่องแชท
function appendMessage(sender, isNewMessage = true) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
    if (isNewMessage) {
        chatBox.appendChild(messageElement);
    }
    return messageElement;
}

// ฟังก์ชันหลักในการเรียกและจัดการ Stream
async function getBotResponseStream(prompt) {
    // 1. สร้างกล่องข้อความเปล่าๆ สำหรับบอทไว้ก่อน
    const botMessageElement = appendMessage('bot');
    let fullResponse = ""; // ตัวแปรสำหรับเก็บข้อความเต็ม

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error(`Worker error: ${response.statusText}`);
        }

        // 2. เตรียมอ่านข้อมูลแบบ Stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 3. วนลูปเพื่ออ่านข้อมูลทีละชิ้น (chunk)
        while (true) {
            const { value, done } = await reader.read();
            if (done) break; // ถ้าจบ stream ให้ออกจากลูป

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') {
                        return; // OpenAI ส่งสัญญาณว่าจบแล้ว
                    }
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0].delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            botMessageElement.innerText = fullResponse; // อัปเดตข้อความในกล่องแชท
                            chatBox.scrollTop = chatBox.scrollHeight; // เลื่อน scroll ลงมาล่าสุด
                        }
                    } catch (error) {
                        // console.error('Error parsing stream data:', error);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error fetching bot response:", error);
        botMessageElement.innerText = "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อ";
    }
}

async function handleUserInput() {
    const userMessage = userInput.value;
    if (!userMessage) return;

    const userMessageElement = appendMessage('user');
    userMessageElement.innerText = userMessage;
    userInput.value = '';
    sendBtn.disabled = true; // ปิดปุ่มส่งชั่วคราว

    await getBotResponseStream(userMessage);

    sendBtn.disabled = false; // เปิดปุ่มส่งอีกครั้ง
    userInput.focus(); // ให้เคอร์เซอร์กลับไปที่ช่องพิมพ์
}

sendBtn.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});

// ======= ตั้งค่า URL ของ Apps Script ที่ Deploy แล้ว =======
const ENDPOINT = "https://script.google.com/macros/s/AKfycbzd5R6d7i1v8Rm827CaP1KB9AcKWb9F_SXuZ2-jtBltfpolkhWN-3E5cJKvPQaiEuCF/exec"; // เช่น https://script.google.com/macros/s/AKfycb.../exec

// ======= อ้างอิง DOM =======
const chat = document.getElementById("chat");
const q = document.getElementById("q");
const sendBtn = document.getElementById("sendBtn");
const skipBtn = document.getElementById("skipBtn");
const typing = document.getElementById("typing");
const toast = document.getElementById("toast");
const modeBtn = document.getElementById("modeBtn");
const tempSlider = document.getElementById("temp");
const tempVal = document.getElementById("tempVal");
const tokCount = document.getElementById("tokCount");
const metaBar = document.getElementById("metaBar");
const modeSel = document.getElementById("mode");
const gradeSel = document.getElementById("grade");

// ======= ธีม มืด/สว่าง =======
const applyTheme = () => {
  const m = localStorage.getItem("theme") || "light";
  document.documentElement.classList.toggle("dark", m === "dark");
  modeBtn.textContent = m === "dark" ? "☀️" : "🌙";
};
modeBtn.onclick = () => {
  const next = (localStorage.getItem("theme") || "light") === "light" ? "dark" : "light";
  localStorage.setItem("theme", next); applyTheme();
};
applyTheme();

// แสดงค่า temp สด ๆ
tempSlider.addEventListener("input", ()=> tempVal.textContent = tempSlider.value);
tempVal.textContent = tempSlider.value;

// ======= ประมาณจำนวนโทเคน (ฝั่งเว็บ ให้สอดคล้องกับฝั่งเซิร์ฟเวอร์) =======
function estimateTokensClient(s){
  if(!s) return 0;
  const ascii = (s.match(/[\x00-\x7F]/g) || []).length;
  const nonAscii = s.length - ascii;
  return Math.ceil(ascii/4) + Math.ceil(nonAscii/2);
}
function updateCounter(){
  const t = estimateTokensClient(q.value);
  tokCount.textContent = `ประมาณ ${t} / 500 โทเคน`;
  tokCount.className = "count" + (t>500 ? " warn" : "");
}
q.addEventListener("input", updateCounter); updateCounter();

// ======= สถานะบทสนทนา =======
let history = []; // เก็บเฉพาะในหน้านี้ (รีเฟรชแล้วหาย)
let typingController = { skipping:false };

// ======= ตัวช่วย UI =======
function addMessage(role, text){
  const row = document.createElement("div");
  row.className = `row ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "คุณ" : "Dr.";
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  const wrap = document.createElement("div"); wrap.appendChild(bubble);
  if(role === "user"){ row.appendChild(wrap); row.appendChild(avatar); }
  else{ row.appendChild(avatar); row.appendChild(wrap); }
  chat.appendChild(row);
  chat.querySelector(".empty")?.remove();
  chat.scrollTop = chat.scrollHeight;
}

function addAssistantBubble() {
  const row = document.createElement("div");
  row.className = "row assistant";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "Dr.";
  const bubble = document.createElement("div");
  bubble.className = "bubble assistant";
  const wrap = document.createElement("div"); wrap.appendChild(bubble);
  row.appendChild(avatar); row.appendChild(wrap);
  chat.appendChild(row);
  chat.querySelector(".empty")?.remove();
  chat.scrollTop = chat.scrollHeight;
  return bubble;
}

function setTyping(v){ typing.style.display = v ? "block" : "none"; }
function setSending(v){ sendBtn.disabled = v; skipBtn.disabled = v; }
function showToast(msg){
  toast.textContent = msg; toast.style.display = "block";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.style.display = "none", 2400);
}

// ======= เอฟเฟกต์พิมพ์สด =======
async function typeOutToBubble(text, bubbleEl, opts = {}) {
  const speed = opts.speed ?? 10; // ตัวอักษรต่อชุด
  const delay = opts.delay ?? 18; // หน่วงต่อชุด (มิลลิวินาที)
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  bubbleEl.textContent = "";
  bubbleEl.appendChild(cursor);

  const chars = text.split("");
  let buffer = "";

  function flushBuffer() {
    if (!buffer) return;
    const safeSpan = document.createElement("span");
    safeSpan.textContent = buffer;
    bubbleEl.insertBefore(safeSpan, cursor);
    buffer = "";
  }

  typingController.skipping = false;
  for (let i = 0; i < chars.length; i++) {
    if (typingController.skipping) {
      flushBuffer();
      const rest = document.createElement("span");
      rest.textContent = chars.slice(i).join("");
      bubbleEl.insertBefore(rest, cursor);
      break;
    }
    const ch = chars[i];
    if (ch === "\n") { flushBuffer(); bubbleEl.insertBefore(document.createElement("br"), cursor); }
    else { buffer += ch; }
    flushBuffer();
    if (i % speed === 0) await new Promise(r => setTimeout(r, delay));
  }
  cursor.remove();
}
skipBtn.addEventListener("click", ()=> typingController.skipping = true);

// ======= การส่งข้อความ =======
async function sendMessage(){
  const text = q.value.trim();
  if(!text) return;

  // กันไม่ให้ส่งถ้าเกิน 500 โทเคน
  const t = estimateTokensClient(text);
  if (t > 500){
    showToast("ข้อความยาวเกิน 500 โทเคน กรุณาย่อก่อนส่ง");
    return;
  }

  addMessage("user", text);
  history.push({ role: "user", content: text });
  q.value = ""; updateCounter(); setTyping(true); setSending(true);
  metaBar.textContent = "";

  try{
    const payload = {
      messages: history,                 // เซิร์ฟเวอร์จะประกอบ system prompt ตาม mode/grade ให้เอง
      mode: modeSel.value,               // coach | teacher | tutor
      grade: gradeSel.value,             // primary | lowersec | uppersec
      temperature: Number(tempSlider.value)
    };

    const res = await fetch(ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"text/plain" }, // simple request เพื่อลดปัญหา CORS
      body: JSON.stringify(payload)
    });

    const raw = await res.text();
    let data;
    try{ data = JSON.parse(raw); } catch{ data = { error: "รูปแบบผลลัพธ์ไม่ถูกต้อง" }; }

    if (data.error){
      addMessage("assistant", "⚠️ " + data.error);
    } else {
      const bubble = addAssistantBubble();
      const replyText = data.reply || "(ไม่มีคำตอบ)";
      await typeOutToBubble(replyText, bubble, { speed: 10, delay: 18 });

      if (data.meta){
        const { ms, grade, mode, temperature } = data.meta;
        metaBar.textContent = `⏱ ${ms} ms • โหมด: ${mode} • ระดับ: ${grade} • temp: ${temperature}`;
      }
      history.push({ role:"assistant", content: replyText });
    }

  }catch(err){
    showToast("เชื่อมต่อไม่ได้ โปรดลองใหม่");
  }finally{
    setTyping(false); setSending(false);
  }
}

// คีย์ลัด: Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่
q.addEventListener("keydown", (e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); } });
sendBtn.addEventListener("click", (e)=>{ e.preventDefault(); sendMessage(); });

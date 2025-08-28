let wakeLock = null;

function updateClock() {
const now = new Date();

// === 년도 ===
const yearContainer = document.getElementById("year-container");
const year = now.getFullYear();
yearContainer.innerHTML = `
<span class="year">${year}</span><span class="year-text">年</span>
`;

// === 월, 일, 요일 ===
const monthdayContainer = document.getElementById("monthday-container");
const month = now.getMonth() + 1;
const day = now.getDate();
const weekday = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
monthdayContainer.innerHTML = `
<div>
    <span class="month">${month}</span><span class="month-text">月</span>
</div>
<div>
    <span class="today">${day}</span><span class="today-text">日</span>
</div>
<div>
    <span class="dissweekday">${weekday}</span>
</div>
`;

// === 시간 ===
const timeContainer = document.getElementById("time-container");
const rawHour = now.getHours();
const hour12 = rawHour % 12 || 12; // 12시간제
const hour = String(hour12).padStart(2, "0");
const minute = String(now.getMinutes()).padStart(2, "0");
const second = String(now.getSeconds()).padStart(2, "0");

timeContainer.innerHTML = `
<div class="time-hour">
    <span class="hour">${hour}:${minute}</span>
</div>
<div class="time-second">
    <span class="second">${second}</span>
</div>
`;

// === 달력 ===
generateCalendar(now);
}

setInterval(updateClock, 1000);
updateClock();

function generateCalendar(currentDate) {
const calendar = document.getElementById("calendar-container");

// 요일 7칸은 남기고 나머지 지움
while (calendar.children.length > 7) {
    calendar.removeChild(calendar.lastChild);
}

const year = currentDate.getFullYear();
const month = currentDate.getMonth();

const firstDay = new Date(year, month, 1).getDay();
const lastDate = new Date(year, month + 1, 0).getDate();

// 빈칸
for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    calendar.appendChild(empty);
}

// 날짜 채우기
for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month, d);
    const day = document.createElement("div");

    // 오늘 날짜면 [숫자] 표시
    if (d === currentDate.getDate()) {
    day.innerHTML = `<span style="color: yellow;">[</span> ${d} <span style="color: yellow;">]</span>`;
    } else {
    day.textContent = d;
    }

    day.classList.add("day");

    // 일/토 색상
    if (date.getDay() === 0) {
    day.classList.add("sunday");
    } else if (date.getDay() === 6) {
    day.classList.add("saturday");
    }

    calendar.appendChild(day);
}
}

// 화면 꺼짐 방지 함수
async function enableWakeLock() {
try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("화면 꺼짐 방지 활성화됨");

    wakeLock.addEventListener("release", () => {
    console.warn("Wake Lock 해제됨, 재요청 시도");
    enableWakeLock(); // ✅ 재요청
    });
} catch (err) {
    console.error("Wake Lock 오류:", err.name, err.message);
}
}

function playSilentAudio() {
const audio = new Audio("https://cdn.jsdelivr.net/gh/anars/blank-audio/1-second-of-silence.mp3");
audio.loop = true;
audio.play().catch(e => console.warn("Audio play error:", e));
}

// 페이지 진입 시 1회 요청
enableWakeLock();

/* ======= Immersive(전체화면/가로/웨이크락) 보정 유틸 ======= */
function isFullscreen() {
return document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement;
}
function requestFullscreenIfNeeded() {
if (isFullscreen()) return Promise.resolve();
    const el = document.documentElement;
    const p = el.requestFullscreen?.()
    || el.webkitRequestFullscreen?.()
    || el.msRequestFullscreen?.();
return Promise.resolve(p).catch(()=>{ });
}
async function ensureImmersive(reason = 'tap') {
try {await requestFullscreenIfNeeded(); } catch(e) { }

// 가로 고정 (일부 브라우저는 전체화면 상태에서만 허용)
    if (screen.orientation?.lock) {
    try {
    if (!String(screen.orientation.type || '').includes('landscape')) {
        await screen.orientation.lock('landscape');
    }
    } catch(e) { /* 거절돼도 무시 */}
}

    // 화면 꺼짐 방지 재요청
    if ('wakeLock' in navigator) {
    try {
    if (!window.wakeLock || window.wakeLock.released) {
        await enableWakeLock();
    }
    } catch(e) { }
}
}

document.addEventListener('pointerdown', () => {
        ensureImmersive('tap');
}, {passive: true });

document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'visible') {
    if (!wakeLock || wakeLock.released) {  // ← 가드 추가
    enableWakeLock();
    }
}
});

document.addEventListener('fullscreenchange', () => {
if (!isFullscreen()) {
        console.warn('전체화면 해제 감지. 다음 터치에서 재보정합니다.');
}
});

async function initBatteryWidget() {
const box = document.getElementById('battery');
    if (!box) return;

    // 미지원 브라우저는 위젯 숨김
    if (!('getBattery' in navigator)) {
    box.style.display = 'none';
    console.warn('Battery API 미지원: 위젯 숨김');
    return;
}
    try {
    const b = await navigator.getBattery();
    const fill = box.querySelector('.bat > i');
    const txt  = box.querySelector('#batText');

    function render() {
        const pct = Math.round(b.level * 100);
        fill.style.setProperty('--level', `${pct}%`);
        txt.textContent = b.charging ? `${pct}% ⚡` : `${pct}%`;
        box.style.display = 'flex';

        // 색상 조건
        if (pct <= 20) {
            fill.style.background = "red";      // 20% 이하 빨강
        } else if (pct <= 45) {
            fill.style.background = "yellow";   // 45% 이하 노랑
        } else {
            fill.style.background = "white";    // 기본 흰색
        }
    }

    render();
    b.addEventListener('levelchange', render);
    b.addEventListener('chargingchange', render);
} catch (e) {
    box.style.display = 'none';
    console.warn('Battery 위젯 초기화 실패:', e);
}
}
document.addEventListener('DOMContentLoaded', initBatteryWidget);

document.addEventListener("DOMContentLoaded", () => {
const popButton = document.querySelector(".popButton");
const editPopup = document.getElementById("editPopup");
const textInput = document.getElementById("textInput");
const confirmText = document.getElementById("confirmText");
const cancelText = document.getElementById("cancelText");
const restoreText = document.getElementById("restoreText");
const scrim = document.getElementById("scrim");

let isWhite = false;
const defaultHTML = popButton.innerHTML;

const saved = localStorage.getItem("popButtonText");
if (saved) popButton.textContent = saved;

popButton.addEventListener("click", () => {
    isWhite = !isWhite;
    popButton.style.backgroundColor = isWhite ? "white" : "rgba(0,0,0,0)";
    popButton.style.color = isWhite ? "black" : "rgba(0,0,0,0)";
});

/* 길게 눌러 편집 열기 */
let pressTimer;
const openPopup = () => {
    editPopup.style.display = "block";
    if (scrim) scrim.style.display = "block"; 
    textInput.focus();
};
const closePopup = () => {
    editPopup.style.display = "none";
    if (scrim) scrim.style.display = "none";  
};

const startPress = () => {
    if (!isWhite) return;
    pressTimer = setTimeout(() => {
    textInput.value = popButton.textContent;
    openPopup();
    }, 1500);
};
const cancelPress = () => clearTimeout(pressTimer);

popButton.addEventListener("mousedown", startPress);
popButton.addEventListener("mouseup", cancelPress);
popButton.addEventListener("mouseleave", cancelPress);
popButton.addEventListener("touchstart", startPress);
popButton.addEventListener("touchend", cancelPress);

/* 확인(저장) */
confirmText.addEventListener("click", () => {
    let newText = textInput.value.trim();
    if (newText) {
    newText = newText.replace(/;/g, "\n");
    popButton.textContent = newText;
    localStorage.setItem("popButtonText", newText);
    }
    closePopup(); 
});

/* 취소 */
cancelText.addEventListener("click", () => {
    closePopup(); 
});

/* 복원 */
restoreText.addEventListener("click", () => {
    popButton.innerHTML = defaultHTML;
    textInput.value = "";
    localStorage.removeItem("popButtonText");
    closePopup(); 
});
});

const waterScreenBtn = document.getElementById('waterScreenBtn');
if (waterScreenBtn) {
waterScreenBtn.addEventListener('click', () => {
    closeVisiblePopups(); // 1) 팝업 먼저 닫기 (+ scrim 숨김)
    openScreen();         // 2) 스크린 열기 (기존 구현 그대로)
});
}

// ── 공용: 스크린/닫기 버튼 보장 ─────────────────────────────
function ensureScreen() {
let screen = document.querySelector(".screen");
if (!screen) {
    screen = document.createElement("div");
    screen.className = "screen";
    document.body.appendChild(screen);
}
// 좌상단 닫기 버튼 보장
let closeBtn = screen.querySelector(".screen-close");
if (!closeBtn) {
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "screen-close";
    closeBtn.setAttribute("aria-label", "스크린 닫기");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => {
    // 인터벌 정리 후 닫기
    if (screen._shower?.stepInterval) clearInterval(screen._shower.stepInterval);
    screen.style.display = "none";
    screen.style.backgroundColor = ""; // 배경 초기화
    });
    screen.appendChild(closeBtn);
}
return screen;
}

function ensureShowerTimerMounted(screen) {
// 이미 마운트되어 있으면 재사용
if (screen._shower && screen.querySelector(".sh-start")) return;

// 시작 버튼(하단 밀착)
const startBtn = document.createElement("button");
startBtn.className = "sh-start";
startBtn.textContent = "시작";
screen.appendChild(startBtn);

// 단계 표시 영역(시작 버튼 위 전체)
const area = document.createElement("div");
area.className = "sh-area";
screen.appendChild(area);

// 단계 정의 (원본과 동일)
const steps = [
    { text: '물 묻히기', duration: 60, color: '#FFB3BA' },
    { text: '샴푸', duration: 60, color: '#FFDFBA' },
    { text: '바디워시', duration: 60, color: '#FFFFBA' },
    { text: '헹구기', duration: 120, color: '#BAFFC9' },
    { text: '클렌징폼', duration: 60, color: '#BAE1FF' },
    { text: '물기제거', duration: 180, color: '#CBAAFF' },
    { text: '환복', duration: 60, color: '#FFC1FF' },
];

// 상태 저장
const sh = {
    currentStep: 0,
    stepInterval: null,
    area,
    startBtn,
    screen,
};
screen._shower = sh;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function resetToInitialState() {
    if (sh.stepInterval) clearInterval(sh.stepInterval);
    sh.currentStep = 0;
    sh.area.style.display = "none";
    sh.area.innerHTML = "";
    sh.screen.style.backgroundColor = ""; // 전체 배경 초기화
    sh.startBtn.disabled = false;
}

function runStep(index) {
    if (index >= steps.length) { resetToInitialState(); return; }

    const step = steps[index];
    // ✅ 배경색을 .screen 전체에 적용
    sh.screen.style.backgroundColor = step.color;

    sh.area.style.display = "flex";
    sh.area.innerHTML = `
    <div>
    <div style="margin-bottom: 3vh;">${step.text}</div>
    <div id="sh-timer" style="margin-top:3vh;">${formatTime(step.duration)}</div>
    </div>
`;

    let timeLeft = step.duration;
    if (sh.stepInterval) clearInterval(sh.stepInterval);
    sh.stepInterval = setInterval(() => {
    timeLeft--;
    const t = sh.area.querySelector("#sh-timer");
    if (t) t.textContent = formatTime(timeLeft);
    if (timeLeft <= 0) {
        clearInterval(sh.stepInterval);
        sh.currentStep++;
        runStep(sh.currentStep);
    }
    }, 1000);
}

function startSequence() {
    if (sh.stepInterval) clearInterval(sh.stepInterval);
    sh.currentStep = 0;

    sh.area.style.display = "none";
    sh.area.innerHTML = "";
    sh.screen.style.backgroundColor = "";

    sh.startBtn.disabled = false;

    runStep(sh.currentStep);
}

sh.startBtn.addEventListener("click", startSequence);
}

function openScreen() {
const screen = ensureScreen();
ensureShowerTimerMounted(screen);
screen.style.display = "block";
}

function closeVisiblePopups() {
const popups = document.querySelectorAll('.popup');
let closedAny = false;

popups.forEach(p => {
    const disp = getComputedStyle(p).display;
    if (disp !== 'none') {
    p.style.display = 'none';
    closedAny = true;
    }
});

// 팝업이 하나라도 닫혔다면 scrim도 숨김
if (closedAny) {
    const scrim = document.getElementById('scrim');
    if (scrim) scrim.style.display = 'none';
}
}
// =============================================
// main.js : 시작점 & 화면 전체 갱신 (A 담당)
// 핵심 흐름 : 사용자 동작(이벤트) → data 객체 변경 → render() → 화면 다시 그리기
// =============================================

// 데이터가 바뀌면 항상 이 함수만 부르면 된다
function render() {
  renderToolbar();      // main.js
  renderModeBar();      // main.js
  renderCalendar();     // calendar.js (A)
  renderDayPanel();     // schedule.js (B)
  renderSearch();       // schedule.js (B)
  renderSummary();      // report.js   (C)
  renderHabitCard();    // habit.js    (C)
  renderMoneyCard();    // money.js    (C)
  renderReport();       // report.js   (C)
}

// ---------- 상단 버튼 상태 ----------

function renderToolbar() {
  const saveBtn = document.getElementById('saveBtn2');
  if (changeCount > 0) {
    saveBtn.innerHTML = `💾 저장 <span class="count">${changeCount}</span>`;
    saveBtn.className = 'primary';
  } else {
    saveBtn.innerHTML = '💾 저장됨';
    saveBtn.className = 'ghost';
  }

  const undoBtn = document.getElementById('undoBtn');
  undoBtn.style.display = undoStack.length > 0 ? 'inline-block' : 'none';

  document.getElementById('themeBtn').textContent = data.theme === 'dark' ? '☀️' : '🌙';
  document.body.className = data.theme === 'dark' ? 'dark' : '';
}

// ---------- 모드 버튼 ----------

function renderModeBar() {
  let output = '';
  for (const key in MODES) {
    const mode = MODES[key];
    const className = modeOn[key] ? 'mode-btn on' : 'mode-btn';
    const style = modeOn[key] ? `background: ${mode.color}; border-color: ${mode.color};` : `border-color: ${mode.color}; color: ${mode.color};`;
    output += `<button class="${className}" style="${style}" onclick="toggleMode('${key}')">${mode.icon} ${mode.label}</button>`;
  }
  document.getElementById('modeBar').innerHTML = output;
}

function toggleMode(key) {
  modeOn[key] = !modeOn[key];
  render();
}

function toggleTheme() {
  data.theme = data.theme === 'dark' ? 'light' : 'dark';
  markChanged();
  render();
}

// ---------- 저장 / 불러오기 ----------
// 서버(server.js)가 저장된 데이터를 saved-data.js 파일 형태로 보내 준다
// → <script src="saved-data.js">가 savedData 변수를 만든다

function loadData() {
  if (typeof savedData !== 'undefined') {
    serverMode = true;
    if (savedData !== null) {
      restoreData(savedData); // 객체 → 클래스 인스턴스 (data.js)
      return;
    }
  }
  makeSampleData(); // 저장된 데이터가 없으면 예시 데이터
}

// 저장 버튼 : form이 서버로 보내지기 직전에 실행된다
// false를 리턴하면 기본 이벤트(전송)가 취소된다
function prepareSave() {
  if (!serverMode) {
    alert('지금은 index.html 파일을 직접 연 상태라 저장할 수 없어요.\n\n' +
      '터미널에서 npm start 를 실행한 뒤\nhttp://127.0.0.1:52273 으로 접속하면 저장돼요.');
    return false;
  }
  data.lastDate = selectedDate;
  document.getElementById('saveData').value = JSON.stringify(data);
  return true;
}

// ---------- 시계 (교재 5장 타이머 함수) ----------

function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

  // 매 분 0초마다 오늘 요약을 다시 그린다 (다음 일정, 인사말이 바뀌므로)
  // 자정이 지나면 오늘 날짜가 바뀌므로 화면 전체를 다시 그린다
  if (now.getSeconds() === 0) {
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      render();
    } else {
      renderSummary();
    }
  }
}

// ---------- 시작 ----------

window.onload = function () {
  loadData();

  selectedDate = data.lastDate !== '' ? data.lastDate : todayStr();
  const date = toDate(selectedDate);
  viewYear = date.getFullYear();
  viewMonth = date.getMonth();

  initCalendar();
  initSchedule();
  initHabit();
  initMoney();
  document.getElementById('themeBtn').onclick = function () { toggleTheme(); };
  document.getElementById('undoBtn').onclick = function () { undo(); };

  render();

  // 1초마다 시계 갱신
  updateClock();
  setInterval(updateClock, 1000);

  // 저장 후 돌아왔을 때 (주소가 /?saved=1)
  if (location.search.indexOf('saved') >= 0) {
    showToast('💾 저장했어요!');
  } else if (!serverMode) {
    showToast('📂 파일로 열어서 저장은 안 돼요. (README 참고)');
  }
};

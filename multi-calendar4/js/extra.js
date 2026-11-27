// =============================================
// extra.js : 멀티캘린더 4 - 🧘 바쁜 날 습관 자동 조절 (작성: Claude / AI: 생성)
//  - 일정·과제가 많은 날(바쁨 점수가 기준 이상)을 '쉬어가는 날'로 정한다
//  - 쉬어가는 날 : 습관 목표를 1개로 줄이고, 못 한 습관도 연속 기록이 끊기지 않는다 (🛡️)
//  - 습관 앱을 포기하게 되는 가장 큰 이유(바쁜 주에 기록이 끊김)를 일정과 연결해서 해결
// ※ 교재 범위 문법만 사용
// =============================================

let restThreshold = 4; // 바쁨 점수가 이 이상이면 쉬어가는 날

// 쉬어가는 날인지
function isRestDay(dateStr) {
  return busyScore(dateStr) >= restThreshold; // smart.js
}

// 그날의 습관 목표 개수
function habitGoal(dateStr) {
  const total = habitsOn(dateStr).length;
  if (total === 0) return 0;
  return isRestDay(dateStr) ? 1 : total;
}

function setRestThreshold(value) {
  restThreshold = Number(value);
  render();
}

// 최근 30일 동안 🛡️로 지켜 준 횟수 (쉬어가는 날에 못 한 습관 수)
function protectedCount() {
  let count = 0;
  for (let n = 1; n <= 30; n++) {
    const dateStr = addDays(todayStr(), -n);
    if (!isRestDay(dateStr)) continue;
    for (const habit of habitsOn(dateStr)) {
      if (!habit.isDoneOn(dateStr)) count++;
    }
  }
  return count;
}

// ---------- 화면 ----------

function renderExtra() {
  let html = '<div class="card-head"><h3>🧘 바쁜 날 습관 자동 조절</h3>';
  html += '<label class="sub rest-select">쉬어가는 날 기준 <select onchange="setRestThreshold(this.value)">';
  const options = { 3: '바쁨 3점 이상', 4: '바쁨 4점 이상', 6: '바쁨 6점 이상' };
  for (const key in options) {
    html += `<option value="${key}" ${Number(key) === restThreshold ? 'selected' : ''}>${options[key]}</option>`;
  }
  html += '</select></label></div>';
  html += '<p class="lead">일정과 과제가 많은 날엔 습관 목표를 1개로 줄이고, 못 한 습관도 🔥연속 기록이 끊기지 않게 🛡️로 지켜 줘요.</p>';

  // 최근 7일 + 앞으로 7일
  html += '<div class="rest-days">';
  for (let n = -6; n <= 7; n++) {
    const dateStr = addDays(todayStr(), n);
    const date = toDate(dateStr);
    const score = busyScore(dateStr);
    const rest = isRestDay(dateStr);
    let className = 'rest-day';
    if (rest) className += ' on';
    if (n === 0) className += ' today';
    if (n > 0) className += ' future';

    let state = '';
    if (n <= 0 && habitsOn(dateStr).length > 0) {
      const done = habitDoneCount(dateStr);
      state = done >= habitGoal(dateStr) ? '✅' : (rest ? '🛡️' : '·');
    }

    html += `<div class="${className}" onclick="goToDate('${dateStr}')" title="바쁨 ${score}점 · 목표 ${habitGoal(dateStr)}개">`;
    html += `<div class="sub">${n === 0 ? '오늘' : WEEK_NAMES[date.getDay()]}</div><b>${date.getDate()}</b>`;
    html += `<div class="rest-icon">${rest ? '🧘' : '💪'}</div>`;
    html += `<div class="rest-goal">목표 ${habitGoal(dateStr)}</div><div class="rest-state">${state}</div></div>`;
  }
  html += '</div>';

  // 습관별 : 일반 방식 vs 조절 방식 연속 기록 비교
  html += '<div class="rest-compare"><h4>🔥 연속 기록 비교</h4>';
  for (const habit of data.habits) {
    const plain = plainStreak(habit);
    const smart = habit.getStreak();
    html += `<div class="rest-row"><span>${habit.icon} ${escapeText(habit.title)}</span>`;
    html += `<span class="sub">보통 앱 ${plain}일</span><span class="arrow">→</span><b>우리 앱 ${smart}일</b>`;
    if (smart > plain) html += ' <span class="rest-tag">🛡️ 지킴</span>';
    html += '</div>';
  }
  html += `<p class="sub">최근 30일 동안 바쁜 날 🛡️로 지켜 준 습관 ${protectedCount()}번</p></div>`;

  document.getElementById('extraCard').innerHTML = html;
}

// 비교용 : 바쁜 날을 봐주지 않는 보통 습관 앱의 연속 기록
function plainStreak(habit) {
  let count = 0;
  let dateStr = todayStr();
  if (!habit.isDoneOn(dateStr)) dateStr = addDays(dateStr, -1);
  while (habit.isDoneOn(dateStr)) {
    count++;
    dateStr = addDays(dateStr, -1);
  }
  return count;
}

// 바쁜 날 예시 (예시 데이터일 때만) : 4일 전과 오늘을 바쁘게
function addRestSample() {
  const add = function (n, time, title, color) {
    const item = new CalendarItem('schedule');
    item.title = title;
    item.date = addDays(todayStr(), n);
    item.endDate = item.date;
    item.time = time;
    item.color = color;
    addEvent(item);
  };
  add(-4, '10:00', '중간 발표', 'red');
  add(-4, '13:00', '실험 보고서 작성', 'gray');
  add(-4, '18:00', '알바', 'orange');
  add(-4, '21:00', '스터디', 'blue');
  add(0, '13:00', '조별 발표 리허설', 'red');
  add(0, '20:00', '과외', 'purple');
}

function initExtra() {
  if (!serverMode) addRestSample();
}

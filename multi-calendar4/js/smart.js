// =============================================
// smart.js : 참신한 기능 모음 (작성: Claude / AI: 생성)
//  1) 🧭 거꾸로 계획 : 과제 마감일에서 거꾸로, 덜 바쁜 날을 골라 준비 일정을 자동 배치
//  2) 🌡️ 바쁨 지도   : 달력 칸을 그날 얼마나 바쁜지에 따라 색칠
//  3) 📈 지출 페이스 : 지금 속도로 쓰면 월말에 얼마가 되는지, 하루 얼마까지 써도 되는지
//  4) 🌱 습관 잔디   : 최근 12주 습관 달성률을 잔디처럼 표시
//  5) 🎯 지금 할 일  : 마감·중요도를 점수로 바꿔 가장 급한 과제 하나 추천
// ※ 교재 범위 문법만 사용 (Math, addEventListener, localStorage 등 사용 안 함)
// =============================================

// ---------- 공통 : 하루 바쁨 점수 ----------

// 일정 1점, 안 끝난 과제는 중요도에 따라 3 / 2 / 1점
const TASK_WEIGHT = { high: 3, normal: 2, low: 1 };

function busyScore(dateStr) {
  let score = 0;
  for (const ev of itemsOn(dateStr)) {
    if (ev.type === 'schedule') {
      score += 1;
    } else if (ev.type === 'task' && !ev.done) {
      score += TASK_WEIGHT[ev.priority];
    }
  }
  return score;
}

// 점수 → 0 ~ 4 단계
function busyLevel(score) {
  if (score >= 6) return 4;
  if (score >= 4) return 3;
  if (score >= 2) return 2;
  if (score >= 1) return 1;
  return 0;
}

// =============================================
// 1) 🧭 거꾸로 계획
// =============================================

// 이 과제를 위해 만든 준비 일정들
function planItemsOf(taskId) {
  return data.events.filter((ev) => ev.planFor === taskId);
}

// 몇 번 나눌지 입력값 검사 (교재 8장 throw)
function checkPlanCount(input) {
  const count = Number(input);
  if (!(count >= 1 && count <= 7)) {
    throw new Error('1부터 7 사이의 숫자를 입력하세요.');
  }
  if (count !== Number(count.toFixed(0))) {
    throw new Error('정수(1, 2, 3 …)로 입력하세요.');
  }
  return count;
}

function planBackward(taskId) {
  const task = findEvent(taskId);
  const today = todayStr();

  // 준비할 수 있는 날 : 오늘 ~ 마감 전날
  const candidates = [];
  let dateStr = today;
  while (dateStr < task.date) {
    candidates.push(dateStr);
    dateStr = addDays(dateStr, 1);
  }
  if (candidates.length === 0) {
    alert('마감일이 오늘이거나 이미 지나서 계획을 세울 수 없어요.');
    return;
  }

  const old = planItemsOf(taskId);
  let message = `"${task.title}"을(를) 마감 전에 몇 번 나눠서 준비할까요? (1~7)`;
  if (old.length > 0) message += `\n※ 이미 만든 준비 일정 ${old.length}개는 새 계획으로 바뀌어요.`;
  const input = prompt(message, candidates.length < 3 ? candidates.length : 3);
  if (input === null) return;

  let count = 0;
  try {
    count = checkPlanCount(input);
  } catch (error) {
    alert(error.message);
    return;
  }
  if (count > candidates.length) count = candidates.length;

  // 예전 계획 지우기
  data.events = data.events.filter((ev) => ev.planFor !== taskId);

  // 후보 날짜마다 바쁨 점수를 매겨서, 한가한 날 → 마감에 가까운 날 순으로 정렬
  const days = candidates.map((d) => {
    let score = busyScore(d);
    if (getHoliday(d) !== '' || toDate(d).getDay() === 0 || toDate(d).getDay() === 6) {
      score -= 0.5; // 주말·공휴일은 조금 더 여유 있다고 본다
    }
    return { date: d, score: score };
  });
  days.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.date < b.date ? 1 : -1;
  });

  // 앞에서 count개 고르고 날짜순으로 다시 정렬
  const picked = days.slice(0, count);
  picked.sort((a, b) => (a.date < b.date ? -1 : 1));

  picked.forEach((day, index) => {
    const item = new CalendarItem('schedule');
    item.title = `📖 ${task.title} 준비 (${index + 1}/${count})`;
    item.date = day.date;
    item.endDate = day.date;
    item.color = 'orange';
    item.planFor = taskId;
    item.memo = `마감 ${formatDateKor(task.date)} · 거꾸로 계획`;
    addEvent(item);
  });

  markChanged();
  const list = picked.map((day) => formatDateKor(day.date).split(' (')[0]).join(', ');
  showToast(`🧭 덜 바쁜 날 ${count}일에 배치했어요 : ${list}`);
  render();
}

// =============================================
// 2) 🌡️ 바쁨 지도
// =============================================

function toggleHeat() {
  heatOn = !heatOn;
  render();
}

// calendar.js가 칸을 만들 때 붙이는 class
function heatClass(dateStr) {
  if (!heatOn) return '';
  return ' heat' + busyLevel(busyScore(dateStr));
}

function renderHeatLegend() {
  const btn = document.getElementById('heatBtn');
  btn.className = heatOn ? 'ghost heat-on' : 'ghost';

  const legend = document.getElementById('heatLegend');
  if (!heatOn) {
    legend.style.display = 'none';
    return;
  }
  const names = ['여유', '조금', '보통', '바쁨', '매우 바쁨'];
  let html = '<span class="sub">바쁨 지도</span>';
  for (let i = 0; i < names.length; i++) {
    html += `<span class="legend-item"><i class="legend-box heat${i}"></i>${names[i]}</span>`;
  }
  legend.innerHTML = html;
  legend.style.display = 'flex';
}

// =============================================
// 3) 📈 지출 페이스 (money.js에서 사용)
// =============================================

// 100원 단위 반올림 (Math 대신 toFixed 사용)
function round100(number) {
  return Number((number / 100).toFixed(0)) * 100;
}

function makePaceHtml(total) {
  const today = toDate(todayStr());
  // 지금 보고 있는 달이 이번 달일 때만 예측
  if (today.getFullYear() !== viewYear || today.getMonth() !== viewMonth) return '';

  const day = today.getDate();
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leftDays = lastDay - day + 1; // 오늘 포함
  const projected = round100(total / day * lastDay);

  let html = '<div class="pace">';
  html += `<p>📈 이 속도면 월말 약 <b>${formatMoney(projected)}원</b>`;
  if (projected > data.budget) {
    html += ` <span class="pace-tag bad">예산 초과 예상</span></p>`;
  } else {
    html += ` <span class="pace-tag good">예산 안</span></p>`;
  }

  const left = data.budget - total;
  if (left > 0) {
    html += `<p class="sub">남은 ${leftDays}일 동안 하루 <b>${formatMoney(round100(left / leftDays))}원</b>까지 써도 돼요.</p>`;
  } else {
    html += '<p class="sub">이번 달은 남은 예산이 없어요. 남은 날은 아껴 볼까요? 🥲</p>';
  }
  html += '</div>';
  return html;
}

// =============================================
// 4) 🌱 습관 잔디
// =============================================

const GRASS_WEEKS = 12;

function renderGrass() {
  const box = document.getElementById('habitGrass');
  if (data.habits.length === 0) {
    box.innerHTML = '';
    return;
  }

  const today = todayStr();
  // 이번 주 일요일에서 11주 전 일요일부터 시작
  const start = addDays(today, -toDate(today).getDay() - (GRASS_WEEKS - 1) * 7);

  let html = '<div class="grass-head"><span class="sub">🌱 최근 12주 습관 잔디 · 칸을 누르면 그 날로 이동</span></div>';
  html += '<div class="grass">';
  for (let i = 0; i < GRASS_WEEKS * 7; i++) {
    const dateStr = addDays(start, i);
    if (dateStr > today) {
      html += '<i class="grass-cell future"></i>';
      continue;
    }
    const total = habitsOn(dateStr).length;
    const done = habitDoneCount(dateStr);
    let level = 0;
    if (total > 0 && done === 0 && isRestDay(dateStr)) {
      html += `<i class="grass-cell rest" title="${formatDateKor(dateStr)} : 바쁜 날 🛡️" onclick="goToDate('${dateStr}')"></i>`;
      continue;
    }
    if (total > 0 && done > 0) {
      const rate = done / habitGoal(dateStr); // 바쁜 날은 목표가 줄어든다 (extra.js)
      if (rate >= 1) level = 4;
      else if (rate >= 0.66) level = 3;
      else if (rate >= 0.33) level = 2;
      else level = 1;
    }
    const tip = `${formatDateKor(dateStr)} : ${done}/${total}`;
    html += `<i class="grass-cell g${level}" title="${tip}" onclick="goToDate('${dateStr}')"></i>`;
  }
  html += '</div>';
  box.innerHTML = html;
}

// =============================================
// 5) 🎯 지금 할 일 추천 (report.js 오늘 요약에서 사용)
// =============================================

// 점수 = 중요도 가중치 ÷ (남은 날 + 1) → 급하고 중요할수록 큼, 지난 과제는 가장 급함
function urgencyScore(ev) {
  const dday = getDday(ev.date);
  if (dday < 0) return 100 + TASK_WEIGHT[ev.priority];
  return TASK_WEIGHT[ev.priority] / (dday + 1);
}

function makeFocusHtml() {
  const tasks = data.events.filter((ev) => ev.type === 'task' && !ev.done);
  if (tasks.length === 0) return '';

  tasks.sort((a, b) => urgencyScore(b) - urgencyScore(a));
  const top = tasks[0];
  const plans = planItemsOf(top.id).filter((ev) => ev.date >= todayStr());

  let reason = `${ddayText(top.date)} · 중요도 ${PRIORITIES[top.priority].name}`;
  if (plans.length > 0) {
    reason += ` · 다음 준비 ${formatDateKor(plans[0].date).split(' (')[0]}`;
  }

  let html = '<div class="focus">';
  html += '<div class="focus-label">🎯 지금 하면 좋은 일</div>';
  html += `<div class="focus-title" onclick="goToDate('${top.date}')">${escapeText(top.title)}</div>`;
  html += `<div class="sub">${reason}</div>`;
  if (plans.length === 0 && getDday(top.date) > 0) {
    html += `<button class="small" onclick="planBackward(${top.id})">🧭 거꾸로 계획 세우기</button>`;
  }
  html += '</div>';
  return html;
}

// ---------- 이벤트 연결 ----------

function initSmart() {
  document.getElementById('heatBtn').onclick = function () { toggleHeat(); };
}

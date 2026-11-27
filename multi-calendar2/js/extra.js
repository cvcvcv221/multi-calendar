// =============================================
// extra.js : 멀티캘린더 2 - 🌩️ 과부하 예보 (작성: Claude / AI: 생성)
//  - 앞으로 5주 동안 주마다 얼마나 바쁜지를 날씨로 예보
//  - 시험·과제가 몰리는 주를 미리 경고하고, 앞 주의 한가한 날로 준비를 당겨 준다
// ※ 교재 범위 문법만 사용
// =============================================

const FORECAST_WEEKS = 5;
const WEATHER = [
  { min: 0, icon: '☀️', name: '맑음' },
  { min: 6, icon: '⛅', name: '구름' },
  { min: 11, icon: '🌧️', name: '비' },
  { min: 16, icon: '⛈️', name: '폭풍' }
];

// 시험인지 (제목에 '시험' 또는 '고사')
function isExam(ev) {
  return ev.type === 'task' && (ev.title.indexOf('시험') >= 0 || ev.title.indexOf('고사') >= 0);
}

// 이번 주 일요일
function thisSunday() {
  return addDays(todayStr(), -toDate(todayStr()).getDay());
}

// 한 주의 예보 : 점수, 시험·과제·일정 수, 날씨
function weekForecast(startDate) {
  const week = { start: startDate, end: addDays(startDate, 6), score: 0, exams: 0, tasks: 0, schedules: 0, items: [] };

  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(startDate, i);
    week.score += busyScore(dateStr); // smart.js
    for (const ev of itemsOn(dateStr)) {
      if (ev.type === 'task' && !ev.done) {
        if (isExam(ev)) {
          week.exams++;
          week.score += 2; // 시험은 더 무겁게
        } else {
          week.tasks++;
        }
        week.items.push(ev);
      } else if (ev.type === 'schedule') {
        week.schedules++;
      }
    }
  }

  week.weather = WEATHER[0];
  for (const w of WEATHER) {
    if (week.score >= w.min) week.weather = w;
  }
  return week;
}

function weekLabel(index) {
  const labels = ['이번 주', '다음 주', '2주 뒤', '3주 뒤', '4주 뒤'];
  return labels[index];
}

function shortDate(dateStr) {
  const date = toDate(dateStr);
  return (date.getMonth() + 1) + '/' + date.getDate();
}

// 처음으로 '비' 이상인 주의 번호 (없으면 -1)
function firstStormIndex(weeks) {
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].weather.min >= 11) return i;
  }
  return -1;
}

// 준비할 수 있는 날 : 오늘 ~ limit 전날
function prepDays(limit) {
  const days = [];
  let dateStr = todayStr();
  while (dateStr < limit) {
    days.push(dateStr);
    dateStr = addDays(dateStr, 1);
  }
  return days;
}

// 가장 한가한 날 하나
function lightestDay(days) {
  let best = '';
  let bestScore = 0;
  for (const dateStr of days) {
    const score = busyScore(dateStr);
    if (best === '' || score < bestScore) {
      best = dateStr;
      bestScore = score;
    }
  }
  return best;
}

// ---------- 준비 앞당기기 ----------

function pullForward(weekStart) {
  const week = weekForecast(weekStart);
  const targets = week.items.filter((ev) => planItemsOf(ev.id).length === 0);

  if (targets.length === 0) {
    alert('이 주의 과제·시험은 이미 준비 일정이 있어요.');
    return;
  }

  // 시험 → 중요도 높은 순
  targets.sort((a, b) => {
    if (isExam(a) !== isExam(b)) return isExam(a) ? -1 : 1;
    return PRIORITIES[a.priority].order - PRIORITIES[b.priority].order;
  });

  const added = [];
  for (const ev of targets) {
    // 폭풍 주보다 앞의 날을 우선, 없으면 마감 전날까지
    let days = prepDays(weekStart);
    if (days.length === 0) days = prepDays(ev.date);
    if (days.length === 0) continue;

    const day = lightestDay(days); // 하나 넣을 때마다 바쁨이 바뀌므로 매번 다시 계산
    const item = new CalendarItem('schedule');
    item.title = `📖 ${ev.title} 미리 준비`;
    item.date = day;
    item.endDate = day;
    item.color = 'orange';
    item.planFor = ev.id;
    item.memo = `과부하 예보 · 마감 ${formatDateKor(ev.date)}`;
    addEvent(item);
    added.push(shortDate(day));
  }

  markChanged();
  showToast(`🌂 준비 ${added.length}개를 앞당겼어요 : ${added.join(', ')}`);
  render();
}

// ---------- 화면 ----------

function renderExtra() {
  const start = thisSunday();
  const weeks = [];
  for (let i = 0; i < FORECAST_WEEKS; i++) {
    weeks.push(weekForecast(addDays(start, i * 7)));
  }

  let max = 1;
  for (const week of weeks) {
    if (week.score > max) max = week.score;
  }

  let html = '<div class="card-head"><h3>🌩️ 과부하 예보 <span class="sub">앞으로 5주</span></h3></div>';

  const stormIndex = firstStormIndex(weeks);
  if (stormIndex < 0) {
    html += '<div class="fc-alert calm">☀️ 앞으로 5주는 무난해요. 지금처럼만 하면 돼요.</div>';
  } else {
    const storm = weeks[stormIndex];
    const parts = [];
    if (storm.exams > 0) parts.push(`시험 ${storm.exams}개`);
    if (storm.tasks > 0) parts.push(`과제 ${storm.tasks}개`);
    if (storm.schedules > 0) parts.push(`일정 ${storm.schedules}개`);

    const before = prepDays(storm.start);
    let tip = '';
    if (before.length > 0) {
      const sorted = before.slice();
      sorted.sort((a, b) => busyScore(a) - busyScore(b));
      tip = `가장 한가한 날은 <b>${sorted.slice(0, 2).map((d) => formatDateKor(d)).join(', ')}</b>이에요.`;
    } else {
      tip = '이번 주라서 앞당길 날이 없어요. 마감 전 한가한 날에 나눠 배치할게요.';
    }

    html += `<div class="fc-alert storm"><div class="fc-big">${storm.weather.icon}</div><div>`;
    html += `<b>${weekLabel(stormIndex)}(${shortDate(storm.start)}~${shortDate(storm.end)})에 ${parts.join(' · ')}가 몰려요.</b>`;
    html += `<p>${tip}</p>`;
    html += `<button class="small primary" onclick="pullForward('${storm.start}')">🌂 준비 앞당기기</button></div></div>`;
  }

  // 주별 예보
  html += '<div class="fc-weeks">';
  weeks.forEach((week, index) => {
    const height = (week.score / max * 100).toFixed(0);
    const isStorm = index === stormIndex ? ' storm' : '';
    html += `<div class="fc-week${isStorm}" onclick="goToDate('${index === 0 ? todayStr() : week.start}')">`;
    html += `<div class="fc-label">${weekLabel(index)}</div><div class="sub">${shortDate(week.start)}~${shortDate(week.end)}</div>`;
    html += `<div class="fc-icon">${week.weather.icon}</div><div class="fc-name">${week.weather.name}</div>`;
    html += `<div class="fc-bar"><div style="height: ${height}%;"></div></div>`;
    html += `<div class="fc-count">📝${week.exams + week.tasks} · 📅${week.schedules}</div>`;
    html += `<div class="sub">${week.score}점</div></div>`;
  });
  html += '</div>';
  html += '<p class="sub fc-rule">점수 = 일정 1 + 과제 중요도(3/2/1) + 시험 가산 2 · 6점 구름, 11점 비, 16점 폭풍</p>';

  document.getElementById('extraCard').innerHTML = html;
}

// 예보를 보여 주기 위한 예시 과제 추가 (예시 데이터일 때만)
function addForecastSample() {
  const day = function (n) {
    return addDays(todayStr(), n);
  };
  const sample = function (title, n, priority) {
    const item = new CalendarItem('task');
    item.title = title;
    item.date = day(n);
    item.endDate = item.date;
    item.priority = priority;
    addEvent(item);
  };
  // 다음 주에 시험·과제가 몰리도록
  const nextSunday = dayDiff(todayStr(), addDays(thisSunday(), 7));
  sample('자료구조 기말고사', nextSunday + 2, 'high');
  sample('회로이론 시험', nextSunday + 4, 'high');
  sample('신호및시스템 과제', nextSunday + 3, 'normal');
}

function initExtra() {
  if (!serverMode) addForecastSample();
}

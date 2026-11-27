// =============================================
// calendar.js : 달력 (A 담당)
//  - 월간 보기 / 주간 보기, 달·주 이동, 날짜 선택, 공휴일
// =============================================

const MAX_BADGES = 3; // 월간 보기 한 칸에 보여줄 최대 항목 수

function renderCalendar() {
  if (viewMode === 'month') {
    renderMonth();
  } else {
    renderWeek();
  }
  document.getElementById('monthViewBtn').className = viewMode === 'month' ? 'seg on' : 'seg';
  document.getElementById('weekViewBtn').className = viewMode === 'week' ? 'seg on' : 'seg';
  renderHeatLegend(); // smart.js
}

// ---------- 월간 보기 ----------

function renderMonth() {
  document.getElementById('monthTitle').textContent = viewYear + '년 ' + (viewMonth + 1) + '월';

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 1일의 요일 (0 = 일요일)
  const today = todayStr();
  let output = '';

  // 요일 머리글
  for (let i = 0; i < 7; i++) {
    output += `<div class="weekday ${dayColorClass(i)}">${WEEK_NAMES[i]}</div>`;
  }

  // 6주 = 42칸
  for (let i = 0; i < 42; i++) {
    // 일(day)에 0이나 음수를 넣으면 Date 객체가 알아서 지난달 날짜로,
    // 말일보다 큰 수를 넣으면 다음 달 날짜로 계산해 준다
    const date = new Date(viewYear, viewMonth, i - firstDay + 1);
    output += makeMonthCell(date, today);
  }

  const grid = document.getElementById('calendarGrid');
  grid.className = 'calendar-grid month';
  grid.innerHTML = output;
}

function dayColorClass(weekDay) {
  if (weekDay === 0) return 'sun';
  if (weekDay === 6) return 'sat';
  return '';
}

function makeMonthCell(date, today) {
  const dateStr = toDateStr(date);
  const holiday = getHoliday(dateStr);

  let className = 'day-cell';
  if (date.getMonth() !== viewMonth) className += ' other';
  if (dateStr === today) className += ' today';
  if (dateStr === selectedDate) className += ' selected';
  className += heatClass(dateStr); // 바쁨 지도 (smart.js)

  let numClass = 'day-num ' + dayColorClass(date.getDay());
  if (holiday !== '') numClass += ' holiday';

  let html = `<div class="${className}" onclick="selectDate('${dateStr}')">`;
  html += `<div class="day-head"><span class="${numClass}">${date.getDate()}</span>`;
  if (holiday !== '') html += `<span class="holiday-name">${holiday}</span>`;
  html += '</div>';

  // 일정 + 과제 뱃지
  const list = visibleOn(dateStr, 'schedule').concat(visibleOn(dateStr, 'task'));
  for (let i = 0; i < list.length && i < MAX_BADGES; i++) {
    html += makeBadge(list[i], dateStr);
  }
  if (list.length > MAX_BADGES) {
    html += `<div class="more">+${list.length - MAX_BADGES}개 더</div>`;
  }

  html += '<div class="chips">' + makeChips(dateStr, today) + '</div>';
  html += '</div>';
  return html;
}

// 일정·과제 하나를 작은 뱃지로
function makeBadge(ev, dateStr) {
  let className = 'badge';
  let style = '';
  let text = '';

  if (ev.type === 'schedule') {
    style = `background: ${COLORS[ev.color].code};`;
    className += spanClass(ev, dateStr);
    text = (ev.time !== '' ? ev.time + ' ' : '') + escapeText(ev.title);
  } else {
    // 과제는 테두리만 있는 뱃지 + D-day
    className += ' task-badge';
    if (ev.done) className += ' done';
    if (ev.isUrgent()) className += ' urgent';
    text = '📝 ' + escapeText(ev.title);
  }

  return `<div class="${className}" style="${style}" title="${escapeText(ev.title)}">${text}</div>`;
}

// 여러 날 일정이면 이어지는 막대처럼 보이게
function spanClass(ev, dateStr) {
  if (ev.repeat !== 'none' || ev.date === ev.endDate) return '';
  if (dateStr === ev.date) return ' span-start';
  if (dateStr === ev.endDate) return ' span-end';
  return ' span-mid';
}

// 칸 아래쪽 작은 표시 : 습관 달성, 지출 합계
function makeChips(dateStr, today) {
  let html = '';

  if (modeOn.habit && dateStr <= today) {
    const total = habitsOn(dateStr).length;
    const done = habitDoneCount(dateStr);
    // 하나라도 했거나 오늘이면 표시
    if (total > 0 && (done > 0 || dateStr === today)) {
      const full = done === total ? ' full' : '';
      html += `<span class="chip habit-chip${full}">✅ ${done}/${total}</span>`;
    }
  }

  if (modeOn.expense) {
    const spent = expenseTotalOn(dateStr);
    if (spent > 0) {
      html += `<span class="chip money-chip">💰 ${formatMoney(spent)}</span>`;
    }
  }
  return html;
}

// ---------- 주간 보기 ----------

function renderWeek() {
  // 선택한 날짜가 들어 있는 주의 일요일
  const start = addDays(selectedDate, -toDate(selectedDate).getDay());
  const end = addDays(start, 6);
  const startDate = toDate(start);
  const endDate = toDate(end);

  document.getElementById('monthTitle').textContent =
    (startDate.getMonth() + 1) + '.' + startDate.getDate() + ' ~ ' + (endDate.getMonth() + 1) + '.' + endDate.getDate();

  const today = todayStr();
  let output = '';

  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(start, i);
    const date = toDate(dateStr);
    const holiday = getHoliday(dateStr);

    let className = 'week-col';
    if (dateStr === today) className += ' today';
    if (dateStr === selectedDate) className += ' selected';
    className += heatClass(dateStr); // 바쁨 지도 (smart.js)

    output += `<div class="${className}" onclick="selectDate('${dateStr}')">`;
    output += `<div class="week-head ${dayColorClass(i)}${holiday !== '' ? ' holiday' : ''}">`;
    output += `<span>${WEEK_NAMES[i]}</span><strong>${date.getDate()}</strong>`;
    if (holiday !== '') output += `<em>${holiday}</em>`;
    output += '</div>';

    // 일정
    for (const ev of visibleOn(dateStr, 'schedule')) {
      output += `<div class="week-item" style="border-left-color: ${COLORS[ev.color].code};">`;
      output += `<span class="time">${ev.time !== '' ? ev.time : '종일'}</span>${escapeText(ev.title)}</div>`;
    }
    // 과제
    for (const ev of visibleOn(dateStr, 'task')) {
      output += `<div class="week-item task${ev.done ? ' done' : ''}">📝 ${escapeText(ev.title)}</div>`;
    }

    output += '<div class="chips">' + makeChips(dateStr, today) + '</div>';
    output += '</div>';
  }

  const grid = document.getElementById('calendarGrid');
  grid.className = 'calendar-grid week';
  grid.innerHTML = output;
}

// ---------- 이동 ----------

// 날짜 클릭
function selectDate(dateStr) {
  selectedDate = dateStr;
  // 월간 보기에서 다른 달 날짜를 누르면 그 달로 이동
  const date = toDate(dateStr);
  viewYear = date.getFullYear();
  viewMonth = date.getMonth();
  render();
}

// 검색 결과 등에서 날짜로 바로 이동
function goToDate(dateStr) {
  selectDate(dateStr);
}

// n = -1 이전, 1 다음
function moveView(n) {
  if (viewMode === 'week') {
    selectDate(addDays(selectedDate, 7 * n));
    return;
  }
  viewMonth += n;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  } else if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }
  // 선택 날짜도 그 달 1일로
  selectedDate = viewYear + '-' + pad(viewMonth + 1) + '-01';
  render();
}

function goToday() {
  selectDate(todayStr());
}

function setViewMode(mode) {
  viewMode = mode;
  render();
}

// 버튼 이벤트 연결 (고전 이벤트 모델)
function initCalendar() {
  document.getElementById('prevBtn').onclick = function () { moveView(-1); };
  document.getElementById('nextBtn').onclick = function () { moveView(1); };
  document.getElementById('todayBtn').onclick = function () { goToday(); };
  document.getElementById('monthViewBtn').onclick = function () { setViewMode('month'); };
  document.getElementById('weekViewBtn').onclick = function () { setViewMode('week'); };
}

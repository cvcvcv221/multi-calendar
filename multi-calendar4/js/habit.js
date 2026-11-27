// =============================================
// habit.js : 습관 트래커 (C 담당)
//  - 습관 추가/삭제, 날짜별 체크, 연속 달성 일수, 최근 7일 표
// =============================================

// ---------- 체크 ----------

function toggleHabit(habitId, dateStr) {
  if (dateStr > todayStr()) {
    alert('미래의 습관은 미리 체크할 수 없어요.');
    return;
  }
  const habit = findHabit(habitId);
  if (!data.habitLogs[dateStr]) {
    data.habitLogs[dateStr] = [];
  }

  if (habit.isDoneOn(dateStr)) {
    data.habitLogs[dateStr] = data.habitLogs[dateStr].filter((id) => id !== habitId);
  } else {
    data.habitLogs[dateStr].push(habitId);
    const streak = habit.getStreak();
    if (streak >= 3) showToast('🔥 ' + streak + '일 연속 달성!');
  }
  markChanged();
  render();
}

// 연속 달성 일수 계산은 Habit 클래스의 메소드(data.js)
//   habit.getStreak()     : 지금 연속 기록
//   habit.getBestStreak() : 최고 기록

// ---------- 추가 / 삭제 ----------

function addHabit() {
  const title = prompt('새 습관 이름을 입력하세요.', '');
  if (title === null || title === '') return;

  const index = data.habits.length;
  const icon = HABIT_ICONS[index % HABIT_ICONS.length];
  const color = HABIT_COLORS[index % HABIT_COLORS.length];
  data.habits.push(new Habit(data.nextId, title, icon, color, todayStr()));
  data.nextId++;
  markChanged();
  showToast('💪 "' + title + '" 습관을 시작해요!');
  render();
}

function deleteHabit(habitId) {
  for (let i = 0; i < data.habits.length; i++) {
    if (data.habits[i].id === habitId) {
      const removed = data.habits.splice(i, 1)[0];
      undoStack.push({ kind: 'habit', item: removed });
      showToast('🗑️ 습관을 삭제했어요. 되돌리기로 복구할 수 있어요.');
      break;
    }
  }
  markChanged();
  render();
}

// ---------- 날짜 패널 안의 습관 체크리스트 ----------
// schedule.js의 renderDayPanel()에서 사용

function makeHabitSection(dateStr) {
  const habits = habitsOn(dateStr);
  if (!modeOn.habit || habits.length === 0) return '';

  const future = dateStr > todayStr();
  let html = `<div class="section"><h4>✅ 습관 <span class="sub">${habitDoneCount(dateStr)}/${habits.length}</span></h4>`;
  if (isRestDay(dateStr)) {
    html += `<p class="rest-note">🛡️ 바쁜 날 (바쁨 ${busyScore(dateStr)}점) · 목표 ${habitGoal(dateStr)}개만 해도 성공, 못 한 습관도 연속 기록 유지</p>`;
  }
  html += '<ul class="item-list">';

  for (const habit of habits) {
    const done = habit.isDoneOn(dateStr);
    html += `<li class="${done ? 'done' : ''}">`;
    html += `<input type="checkbox" ${done ? 'checked' : ''} ${future ? 'disabled' : ''} onclick="toggleHabit(${habit.id}, '${dateStr}')">`;
    html += `<div class="item-body"><div class="item-title">${habit.icon} ${escapeText(habit.title)}</div></div>`;
    html += '</li>';
  }
  html += '</ul></div>';
  return html;
}

// ---------- 습관 카드 : 최근 7일 표 ----------

function renderHabitCard() {
  const today = todayStr();
  let output = '';

  if (data.habits.length === 0) {
    document.getElementById('habitBoard').innerHTML = '<p class="empty">아직 습관이 없어요. + 습관을 눌러 시작해 보세요.</p>';
    return;
  }

  // 머리글 : 최근 7일 요일
  output += '<div class="habit-row head"><span class="habit-name"></span>';
  for (let n = 6; n >= 0; n--) {
    const dateStr = addDays(today, -n);
    output += `<span class="habit-day">${n === 0 ? '오늘' : WEEK_NAMES[toDate(dateStr).getDay()]}</span>`;
  }
  output += '<span class="habit-streak">연속</span><span></span></div>';

  // 습관마다 한 줄
  for (const habit of data.habits) {
    output += '<div class="habit-row">';
    output += `<span class="habit-name">${habit.icon} ${escapeText(habit.title)}</span>`;

    for (let n = 6; n >= 0; n--) {
      const dateStr = addDays(today, -n);
      if (dateStr < habit.createdDate) {
        output += '<span class="habit-day"><i class="cell none"></i></span>';
      } else {
        const done = habit.isDoneOn(dateStr);
        const style = done ? `background: ${COLORS[habit.color].code}; border-color: ${COLORS[habit.color].code};` : '';
        const rest = !done && isRestDay(dateStr) && dateStr < today; // 바쁜 날 지켜 준 칸 (extra.js)
        output += `<span class="habit-day"><i class="cell${done ? ' on' : ''}${rest ? ' rest' : ''}" style="${style}" title="${rest ? '바쁜 날 · 연속 기록 보호' : ''}" onclick="toggleHabit(${habit.id}, '${dateStr}')">${rest ? '🛡️' : ''}</i></span>`;
      }
    }

    const streak = habit.getStreak();
    output += `<span class="habit-streak" title="최고 기록 ${habit.getBestStreak()}일">${streak > 0 ? '🔥' + streak : '-'}</span>`;
    output += `<button class="icon-btn" onclick="deleteHabit(${habit.id})" title="습관 삭제">✕</button>`;
    output += '</div>';
  }

  document.getElementById('habitBoard').innerHTML = output;
}

function initHabit() {
  document.getElementById('addHabitBtn').onclick = function () { addHabit(); };
}

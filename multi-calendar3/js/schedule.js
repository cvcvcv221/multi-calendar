// =============================================
// schedule.js : 일정·과제·지출 항목 관리 (B 담당)
//  - 선택한 날짜 목록, 추가/수정/삭제 창, 되돌리기, 검색
// =============================================

let editingId = null; // null이면 추가, 숫자면 그 id를 수정 중

// ---------- 선택한 날짜 패널 ----------

function renderDayPanel() {
  const holiday = getHoliday(selectedDate);
  let title = formatDateKor(selectedDate);
  if (holiday !== '') title += ` <span class="holiday-tag">${holiday}</span>`;
  const dday = getDday(selectedDate);
  if (dday !== 0) title += ` <span class="sub">${dday > 0 ? dday + '일 후' : -dday + '일 전'}</span>`;
  document.getElementById('dayTitle').innerHTML = title;

  let output = '';
  output += makeSection('schedule', visibleOn(selectedDate, 'schedule'));
  output += makeSection('task', visibleOn(selectedDate, 'task'));
  output += makeHabitSection(selectedDate);   // habit.js
  output += makeSection('expense', visibleOn(selectedDate, 'expense'));

  if (output === '') {
    output = '<p class="empty">이 날은 비어 있어요.<br>위의 버튼으로 추가해 보세요.</p>';
  }
  document.getElementById('dayList').innerHTML = output;
}

// 종류별 묶음
function makeSection(type, list) {
  if (!modeOn[type] || list.length === 0) return '';

  let html = `<div class="section"><h4>${MODES[type].icon} ${MODES[type].label}</h4><ul class="item-list">`;
  list.forEach((ev) => {
    html += makeItem(ev);
  });
  html += '</ul>';

  if (type === 'expense') {
    html += `<p class="section-total">합계 ${formatMoney(expenseTotalOn(selectedDate))}원</p>`;
  }
  html += '</div>';
  return html;
}

// 목록 한 줄
function makeItem(ev) {
  let html = `<li class="${ev.done ? 'done' : ''}">`;

  if (ev.type === 'task') {
    html += `<input type="checkbox" ${ev.done ? 'checked' : ''} onclick="toggleDone(${ev.id})">`;
  } else if (ev.type === 'schedule') {
    html += `<span class="dot" style="background: ${COLORS[ev.color].code};"></span>`;
  } else {
    html += '<span class="dot" style="background: #9B51E0;"></span>';
  }

  html += `<div class="item-body"><div class="item-title">${makeItemTitle(ev)}</div>`;
  const sub = makeItemSub(ev);
  if (sub !== '') html += `<div class="item-sub">${sub}</div>`;
  html += '</div>';

  if (ev.type === 'task' && !ev.done && getDday(ev.date) > 0) {
    html += `<button class="icon-btn" onclick="planBackward(${ev.id})" title="거꾸로 계획 : 덜 바쁜 날에 준비 일정 자동 배치">🧭</button>`;
  }
  html += `<button class="icon-btn" onclick="openEditModal(${ev.id})" title="수정">✏️</button>`;
  html += `<button class="icon-btn" onclick="deleteEvent(${ev.id})" title="삭제">🗑️</button>`;
  html += '</li>';
  return html;
}

function makeItemTitle(ev) {
  let text = escapeText(ev.title);

  if (ev.type === 'schedule') {
    if (ev.time !== '') text = `<b>${ev.time}</b> ` + text;
    if (ev.repeat !== 'none') text += ' 🔁';
  } else if (ev.type === 'task') {
    text += ` <span class="tag ${ev.priority}">${PRIORITIES[ev.priority].name}</span>`;
    if (!ev.done) {
      const dday = getDday(ev.date);
      const late = dday < 0 ? ' late' : '';
      text += ` <span class="dday${late}">${ddayText(ev.date)}</span>`;
    }
  } else {
    text += ` <b class="money">${formatMoney(ev.amount)}원</b>`;
  }
  return text;
}

// 제목 아래 작은 설명
function makeItemSub(ev) {
  const parts = [];
  if (ev.type === 'schedule' && ev.date !== ev.endDate) {
    parts.push(formatDateKor(ev.date) + ' ~ ' + formatDateKor(ev.endDate));
  }
  if (ev.type === 'schedule' && ev.repeat !== 'none') {
    parts.push(REPEATS[ev.repeat] + ' 반복');
  }
  if (ev.type === 'expense') {
    parts.push(ev.category);
    parts.push('⏱ 알바 ' + workHoursFor(ev.amount) + '시간어치'); // extra.js
  }
  if (ev.type === 'schedule' && ev.wage > 0) {
    parts.push('💼 ' + formatMoney(ev.wage) + '원 × ' + ev.workHours + '시간 = ' + formatMoney(dayPay(ev)) + '원'); // extra.js
  }
  if (ev.type === 'task' && planItemsOf(ev.id).length > 0) {
    parts.push('🧭 준비 일정 ' + planItemsOf(ev.id).length + '개'); // smart.js
  }
  if (ev.memo !== '') {
    parts.push(escapeText(ev.memo));
  }
  return parts.join(' · ');
}

// ---------- 완료 / 삭제 / 되돌리기 ----------

function toggleDone(id) {
  const ev = findEvent(id);
  ev.done = !ev.done;
  markChanged();
  if (ev.done) showToast('🎉 "' + ev.title + '" 완료!');
  render();
}

function deleteEvent(id) {
  const removed = removeEvent(id);
  undoStack.push({ kind: 'event', item: removed });
  markChanged();
  showToast('🗑️ 삭제했어요. 상단의 되돌리기로 복구할 수 있어요.');
  render();
}

function undo() {
  if (undoStack.length === 0) return;
  const last = undoStack.pop();
  if (last.kind === 'event') {
    data.events.push(last.item);
  } else {
    data.habits.push(last.item);
  }
  markChanged();
  showToast('↩️ "' + last.item.title + '" 을(를) 되돌렸어요.');
  render();
}

// ---------- 추가/수정 창 ----------

function openAddModal(type, dateStr) {
  editingId = null;
  const ev = new CalendarItem(type);
  ev.date = dateStr || selectedDate;
  ev.endDate = ev.date;
  fillForm(ev);
  document.getElementById('modalTitle').textContent = MODES[type].icon + ' ' + MODES[type].label + ' 추가';
  showModal();
}

function openEditModal(id) {
  const ev = findEvent(id);
  editingId = id;
  fillForm(ev);
  document.getElementById('modalTitle').textContent = MODES[ev.type].icon + ' ' + MODES[ev.type].label + ' 수정';
  showModal();
}

// 항목 객체 → 입력칸
function fillForm(ev) {
  document.getElementById('fType').value = ev.type;
  document.getElementById('fTitle').value = ev.title;
  document.getElementById('fDate').value = ev.date;
  document.getElementById('fEndDate').value = ev.endDate;
  document.getElementById('fTime').value = ev.time;
  document.getElementById('fColor').value = ev.color;
  document.getElementById('fRepeat').value = ev.repeat;
  document.getElementById('fPriority').value = ev.priority;
  document.getElementById('fAmount').value = ev.amount > 0 ? ev.amount : '';
  document.getElementById('fCategory').value = ev.category;
  document.getElementById('fMemo').value = ev.memo;
  document.getElementById('fWage').value = ev.wage > 0 ? ev.wage : '';
  document.getElementById('fWorkHours').value = ev.workHours > 0 ? ev.workHours : '';
}

function showModal() {
  updateFormRows();
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// 종류에 따라 필요한 입력칸만 보이기
function updateFormRows() {
  const type = document.getElementById('fType').value;
  const rows = {
    rowEndDate: type === 'schedule',
    rowTime: type === 'schedule',
    rowColor: type === 'schedule',
    rowRepeat: type === 'schedule',
    rowWork: type === 'schedule',
    rowPriority: type === 'task',
    rowAmount: type === 'expense',
    rowCategory: type === 'expense'
  };
  for (const id in rows) {
    document.getElementById(id).style.display = rows[id] ? 'flex' : 'none';
  }

  const dateLabels = { schedule: '시작일', task: '마감일', expense: '날짜' };
  document.getElementById('labelDate').textContent = dateLabels[type];

  const placeholders = { schedule: '예) 동아리 회의', task: '예) ICT 기말 발표', expense: '예) 학식' };
  document.getElementById('fTitle').setAttribute('placeholder', placeholders[type]);
}

// 입력값 검사 (교재 8장 예외 강제 발생 : throw)
function validateItem(ev) {
  if (ev.title === '') {
    throw new Error('제목을 입력하세요.');
  }
  if (ev.date === '') {
    throw new Error('날짜를 선택하세요.');
  }

  if (ev.type === 'schedule') {
    if (ev.endDate === '') ev.endDate = ev.date;
    if (ev.endDate < ev.date) {
      throw new Error('종료일은 시작일과 같거나 뒤여야 해요.');
    }
  } else {
    // 일정이 아니면 일정 전용 값은 비운다
    ev.endDate = ev.date;
    ev.time = '';
    ev.repeat = 'none';
  }

  if (ev.type === 'expense') {
    if (!(ev.amount > 0)) {
      throw new Error('금액을 숫자로 올바르게 입력하세요.');
    }
  } else {
    ev.amount = 0;
  }

  // 알바 시급 검사 (extra.js) : 시급을 넣었으면 근무 시간도 있어야 한다
  if (ev.type !== 'schedule' || !(ev.wage > 0)) {
    ev.wage = 0;
    ev.workHours = 0;
  } else if (!(ev.workHours > 0 && ev.workHours <= 24)) {
    throw new Error('근무 시간을 0보다 크고 24 이하로 입력하세요.');
  }
}

// 저장 버튼
function saveForm() {
  const ev = new CalendarItem(document.getElementById('fType').value);
  ev.title = document.getElementById('fTitle').value;
  ev.date = document.getElementById('fDate').value;
  ev.endDate = document.getElementById('fEndDate').value;
  ev.time = document.getElementById('fTime').value;
  ev.color = document.getElementById('fColor').value;
  ev.repeat = document.getElementById('fRepeat').value;
  ev.priority = document.getElementById('fPriority').value;
  ev.amount = Number(document.getElementById('fAmount').value);
  ev.category = document.getElementById('fCategory').value;
  ev.memo = document.getElementById('fMemo').value;
  ev.wage = Number(document.getElementById('fWage').value);
  ev.workHours = Number(document.getElementById('fWorkHours').value);

  // ----- 입력 검사 : 문제가 있으면 예외를 발생시키고 catch에서 알려 준다 -----
  try {
    validateItem(ev);
  } catch (error) {
    alert(error.message);
    return;
  }

  // ----- 추가 또는 수정 -----
  if (editingId === null) {
    addEvent(ev);
    showToast(ev.type === 'expense' ? expenseToast(ev) : '✅ "' + ev.title + '" 추가했어요.');
  } else {
    const old = findEvent(editingId);
    ev.done = old.done; // 완료 상태는 유지
    for (const key in ev) {
      if (key !== 'id') old[key] = ev[key];
    }
    showToast('✏️ "' + ev.title + '" 수정했어요.');
  }

  markChanged();
  closeModal();
  selectDate(ev.date); // 저장한 날짜로 이동 + render()
}

// ---------- 검색 ----------

function onSearch(text) {
  searchText = text;
  renderSearch();
}

function renderSearch() {
  const card = document.getElementById('searchCard');
  if (searchText === '') {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  const results = data.events.filter((ev) => ev.title.indexOf(searchText) >= 0 || ev.memo.indexOf(searchText) >= 0);
  results.sort((a, b) => (a.date < b.date ? -1 : 1));

  document.getElementById('searchTitle').textContent = `🔍 "${searchText}" 검색 결과 ${results.length}개`;

  if (results.length === 0) {
    document.getElementById('searchList').innerHTML = '<p class="empty">찾는 항목이 없어요.</p>';
    return;
  }

  let output = '';
  for (let i = 0; i < results.length && i < 20; i++) {
    const ev = results[i];
    output += `<li onclick="goToDate('${ev.date}')">`;
    output += `<span class="result-date">${formatDateKor(ev.date)}</span>`;
    output += `${MODES[ev.type].icon} ${escapeText(ev.title)}</li>`;
  }
  document.getElementById('searchList').innerHTML = output;
}

// ---------- 이벤트 연결 (고전 이벤트 모델) ----------

function initSchedule() {
  // 선택 상자의 선택지를 객체·배열로 만들기
  let options = '';
  for (const key in COLORS) {
    options += `<option value="${key}">${COLORS[key].name}</option>`;
  }
  document.getElementById('fColor').innerHTML = options;

  options = '';
  for (const key in REPEATS) {
    options += `<option value="${key}">${REPEATS[key]}</option>`;
  }
  document.getElementById('fRepeat').innerHTML = options;

  options = '';
  for (const key in PRIORITIES) {
    options += `<option value="${key}">${PRIORITIES[key].name}</option>`;
  }
  document.getElementById('fPriority').innerHTML = options;

  options = '';
  CATEGORIES.forEach((name) => {
    options += `<option value="${name}">${name}</option>`;
  });
  document.getElementById('fCategory').innerHTML = options;

  document.getElementById('fType').onchange = function () { updateFormRows(); };
  document.getElementById('cancelBtn').onclick = function () { closeModal(); };
  document.getElementById('saveBtn').onclick = function () { saveForm(); };
  document.getElementById('addScheduleBtn').onclick = function () { openAddModal('schedule'); };
  document.getElementById('addTaskBtn').onclick = function () { openAddModal('task'); };
  document.getElementById('addExpenseBtn').onclick = function () { openAddModal('expense'); };
}

// =============================================
// extra.js : 멀티캘린더 1 - ⏰ 시간표 기반 팀플 시간 찾기 (작성: Claude / AI: 생성)
//  - 내 수업 시간표 + 내 일정 + 팀원 시간표를 겹쳐서 다 같이 되는 시간을 자동 추천
//  - When2meet처럼 매번 가능한 시간을 칠할 필요가 없다
//  - 팀원 시간표는 예시 데이터 (실제로는 실시간 공유로 받아 오면 된다)
// ※ 교재 범위 문법만 사용
// =============================================

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const FIND_START = 9 * 60;   // 09:00 부터
const FIND_END = 22 * 60;    // 22:00 까지
const STEP = 30;             // 30분 단위
const SCHEDULE_LENGTH = 60;  // 내 일정은 끝 시간이 없어서 1시간으로 본다

let findDuration = 90;       // 회의 길이 (분)
let selectedMembers = {};    // { 0: true, 1: true ... } 같이 할 사람

// ---------- 시간 함수 ----------

// '09:30' → 570 (분)
function toMin(time) {
  const parts = time.split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

// 570 → '09:30'
function toTime(min) {
  const hour = (min - min % 60) / 60;
  return pad(hour) + ':' + pad(min % 60);
}

// 두 구간 [a1, a2) 와 [b1, b2) 가 겹치는지
function overlap(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}

// ---------- 예시 팀원 ----------

class Member {
  constructor(name, isMe, blocks) {
    this.name = name;
    this.isMe = isMe;
    this.blocks = blocks; // 매주 반복 : { day: 1, start: '09:00', end: '10:30', title: '전자기학' }
  }

  // 그 날짜, 그 시간에 바쁜 이유 (한가하면 '')
  busyReason(dateStr, start, end) {
    const day = toDate(dateStr).getDay();
    for (const block of this.blocks) {
      if (block.day === day && overlap(start, end, toMin(block.start), toMin(block.end))) {
        return block.title;
      }
    }
    // 나는 캘린더 일정도 확인한다
    if (this.isMe) {
      for (const ev of itemsOn(dateStr)) {
        if (ev.type === 'schedule' && ev.time !== '') {
          const evStart = toMin(ev.time);
          if (overlap(start, end, evStart, evStart + SCHEDULE_LENGTH)) return ev.title;
        }
      }
    }
    return '';
  }
}

function makeSampleMembers() {
  const b = function (day, start, end, title) {
    return { day: day, start: start, end: end, title: title };
  };
  return [
    new Member('나', true, [
      b(1, '09:00', '10:30', '전자기학'), b(3, '09:00', '10:30', '전자기학'),
      b(2, '10:30', '12:00', '자료구조'), b(4, '10:30', '12:00', '자료구조'),
      b(2, '13:00', '15:00', 'ICT융합공학'), b(4, '13:00', '15:00', 'ICT융합공학'),
      b(5, '15:00', '17:00', '확률')
    ]),
    new Member('민수', false, [
      b(1, '13:00', '16:00', '회로이론'), b(3, '13:00', '16:00', '회로이론'),
      b(2, '18:00', '22:00', '알바'), b(5, '09:00', '12:00', '실험'),
      b(6, '12:00', '18:00', '알바')
    ]),
    new Member('지은', false, [
      b(1, '10:30', '12:00', '신호및시스템'), b(2, '09:00', '10:30', '영어'),
      b(4, '15:00', '18:00', '프로젝트랩'), b(3, '17:00', '21:00', '알바'),
      b(5, '13:00', '15:00', '확률'), b(0, '10:00', '14:00', '교회')
    ])
  ];
}

// 저장된 데이터의 팀원 정보(그냥 객체)를 Member 인스턴스로
function restoreMembers() {
  if (!data.members) {
    data.members = makeSampleMembers();
    return;
  }
  data.members = data.members.map((obj) => new Member(obj.name, obj.isMe, obj.blocks));
}

// ---------- 빈 시간 찾기 ----------

// 앞으로 7일 (오늘 포함)
function searchDays() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(todayStr(), i));
  }
  return days;
}

// 그 시간에 안 되는 사람 목록
function unavailableAt(dateStr, start, end) {
  const list = [];
  data.members.forEach((member, index) => {
    if (!selectedMembers[index]) return;
    const reason = member.busyReason(dateStr, start, end);
    if (reason !== '') list.push({ name: member.name, reason: reason });
  });
  return list;
}

function selectedCount() {
  let count = 0;
  for (const key in selectedMembers) {
    if (selectedMembers[key]) count++;
  }
  return count;
}

// 다 같이 되는 시간 중 좋은 순서로 3개 (하루에 하나씩)
function findBestSlots() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const candidates = [];

  searchDays().forEach((dateStr, dayIndex) => {
    for (let start = FIND_START; start + findDuration <= FIND_END; start += STEP) {
      if (dayIndex === 0 && start < nowMin + 60) continue; // 오늘은 1시간 뒤부터
      if (unavailableAt(dateStr, start, start + findDuration).length === 0) {
        // 점수가 낮을수록 좋다 : 가까운 날, 너무 이르거나 늦지 않은 시간
        let score = dayIndex * 10;
        if (start < 10 * 60) score += 4;
        if (start >= 19 * 60) score += 3;
        const weekDay = toDate(dateStr).getDay();
        if (weekDay === 0 || weekDay === 6) score += 2; // 주말은 조금 뒤로
        candidates.push({ date: dateStr, start: start, score: score });
      }
    }
  });

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.start - b.start;
  });

  // 같은 날은 하나만
  const result = [];
  const usedDays = {};
  for (const slot of candidates) {
    if (usedDays[slot.date]) continue;
    usedDays[slot.date] = true;
    result.push(slot);
    if (result.length === 3) break;
  }
  return result;
}

// 추천 시간을 내 캘린더에 회의로 추가
function addMeeting(dateStr, start) {
  const names = [];
  data.members.forEach((member, index) => {
    if (selectedMembers[index] && !member.isMe) names.push(member.name);
  });
  const item = new CalendarItem('schedule');
  item.title = '👥 팀플 회의';
  item.date = dateStr;
  item.endDate = dateStr;
  item.time = toTime(start);
  item.color = 'blue';
  item.memo = `${toTime(start)}~${toTime(start + findDuration)} · 함께: ${names.join(', ')} · 자동 추천`;
  addEvent(item);
  markChanged();
  showToast(`👥 ${formatDateKor(dateStr)} ${toTime(start)} 팀플 회의를 추가했어요.`);
  selectDate(dateStr);
}

// ---------- 내 시간표 편집 ----------

function checkClass(block) {
  if (block.title === '') throw new Error('과목 이름을 입력하세요.');
  if (block.start === '' || block.end === '') throw new Error('시작·끝 시간을 입력하세요.');
  if (block.end <= block.start) throw new Error('끝 시간은 시작 시간보다 늦어야 해요.');
}

function addMyClass() {
  const block = {
    day: Number(document.getElementById('classDay').value),
    start: document.getElementById('classStart').value,
    end: document.getElementById('classEnd').value,
    title: document.getElementById('classTitle').value
  };
  try {
    checkClass(block);
  } catch (error) {
    alert(error.message);
    return;
  }
  myself().blocks.push(block);
  markChanged();
  showToast(`📚 ${DAY_NAMES[block.day]} ${block.start} ${block.title} 추가`);
  render();
}

function deleteMyClass(index) {
  myself().blocks.splice(index, 1);
  markChanged();
  render();
}

function myself() {
  for (const member of data.members) {
    if (member.isMe) return member;
  }
  return data.members[0];
}

// ---------- 화면 ----------

function toggleMember(index) {
  selectedMembers[index] = !selectedMembers[index];
  render();
}

function setDuration(minutes) {
  findDuration = Number(minutes);
  render();
}

function renderExtra() {
  let html = '<div class="card-head"><h3>⏰ 팀플 시간 찾기</h3></div>';
  html += '<p class="lead">수업 시간표와 일정을 이미 알고 있으니, 가능한 시간을 따로 칠할 필요 없이 다 같이 되는 시간을 바로 찾아요. (팀원 시간표는 예시)</p>';

  // 사람 선택 + 회의 길이
  html += '<div class="tt-controls"><span class="sub">함께할 사람</span>';
  data.members.forEach((member, index) => {
    const on = selectedMembers[index] ? ' on' : '';
    html += `<button class="tt-member${on}" onclick="toggleMember(${index})">${member.isMe ? '🙋 ' : '👤 '}${escapeText(member.name)}</button>`;
  });
  html += '<span class="sub">회의 길이</span><select onchange="setDuration(this.value)">';
  const lengths = { 60: '1시간', 90: '1시간 30분', 120: '2시간' };
  for (const key in lengths) {
    html += `<option value="${key}" ${Number(key) === findDuration ? 'selected' : ''}>${lengths[key]}</option>`;
  }
  html += '</select></div>';

  // 추천 TOP 3
  if (selectedCount() < 2) {
    html += '<p class="empty">두 명 이상 골라 주세요.</p>';
  } else {
    const best = findBestSlots();
    if (best.length === 0) {
      html += '<p class="empty">앞으로 7일 안에 다 같이 되는 시간이 없어요. 회의 길이를 줄여 보세요.</p>';
    } else {
      html += '<div class="tt-best">';
      best.forEach((slot, index) => {
        html += `<div class="tt-slot"><span class="tt-rank">${index + 1}</span>`;
        html += `<div><b>${formatDateKor(slot.date)}</b><div class="tt-time">${toTime(slot.start)} ~ ${toTime(slot.start + findDuration)}</div></div>`;
        html += `<button class="small primary" onclick="addMeeting('${slot.date}', ${slot.start})">+ 회의 잡기</button></div>`;
      });
      html += '</div>';
    }
  }

  // 가능 인원 표 (7일 × 30분)
  html += makeAvailabilityTable();

  // 내 시간표
  html += '<details class="tt-mine"><summary>📚 내 수업 시간표 편집</summary><ul class="item-list">';
  myself().blocks.forEach((block, index) => {
    html += `<li><div class="item-body"><div class="item-title"><b>${DAY_NAMES[block.day]}</b> ${block.start}~${block.end} ${escapeText(block.title)}</div></div>`;
    html += `<button class="icon-btn" onclick="deleteMyClass(${index})" title="삭제">🗑️</button></li>`;
  });
  html += '</ul><div class="tt-add"><select id="classDay">';
  for (let d = 1; d <= 6; d++) {
    html += `<option value="${d}">${DAY_NAMES[d]}</option>`;
  }
  html += '</select><input id="classStart" type="time" value="09:00"><input id="classEnd" type="time" value="10:30">';
  html += '<input id="classTitle" type="text" placeholder="과목 이름" maxlength="20"><button class="small" onclick="addMyClass()">+ 수업</button></div></details>';

  document.getElementById('extraCard').innerHTML = html;
}

function makeAvailabilityTable() {
  const days = searchDays();
  const total = selectedCount();
  let html = '<div class="tt-table-wrap"><table class="tt-table"><tr><th></th>';
  for (const dateStr of days) {
    const date = toDate(dateStr);
    html += `<th>${date.getMonth() + 1}/${date.getDate()}<br><span class="sub">${DAY_NAMES[date.getDay()]}</span></th>`;
  }
  html += '</tr>';

  for (let start = FIND_START; start < FIND_END; start += STEP) {
    html += `<tr><td class="tt-hour">${start % 60 === 0 ? toTime(start) : ''}</td>`;
    for (const dateStr of days) {
      const busy = unavailableAt(dateStr, start, start + STEP);
      const free = total - busy.length;
      let level = 0;
      if (total > 0) {
        if (free === total) level = 3;
        else if (free * 2 >= total) level = 2;
        else if (free > 0) level = 1;
      }
      const tip = busy.length === 0 ? '모두 가능' : busy.map((x) => x.name + ': ' + x.reason).join(' / ');
      html += `<td class="tt-cell a${level}" title="${toTime(start)} · ${escapeText(tip)}"></td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  html += '<div class="tt-legend"><span><i class="tt-cell a3"></i>모두 가능</span><span><i class="tt-cell a2"></i>절반 이상</span><span><i class="tt-cell a1"></i>일부</span><span><i class="tt-cell a0"></i>아무도 안 됨</span></div></div>';
  return html;
}

function initExtra() {
  restoreMembers();
  data.members.forEach((member, index) => {
    selectedMembers[index] = true;
  });
}

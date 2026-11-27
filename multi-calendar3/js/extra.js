// =============================================
// extra.js : 멀티캘린더 3 - 💸 시간 = 돈 (작성: Claude / AI: 생성)
//  - 알바 일정에 시급과 근무 시간을 넣으면 이번 달 예상 수입을 계산
//  - 모든 지출을 "알바 몇 시간어치"로 바꿔서 보여 준다
// ※ 교재 범위 문법만 사용
// =============================================

const DEFAULT_WAGE = 10320; // 시급을 넣은 알바가 없을 때 쓰는 값 (2026년 최저시급)

// 알바 하루 급여
function dayPay(ev) {
  return Number((ev.wage * ev.workHours).toFixed(0));
}

// 보고 있는 달의 알바 기록 : 날짜마다 한 번씩
function monthWork() {
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const list = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = viewYear + '-' + pad(viewMonth + 1) + '-' + pad(d);
    for (const ev of itemsOn(dateStr)) {
      if (ev.type === 'schedule' && ev.wage > 0) {
        list.push({ date: dateStr, item: ev });
      }
    }
  }
  return list;
}

// 내 평균 시급 : 이번 달 (총 급여 ÷ 총 시간), 알바가 없으면 기본값
function myWage() {
  let pay = 0;
  let hours = 0;
  for (const work of monthWork()) {
    pay += dayPay(work.item);
    hours += work.item.workHours;
  }
  if (hours === 0) {
    // 이번 달에 없으면 아무 알바 일정의 시급
    for (const ev of data.events) {
      if (ev.wage > 0) return ev.wage;
    }
    return DEFAULT_WAGE;
  }
  return Number((pay / hours).toFixed(0));
}

// 금액 → 알바 시간 (소수 첫째 자리)
function workHoursFor(amount) {
  return (amount / myWage()).toFixed(1);
}

function expenseToast(ev) {
  return `💸 ${ev.title} ${formatMoney(ev.amount)}원 = 알바 ${workHoursFor(ev.amount)}시간어치`;
}

// ---------- 화면 ----------

function renderExtra() {
  const today = todayStr();
  const works = monthWork();
  let income = 0;
  let earned = 0;
  let hours = 0;
  for (const work of works) {
    const pay = dayPay(work.item);
    income += pay;
    hours += work.item.workHours;
    if (work.date <= today) earned += pay;
  }

  let spent = 0;
  const expenses = monthExpenses(); // money.js
  for (const ev of expenses) {
    spent += ev.amount;
  }
  const wage = myWage();
  const left = income - spent;

  let html = `<div class="card-head"><h3>💸 시간 = 돈 <span class="sub">${viewMonth + 1}월 · 내 시급 ${formatMoney(wage)}원</span></h3></div>`;

  // 큰 숫자 3개
  html += '<div class="tm-big">';
  html += `<div><div class="label">💼 예상 알바 수입</div><div class="value">${formatMoney(income)}원</div><div class="sub">${works.length}번 · ${hours}시간 · 지금까지 ${formatMoney(earned)}원</div></div>`;
  html += `<div><div class="label">💰 지출</div><div class="value">${formatMoney(spent)}원</div><div class="sub">= 알바 <b>${workHoursFor(spent)}시간</b>어치</div></div>`;
  html += `<div class="${left >= 0 ? 'plus' : 'minus'}"><div class="label">${left >= 0 ? '🟢 남는 돈' : '🔴 모자란 돈'}</div><div class="value">${left >= 0 ? '' : '-'}${formatMoney(left >= 0 ? left : -left)}원</div><div class="sub">수입 - 지출</div></div>`;
  html += '</div>';

  // 지출을 시간으로
  const sorted = [].concat(expenses); // 원본을 바꾸지 않게 복사
  sorted.sort((a, b) => b.amount - a.amount);
  if (sorted.length > 0) {
    let maxHours = Number(workHoursFor(sorted[0].amount));
    if (maxHours === 0) maxHours = 1;
    html += '<h4 class="tm-sub">⏱ 이번 달 지출을 알바 시간으로 바꾸면</h4><div class="tm-list">';
    for (let i = 0; i < sorted.length && i < 5; i++) {
      const ev = sorted[i];
      const h = workHoursFor(ev.amount);
      const width = (Number(h) / maxHours * 100).toFixed(0);
      html += `<div class="tm-row" onclick="goToDate('${ev.date}')"><span class="tm-name">${escapeText(ev.title)}</span>`;
      html += `<div class="tm-bar"><div style="width: ${width}%;"></div></div>`;
      html += `<span class="tm-hours">${h}시간</span><span class="sub">${formatMoney(ev.amount)}원</span></div>`;
    }
    html += '</div>';
  }

  // 이 돈이면? 계산기
  html += '<div class="tm-calc"><span>🤔 사고 싶은 게 있다면?</span>';
  html += '<input id="tmPrice" type="number" min="0" step="100" placeholder="가격 입력" onkeyup="updateCalc()" onchange="updateCalc()">';
  html += '<span id="tmResult" class="sub">원 = 알바 몇 시간?</span></div>';

  if (works.length === 0) {
    html += '<p class="empty">일정을 추가할 때 💼 시급과 근무 시간을 넣으면 수입이 계산돼요.</p>';
  }

  document.getElementById('extraCard').innerHTML = html;
}

// 계산기 : 입력할 때마다 결과만 바꾼다 (카드 전체를 다시 그리면 입력칸이 초기화되므로)
function updateCalc() {
  const price = Number(document.getElementById('tmPrice').value);
  const result = document.getElementById('tmResult');
  if (!(price > 0)) {
    result.innerHTML = '원 = 알바 몇 시간?';
    return;
  }
  const hours = Number(workHoursFor(price));
  let text = `원 = 알바 <b>${hours}시간</b>`;
  if (hours >= 8) {
    text += ` (하루 8시간 기준 ${(hours / 8).toFixed(1)}일)`;
  }
  result.innerHTML = text;
}

// 예시 데이터에 시급 넣기 (예시 데이터일 때만)
function addWorkSample() {
  for (const ev of data.events) {
    if (ev.title === '알바') {
      ev.wage = DEFAULT_WAGE;
      ev.workHours = 5;
    }
  }
  const item = new CalendarItem('schedule');
  item.title = '카페 알바';
  item.date = addDays(todayStr(), -26);
  item.endDate = item.date;
  item.time = '18:00';
  item.color = 'orange';
  item.repeat = 'weekly';
  item.wage = 10500;
  item.workHours = 4;
  addEvent(item);
}

function initExtra() {
  if (!serverMode) addWorkSample();
}

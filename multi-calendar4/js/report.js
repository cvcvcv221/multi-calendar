// =============================================
// report.js : 오늘 요약 & 이번 달 리포트 (C 담당)
// =============================================

// ---------- 오늘 요약 ----------

function renderSummary() {
  const today = todayStr();
  const now = new Date();
  const hour = now.getHours();
  const nowTime = pad(hour) + ':' + pad(now.getMinutes());

  let greeting = '좋은 저녁이에요 🌙';
  if (hour < 12) {
    greeting = '좋은 아침이에요 ☀️';
  } else if (hour < 18) {
    greeting = '좋은 오후예요 🌤️';
  }

  let output = `<p class="greeting">${greeting}<span class="sub">${formatDateKor(today)}</span></p>`;
  output += makeFocusHtml(); // 지금 할 일 추천 (smart.js)

  // 오늘 일정 중 다음 일정
  const schedules = itemsOn(today).filter((ev) => ev.type === 'schedule');
  const upcoming = schedules.filter((ev) => ev.time !== '' && ev.time >= nowTime);
  upcoming.sort((a, b) => (a.time < b.time ? -1 : 1));

  let scheduleText = `📅 오늘 일정 ${schedules.length}개`;
  if (upcoming.length > 0) {
    scheduleText += ` · 다음: <b>${upcoming[0].time} ${escapeText(upcoming[0].title)}</b>`;
  }
  output += `<p>${scheduleText}</p>`;

  // 7일 안에 마감인 과제 (지난 것 포함)
  const urgent = data.events.filter((ev) => ev.type === 'task' && !ev.done && getDday(ev.date) <= 7);
  urgent.sort((a, b) => (a.date < b.date ? -1 : 1));

  if (urgent.length === 0) {
    output += '<p>📝 일주일 안에 마감인 과제가 없어요.</p>';
  } else {
    output += `<p>📝 다가오는 마감 ${urgent.length}개</p><ul class="mini-list">`;
    for (let i = 0; i < urgent.length && i < 4; i++) {
      const ev = urgent[i];
      const dday = getDday(ev.date);
      let level = '';
      if (dday < 0) {
        level = 'late';
      } else if (dday <= 1) {
        level = 'hot';
      }
      output += `<li onclick="goToDate('${ev.date}')"><span class="dday ${level}">${ddayText(ev.date)}</span>${escapeText(ev.title)}</li>`;
    }
    output += '</ul>';
  }

  // 습관
  const habitTotal = habitsOn(today).length;
  if (habitTotal > 0) {
    const left = habitGoal(today) - habitDoneCount(today); // extra.js
    if (isRestDay(today)) {
      output += left > 0 ? `<p>🛡️ 바쁜 날이라 습관 <b>${left}개</b>만 하면 돼요</p>` : '<p>🛡️ 바쁜 날인데 습관 목표 달성! 👏</p>';
    } else {
      output += left > 0 ? `<p>✅ 오늘 남은 습관 ${left}개</p>` : '<p>✅ 오늘 습관 모두 완료! 👏</p>';
    }
  }

  // 지출
  output += `<p>💰 오늘 지출 ${formatMoney(expenseTotalOn(today))}원</p>`;

  document.getElementById('todaySummary').innerHTML = output;
}

// ---------- 이번 달 리포트 ----------

function renderReport() {
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = todayStr();

  let scheduleCount = 0;
  let taskCount = 0;
  let taskDone = 0;
  let habitPossible = 0;
  let habitDone = 0;
  let busiestDate = '';
  let busiestCount = 0;

  // 이번 달 1일부터 말일까지 하루씩 살펴보기
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = viewYear + '-' + pad(viewMonth + 1) + '-' + pad(d);
    const items = itemsOn(dateStr);
    let dayCount = 0;

    for (const ev of items) {
      switch (ev.type) {
        case 'schedule':
          scheduleCount++;
          dayCount++;
          break;
        case 'task':
          taskCount++;
          dayCount++;
          if (ev.done) taskDone++;
          break;
      }
    }

    if (dayCount > busiestCount) {
      busiestCount = dayCount;
      busiestDate = dateStr;
    }

    // 습관은 오늘까지만 계산
    if (dateStr <= today) {
      habitPossible += habitsOn(dateStr).length;
      habitDone += habitDoneCount(dateStr);
    }
  }

  let spent = 0;
  for (const ev of monthExpenses()) {
    spent += ev.amount;
  }

  const taskRate = taskCount === 0 ? 0 : (taskDone / taskCount * 100).toFixed(0);
  const habitRate = habitPossible === 0 ? 0 : (habitDone / habitPossible * 100).toFixed(0);

  const stats = [
    { label: '일정', value: scheduleCount + '개' },
    { label: '과제 완료', value: taskDone + ' / ' + taskCount, ring: taskRate },
    { label: '습관 달성률', value: habitRate + '%', ring: habitRate },
    { label: '총 지출', value: formatMoney(spent) + '원' },
    { label: '가장 바쁜 날', value: busiestCount === 0 ? '-' : formatDateKor(busiestDate).split(' (')[0], small: busiestCount === 0 ? '' : busiestCount + '개' }
  ];

  let output = '';
  stats.forEach((stat) => {
    output += '<div class="stat">';
    output += `<div class="label">${stat.label}</div><div class="value">${stat.value}</div>`;
    if (stat.ring !== undefined) {
      output += `<div class="mini-bar"><div style="width: ${stat.ring}%;"></div></div>`;
    }
    if (stat.small) output += `<div class="sub">${stat.small}</div>`;
    output += '</div>';
  });

  document.getElementById('reportTitle').textContent = `📊 ${viewMonth + 1}월 리포트`;
  document.getElementById('monthStats').innerHTML = output;
}

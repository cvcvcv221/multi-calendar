// =============================================
// money.js : 이번 달 지출 & 예산 (C 담당)
// =============================================

// 보고 있는 달의 지출 항목
function monthExpenses() {
  const ym = viewYear + '-' + pad(viewMonth + 1); // '2026-11'
  return data.events.filter((ev) => ev.type === 'expense' && ev.date.slice(0, 7) === ym);
}

function renderMoneyCard() {
  const list = monthExpenses();

  // 분류별 합계를 객체에 모으기
  const totals = {};
  let total = 0;
  for (const name of CATEGORIES) {
    totals[name] = 0;
  }
  for (const ev of list) {
    totals[ev.category] += ev.amount;
    total += ev.amount;
  }

  // ----- 예산 막대 -----
  let percent = data.budget > 0 ? (total / data.budget * 100) : 0;
  const over = total > data.budget;
  const barWidth = percent > 100 ? 100 : percent;

  let output = '<div class="budget">';
  output += `<div class="budget-top"><b>${formatMoney(total)}원</b><span class="sub"> / 예산 ${formatMoney(data.budget)}원</span></div>`;
  output += `<div class="bar"><div class="bar-fill${over ? ' over' : ''}" style="width: ${barWidth.toFixed(1)}%;"></div></div>`;

  if (over) {
    output += `<p class="warn">⚠️ 예산을 ${formatMoney(total - data.budget)}원 넘었어요!</p>`;
  } else {
    output += `<p class="sub">${percent.toFixed(0)}% 사용 · 남은 돈 ${formatMoney(data.budget - total)}원</p>`;
  }
  output += '</div>';
  output += makePaceHtml(total); // 지출 페이스 (smart.js)

  // ----- 분류별 막대그래프 (많이 쓴 순서) -----
  const rows = [];
  for (const name in totals) {
    if (totals[name] > 0) rows.push({ name: name, amount: totals[name] });
  }
  rows.sort((a, b) => b.amount - a.amount);

  if (rows.length === 0) {
    output += '<p class="empty">이번 달 지출 기록이 없어요.</p>';
  } else {
    const max = rows[0].amount;
    output += '<div class="cat-chart">';
    rows.forEach((row) => {
      const width = (row.amount / max * 100).toFixed(1);
      output += '<div class="cat-row">';
      output += `<span class="cat-name">${row.name}</span>`;
      output += `<div class="cat-bar"><div style="width: ${width}%;"></div></div>`;
      output += `<span class="cat-amount">${formatMoney(row.amount)}</span>`;
      output += '</div>';
    });
    output += '</div>';
  }

  document.getElementById('moneyBoard').innerHTML = output;
}

// 예산 변경 (window 객체의 prompt 함수)
function setBudget() {
  const input = prompt('한 달 예산을 입력하세요. (숫자만)', data.budget);
  if (input === null) return;

  const budget = Number(input);
  if (!(budget > 0)) {
    alert('0보다 큰 숫자를 입력하세요.');
    return;
  }
  data.budget = budget;
  markChanged();
  showToast('💰 예산을 ' + formatMoney(budget) + '원으로 바꿨어요.');
  render();
}

function initMoney() {
  document.getElementById('budgetBtn').onclick = function () { setBudget(); };
}

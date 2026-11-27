// =============================================
// data.js : 모든 팀원이 함께 쓰는 공통 데이터 & 함수
// ※ 데이터 모양(속성 이름)을 바꿀 때는 반드시 팀원과 상의!
// =============================================

// ---------- 상수 (객체와 배열) ----------

const MODES = {
  schedule: { label: '일정', icon: '📅', color: '#4F8EF7' },
  task: { label: '과제·시험', icon: '📝', color: '#F2994A' },
  habit: { label: '습관', icon: '✅', color: '#27AE60' },
  expense: { label: '지출', icon: '💰', color: '#9B51E0' }
};

const COLORS = {
  blue: { name: '파랑', code: '#4F8EF7' },
  green: { name: '초록', code: '#27AE60' },
  orange: { name: '주황', code: '#F2994A' },
  red: { name: '빨강', code: '#EB5757' },
  purple: { name: '보라', code: '#9B51E0' },
  gray: { name: '회색', code: '#828282' }
};

const PRIORITIES = {
  high: { name: '높음', order: 0 },
  normal: { name: '보통', order: 1 },
  low: { name: '낮음', order: 2 }
};

const REPEATS = { none: '반복 안 함', weekly: '매주', monthly: '매월' };

const CATEGORIES = ['식비', '카페·간식', '교통', '교재·학용품', '쇼핑', '기타'];

const HABIT_ICONS = ['🏃', '💧', '📚', '🧘', '🛏️', '✍️', '🥗', '🎸'];
const HABIT_COLORS = ['green', 'blue', 'orange', 'purple', 'red', 'gray'];

const WEEK_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 매년 같은 날짜의 공휴일 ('월-일')
const HOLIDAYS_FIXED = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절'
};

// 해마다 날짜가 바뀌는 공휴일 (2026년 기준, 필요하면 다음 해 추가)
const HOLIDAYS_YEAR = {
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-02': '대체공휴일',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-03': '지방선거',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-05': '대체공휴일'
};

// ---------- 핵심 데이터 (저장되는 것은 이 객체 하나) ----------

let data = {
  events: [],     // 일정·과제·지출 항목 (CalendarItem 인스턴스)
  habits: [],     // 습관 (Habit 인스턴스)
  habitLogs: {},  // { '2026-11-26': [1, 3] } → 그날 완료한 습관 id 목록
  budget: 300000, // 한 달 예산
  nextId: 1,      // 다음에 쓸 id 번호
  theme: 'light', // 'light' 또는 'dark'
  lastDate: ''    // 마지막으로 보던 날짜
};

// ---------- 화면 상태 (저장하지 않음) ----------

let modeOn = { schedule: true, task: true, habit: true, expense: true };
let viewMode = 'month';  // 'month' 또는 'week'
let viewYear = 0;
let viewMonth = 0;       // 0 ~ 11
let selectedDate = '';
let searchText = '';
let undoStack = [];      // 되돌리기용 : 삭제한 항목을 쌓아 둔다
let changeCount = 0;     // 저장하지 않은 변경 수
let serverMode = false;  // 서버로 실행했는지

// ---------- 날짜 함수 ----------

// 한 자리 숫자 앞에 0 붙이기 : 3 → '03'
function pad(number) {
  return number < 10 ? '0' + number : '' + number;
}

// Date 객체 → '2026-11-26'
function toDateStr(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

// '2026-11-26' → Date 객체
function toDate(dateStr) {
  const parts = dateStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function todayStr() {
  return toDateStr(new Date());
}

// 두 날짜 사이의 날 수 (b - a)
function dayDiff(a, b) {
  const oneDay = 1000 * 60 * 60 * 24;
  return (toDate(b).getTime() - toDate(a).getTime()) / oneDay;
}

// 오늘 기준 D-day (0 = 오늘, 양수 = 남은 날, 음수 = 지난 날)
function getDday(dateStr) {
  return dayDiff(todayStr(), dateStr);
}

// 날짜에 n일 더하기
function addDays(dateStr, n) {
  const date = toDate(dateStr);
  date.setDate(date.getDate() + n);
  return toDateStr(date);
}

// '2026-11-26' → '11월 26일 (목)'
function formatDateKor(dateStr) {
  const date = toDate(dateStr);
  return (date.getMonth() + 1) + '월 ' + date.getDate() + '일 (' + WEEK_NAMES[date.getDay()] + ')';
}

// D-day 글자
function ddayText(dateStr) {
  const dday = getDday(dateStr);
  if (dday === 0) return 'D-DAY';
  if (dday > 0) return 'D-' + dday;
  return 'D+' + (-dday);
}

// 공휴일 이름 (없으면 '')
function getHoliday(dateStr) {
  return HOLIDAYS_YEAR[dateStr] || HOLIDAYS_FIXED[dateStr.slice(5)] || '';
}

// ---------- 문자열 함수 ----------

// 32000 → '32,000'
function formatMoney(number) {
  const text = '' + number;
  let result = '';
  let count = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    result = text.charAt(i) + result;
    count++;
    if (count % 3 === 0 && i > 0) {
      result = ',' + result;
    }
  }
  return result;
}

// 입력한 글자에 <, > 가 있어도 태그로 바뀌지 않게 처리 (innerHTML 보안)
function escapeText(text) {
  return text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
}

// 배열 안에 값이 있는지 확인
function inList(list, value) {
  for (const item of list) {
    if (item === value) return true;
  }
  return false;
}

// ---------- 클래스 (교재 6장 객체 - 클래스) ----------

// 일정·과제·지출 항목 하나를 나타내는 클래스
// 모든 항목이 같은 속성을 가지게 해서 다루기 쉽게 만든다
class CalendarItem {
  constructor(type) {
    this.id = 0;
    this.type = type;          // 'schedule' | 'task' | 'expense'
    this.title = '';
    this.date = '';            // 일정: 시작일, 과제: 마감일, 지출: 날짜
    this.endDate = '';         // 일정: 종료일
    this.time = '';            // 일정: 시작 시간 '18:00'
    this.color = 'blue';       // 일정: 색상
    this.repeat = 'none';      // 일정: 'none' | 'weekly' | 'monthly'
    this.done = false;         // 과제: 완료 여부
    this.priority = 'normal';  // 과제: 'high' | 'normal' | 'low'
    this.amount = 0;           // 지출: 금액
    this.category = '식비';    // 지출: 분류
    this.memo = '';
  }

  // 여러 날 일정의 길이 (0이면 하루 일정)
  getLength() {
    return dayDiff(this.date, this.endDate);
  }

  // 마감이 하루 이내로 남은 미완료 과제인지
  isUrgent() {
    if (this.type !== 'task' || this.done) return false;
    const dday = getDday(this.date);
    return dday >= 0 && dday <= 1;
  }

  // 매월 반복 일정이 (year, month)에 시작하는 날짜
  // 31일 일정은 31일이 없는 달에는 그 달 마지막 날로
  monthlyStart(year, month) {
    const day = toDate(this.date).getDate();
    const last = new Date(year, month + 1, 0).getDate();
    return toDateStr(new Date(year, month, day > last ? last : day));
  }

  // 이 항목이 dateStr 날짜에 보여야 하는지
  occursOn(dateStr) {
    if (this.type !== 'schedule') {
      return this.date === dateStr;
    }
    if (dateStr < this.date) return false;

    const length = this.getLength();

    switch (this.repeat) {
      case 'none':
        return dateStr <= this.endDate;
      case 'weekly':
        return dayDiff(this.date, dateStr) % 7 <= length;
      case 'monthly': {
        // 이번 달 또는 지난달에 시작한 반복이 오늘까지 이어지는지 확인
        const target = toDate(dateStr);
        for (let back = 0; back <= 1; back++) {
          const start = this.monthlyStart(target.getFullYear(), target.getMonth() - back);
          if (start >= this.date && start <= dateStr && dayDiff(start, dateStr) <= length) {
            return true;
          }
        }
        return false;
      }
    }
    return false;
  }
}

// 습관 하나를 나타내는 클래스
class Habit {
  constructor(id, title, icon, color, createdDate) {
    this.id = id;
    this.title = title;
    this.icon = icon;
    this.color = color;
    this.createdDate = createdDate; // 이 날 이전은 계산하지 않는다
  }

  // 그날 완료했는지
  isDoneOn(dateStr) {
    const list = data.habitLogs[dateStr];
    if (!list) return false;
    return inList(list, this.id);
  }

  // 연속 달성 일수 : 오늘(아직 안 했으면 어제)부터 거꾸로 세다가 끊기면 멈춘다
  getStreak() {
    let count = 0;
    let dateStr = todayStr();
    if (!this.isDoneOn(dateStr)) {
      dateStr = addDays(dateStr, -1);
    }
    while (this.isDoneOn(dateStr)) {
      count++;
      dateStr = addDays(dateStr, -1);
    }
    return count;
  }

  // 지금까지 가장 길었던 연속 기록
  getBestStreak() {
    let best = 0;
    let current = 0;
    let dateStr = this.createdDate;
    const today = todayStr();
    while (dateStr <= today) {
      if (this.isDoneOn(dateStr)) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
      dateStr = addDays(dateStr, 1);
    }
    return best;
  }
}

// 저장된 데이터(그냥 객체)를 클래스의 인스턴스로 다시 만든다
// JSON으로 저장하면 속성만 남고 메소드는 사라지기 때문
function restoreData(saved) {
  data = saved;
  data.events = saved.events.map((obj) => {
    const item = new CalendarItem(obj.type);
    for (const key in obj) {
      item[key] = obj[key];
    }
    return item;
  });
  data.habits = saved.habits.map((obj) => new Habit(obj.id, obj.title, obj.icon, obj.color, obj.createdDate));
}

// ---------- 항목 함수 ----------

function addEvent(item) {
  item.id = data.nextId;
  data.nextId++;
  data.events.push(item);
}

function findEvent(id) {
  for (const item of data.events) {
    if (item.id === id) return item;
  }
  return null;
}

function findHabit(id) {
  for (const habit of data.habits) {
    if (habit.id === id) return habit;
  }
  return null;
}

// 배열에서 꺼내고, 꺼낸 항목을 돌려준다 (되돌리기에 사용)
function removeEvent(id) {
  for (let i = 0; i < data.events.length; i++) {
    if (data.events[i].id === id) {
      return data.events.splice(i, 1)[0];
    }
  }
  return null;
}

// 그날의 모든 항목 (모드 상관없이)
function itemsOn(dateStr) {
  return data.events.filter((item) => item.occursOn(dateStr));
}

// 그날 항목 중 켜진 모드 + 원하는 종류만, 보기 좋은 순서로
function visibleOn(dateStr, type) {
  const list = data.events.filter((item) => item.type === type && modeOn[type] && item.occursOn(dateStr));

  list.sort((a, b) => {
    if (type === 'schedule') {
      // 여러 날 일정 → 종일 일정 → 시간순
      if (a.getLength() !== b.getLength()) return b.getLength() - a.getLength();
      if (a.time === b.time) return a.id - b.id;
      return a.time < b.time ? -1 : 1;
    }
    if (type === 'task') {
      // 안 한 것 먼저 → 중요도 순
      if (a.done !== b.done) return a.done ? 1 : -1;
      return PRIORITIES[a.priority].order - PRIORITIES[b.priority].order;
    }
    return a.id - b.id;
  });
  return list;
}

// 그날 지출 합계
function expenseTotalOn(dateStr) {
  let total = 0;
  for (const item of data.events) {
    if (item.type === 'expense' && item.date === dateStr) total += item.amount;
  }
  return total;
}

// ---------- 습관 함수 ----------

// 그날 존재하던 습관 (만든 날 이후)
function habitsOn(dateStr) {
  return data.habits.filter((habit) => habit.createdDate <= dateStr);
}

// 그날 완료한 습관 수
function habitDoneCount(dateStr) {
  let count = 0;
  for (const habit of habitsOn(dateStr)) {
    if (habit.isDoneOn(dateStr)) count++;
  }
  return count;
}

// ---------- 화면 메시지 ----------

let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.style.opacity = '0';
  }, 2200);
}

// 데이터가 바뀔 때마다 호출
function markChanged() {
  changeCount++;
}

// ---------- 시연용 예시 데이터 ----------

function makeSampleData() {
  const today = todayStr();
  const day = function (n) {
    return addDays(today, n);
  };

  const sample = function (type, values) {
    const item = new CalendarItem(type);
    for (const key in values) {
      item[key] = values[key];
    }
    if (item.endDate === '') item.endDate = item.date;
    addEvent(item);
  };

  // 일정
  sample('schedule', { title: '동아리 회의', date: day(0), time: '18:00', color: 'green' });
  sample('schedule', { title: 'ICT 팀플 회의', date: day(-7), time: '15:00', color: 'blue', repeat: 'weekly', memo: '도서관 스터디룸' });
  sample('schedule', { title: '학과 MT', date: day(9), endDate: day(10), color: 'purple' });
  sample('schedule', { title: '알바', date: day(2), endDate: day(3), time: '10:00', color: 'orange' });
  sample('schedule', { title: '통신비 자동이체', date: day(-20), color: 'gray', repeat: 'monthly' });

  // 과제·시험
  sample('task', { title: '확률 과제 제출', date: day(1), priority: 'normal', memo: 'e캠퍼스 제출' });
  sample('task', { title: '전자기학 기말고사', date: day(6), priority: 'high' });
  sample('task', { title: 'ICT 기말 발표', date: day(14), priority: 'high', memo: 'PPT + 시연' });
  sample('task', { title: '자료구조 실습 보고서', date: day(-1), priority: 'low', done: true });

  // 지출
  sample('expense', { title: '학식', date: day(0), amount: 5500, category: '식비' });
  sample('expense', { title: '아메리카노', date: day(0), amount: 2500, category: '카페·간식' });
  sample('expense', { title: '버스 충전', date: day(-1), amount: 10000, category: '교통' });
  sample('expense', { title: '전공 교재', date: day(-3), amount: 32000, category: '교재·학용품' });
  sample('expense', { title: '친구랑 저녁', date: day(-4), amount: 15000, category: '식비' });

  // 습관 : 2주 전에 만들었다고 가정
  const habitTitles = ['운동 30분', '물 2L 마시기', '전공 공부 1시간'];
  for (let i = 0; i < habitTitles.length; i++) {
    data.habits.push(new Habit(data.nextId, habitTitles[i], HABIT_ICONS[i], HABIT_COLORS[i], day(-14)));
    data.nextId++;
  }

  // 습관 기록 : 최근 며칠 동안 띄엄띄엄 완료
  const pattern = [[0, 1], [0, 1, 2], [0, 2], [1], [0, 1, 2], [0, 1], [2]];
  for (let n = 1; n <= pattern.length; n++) {
    const ids = [];
    for (const index of pattern[n - 1]) {
      ids.push(data.habits[index].id);
    }
    data.habitLogs[day(-n)] = ids;
  }
  data.habitLogs[today] = [data.habits[1].id];
}

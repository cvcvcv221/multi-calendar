// =============================================
// transit.js : 🚆 기차 시간표 · 🚌 버스 실시간 도착 (작성: Claude / AI: 생성)
//  - 서버(transit-api.js)가 공공데이터포털 TAGO API를 대신 불러 준다
//  - fetch를 쓰지 않고, 숨은 iframe의 주소(src)를 바꿔서 서버에 요청한다
//    → 서버가 돌려준 <script>가 parent.onApiResult(이름, 오류, 결과)를 부른다
//  - npm start로 실행했을 때만 동작 (GitHub Pages에서는 안내만 표시)
// =============================================

const transit = {
  tab: 'train',
  error: '',
  loading: false,
  // 기차
  trainCities: [],
  stations: {},     // stations[시도코드] = [{ nodeid, nodename }]
  depCity: '',
  depStation: '',
  arrCity: '',
  arrStation: '',
  trains: [],
  searched: false,
  // 버스
  busCities: [],
  busCity: '',
  stopName: '',
  stops: [],
  arrivals: [],
  arrivalsTime: ''
};

// ---------- 서버 요청 줄 세우기 (iframe이 하나라서 한 번에 하나씩) ----------

const apiQueue = [];
let apiCurrent = null;
let apiTimer = null;

function callApi(path, tag) {
  const mark = path.indexOf('?') >= 0 ? '&' : '?';
  apiQueue.push({ url: path + mark + 'tag=' + tag + '&t=' + Date.now(), tag: tag });
  if (apiCurrent === null) nextApi();
}

function nextApi() {
  if (apiQueue.length === 0) {
    apiCurrent = null;
    transit.loading = false;
    return;
  }
  apiCurrent = apiQueue.shift();
  transit.loading = true;
  document.getElementById('apiFrame').src = apiCurrent.url;
  // 10초 안에 답이 없으면 실패로 처리
  apiTimer = setTimeout(function () {
    onApiResult(apiCurrent.tag, '서버가 응답하지 않아요. npm start로 실행 중인지 확인하세요.', []);
  }, 10000);
}

// 서버가 돌려준 <script>가 부르는 함수
function onApiResult(tag, error, items) {
  clearTimeout(apiTimer);
  transit.error = error === null ? '' : error;
  if (error === null) handleResult(tag, items);
  nextApi();
  renderTransit();
}

// 이름에 글자가 들어간 항목 찾기 (없으면 첫 번째)
function findByName(list, nameKey, codeKey, words) {
  for (const word of words) {
    for (const item of list) {
      if (String(item[nameKey]).indexOf(word) >= 0) return String(item[codeKey]);
    }
  }
  return list.length > 0 ? String(list[0][codeKey]) : '';
}

function handleResult(tag, items) {
  if (tag === 'trainCities') {
    transit.trainCities = items;
    const saved = data.trainRoute || {};
    transit.depCity = saved.depCity || findByName(items, 'cityname', 'citycode', ['경상남']);
    transit.arrCity = saved.arrCity || findByName(items, 'cityname', 'citycode', ['서울']);
    loadStations('dep');
    loadStations('arr');
  } else if (tag === 'stationsDep' || tag === 'stationsArr') {
    const side = tag === 'stationsDep' ? 'dep' : 'arr';
    transit.stations[transit[side + 'City']] = items;
    pickDefaultStation(side);
  } else if (tag === 'trains') {
    items.sort((a, b) => (String(a.depplandtime) < String(b.depplandtime) ? -1 : 1));
    transit.trains = items;
    transit.searched = true;
  } else if (tag === 'busCities') {
    transit.busCities = items;
    transit.busCity = data.busStop ? data.busStop.city : findByName(items, 'cityname', 'citycode', ['창원']);
  } else if (tag === 'busStops') {
    transit.stops = items;
    if (items.length === 0) transit.error = `"${transit.stopName}" 정류장을 찾지 못했어요.`;
  } else if (tag === 'busArrivals') {
    items.sort((a, b) => Number(a.arrtime) - Number(b.arrtime));
    transit.arrivals = items;
    const now = new Date();
    transit.arrivalsTime = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  }
}

// ---------- 🚆 기차 ----------

function loadStations(side) {
  const city = transit[side + 'City'];
  if (city === '') return;
  if (transit.stations[city]) {
    pickDefaultStation(side);
    return;
  }
  callApi('/api/train/stations?city=' + city, side === 'dep' ? 'stationsDep' : 'stationsArr');
}

function pickDefaultStation(side) {
  const list = transit.stations[transit[side + 'City']] || [];
  const saved = data.trainRoute || {};
  const savedId = side === 'dep' ? saved.dep : saved.arr;
  for (const station of list) {
    if (station.nodeid === savedId) {
      transit[side + 'Station'] = savedId;
      return;
    }
  }
  const words = side === 'dep' ? ['창원중앙', '창원', '마산'] : ['서울', '용산'];
  transit[side + 'Station'] = findByName(list, 'nodename', 'nodeid', words);
}

function changeTrainCity(side, value) {
  transit[side + 'City'] = value;
  transit[side + 'Station'] = '';
  loadStations(side);
  renderTransit();
}

function changeStation(side, value) {
  transit[side + 'Station'] = value;
}

function searchTrains() {
  if (transit.depStation === '' || transit.arrStation === '') {
    alert('출발역과 도착역을 골라 주세요.');
    return;
  }
  if (transit.depStation === transit.arrStation) {
    alert('출발역과 도착역이 같아요.');
    return;
  }
  // 다음에 열 때를 위해 기억 (저장 버튼을 누르면 data.json에 남는다)
  data.trainRoute = { depCity: transit.depCity, dep: transit.depStation, arrCity: transit.arrCity, arr: transit.arrStation };
  markChanged();
  const date = selectedDate.split('-').join('');
  callApi(`/api/train/search?dep=${transit.depStation}&arr=${transit.arrStation}&date=${date}`, 'trains');
  renderTransit();
}

// 20261128061000 → '06:10'
function trainTime(value) {
  const text = String(value);
  return text.substring(8, 10) + ':' + text.substring(10, 12);
}

function addTrainSchedule(index) {
  const train = transit.trains[index];
  const item = new CalendarItem('schedule');
  item.title = `🚆 ${train.traingradename} ${train.depplacename}→${train.arrplacename}`;
  item.date = selectedDate;
  item.endDate = selectedDate;
  item.time = trainTime(train.depplandtime);
  item.color = 'blue';
  item.memo = `열차 ${train.trainno} · 도착 ${trainTime(train.arrplandtime)}`;
  if (train.adultcharge) item.memo += ` · ${formatMoney(Number(train.adultcharge))}원`;
  addEvent(item);
  markChanged();
  showToast(`🚆 ${item.time} ${train.traingradename} 일정을 추가했어요.`);
  render();
}

// ---------- 🚌 버스 ----------

function changeBusCity(value) {
  transit.busCity = value;
  transit.stops = [];
}

function searchStops() {
  transit.stopName = document.getElementById('stopName').value.trim();
  if (transit.stopName === '') {
    alert('정류장 이름을 입력하세요.');
    return;
  }
  callApi(`/api/bus/stops?city=${transit.busCity}&name=${transit.stopName}`, 'busStops');
  renderTransit();
}

function chooseStop(index) {
  const stop = transit.stops[index];
  data.busStop = { city: transit.busCity, node: stop.nodeid, name: stop.nodenm };
  markChanged();
  transit.stops = [];
  loadArrivals();
}

function loadArrivals() {
  if (!data.busStop) return;
  callApi(`/api/bus/arrivals?city=${data.busStop.city}&node=${data.busStop.node}`, 'busArrivals');
  renderTransit();
}

// 초 → '7분' / '곧 도착'
function arrivalText(seconds) {
  const sec = Number(seconds);
  if (sec < 60) return '곧 도착';
  return ((sec - sec % 60) / 60) + '분';
}

// ---------- 화면 ----------

function setTransitTab(tab) {
  transit.tab = tab;
  if (tab === 'bus' && transit.busCities.length === 0) {
    callApi('/api/bus/cities', 'busCities');
    if (data.busStop) loadArrivals();
  }
  renderTransit();
}

function makeSelect(list, codeKey, nameKey, value, onchange) {
  let html = `<select onchange="${onchange}">`;
  if (list.length === 0) html += '<option value="">불러오는 중…</option>';
  for (const item of list) {
    const code = String(item[codeKey]);
    html += `<option value="${escapeText(code)}" ${code === value ? 'selected' : ''}>${escapeText(String(item[nameKey]))}</option>`;
  }
  return html + '</select>';
}

function renderTransit() {
  let html = '<div class="card-head"><h3>🚆 교통 정보 <span class="sub">공공데이터포털 TAGO · 실시간</span></h3>';
  html += '<div class="segmented">';
  html += `<button class="seg${transit.tab === 'train' ? ' on' : ''}" onclick="setTransitTab('train')">🚆 기차</button>`;
  html += `<button class="seg${transit.tab === 'bus' ? ' on' : ''}" onclick="setTransitTab('bus')">🚌 버스</button>`;
  html += '</div></div>';

  if (!serverMode) {
    html += '<p class="empty">🔌 기차 시간표와 버스 도착 정보는 <b>npm start</b>로 실행했을 때만 볼 수 있어요. (API 키를 서버가 갖고 있어서)</p>';
    document.getElementById('transitCard').innerHTML = html;
    return;
  }

  if (transit.error !== '') html += `<p class="tr-error">⚠️ ${escapeText(transit.error)}</p>`;
  if (transit.loading) html += '<p class="sub">⏳ 불러오는 중…</p>';

  html += transit.tab === 'train' ? makeTrainHtml() : makeBusHtml();
  document.getElementById('transitCard').innerHTML = html;
}

function makeTrainHtml() {
  const depList = transit.stations[transit.depCity] || [];
  const arrList = transit.stations[transit.arrCity] || [];
  let html = '<div class="tr-form">';
  html += '<span class="tr-label">출발</span>' + makeSelect(transit.trainCities, 'citycode', 'cityname', transit.depCity, "changeTrainCity('dep', this.value)");
  html += makeSelect(depList, 'nodeid', 'nodename', transit.depStation, "changeStation('dep', this.value)");
  html += '<span class="tr-arrow">→</span>';
  html += '<span class="tr-label">도착</span>' + makeSelect(transit.trainCities, 'citycode', 'cityname', transit.arrCity, "changeTrainCity('arr', this.value)");
  html += makeSelect(arrList, 'nodeid', 'nodename', transit.arrStation, "changeStation('arr', this.value)");
  html += `<button class="small primary" onclick="searchTrains()">${formatDateKor(selectedDate)} 시간표</button>`;
  html += '</div><p class="sub">날짜는 달력에서 고른 날이에요. 열차를 누르면 그날 일정으로 들어가요.</p>';

  if (transit.searched) {
    if (transit.trains.length === 0) {
      html += '<p class="empty">이 날짜에 다니는 열차가 없어요.</p>';
    } else {
      html += '<ul class="tr-list">';
      transit.trains.forEach((train, index) => {
        html += `<li><span class="tr-grade">${escapeText(String(train.traingradename))}</span>`;
        html += `<b>${trainTime(train.depplandtime)}</b> ${escapeText(String(train.depplacename))} → <b>${trainTime(train.arrplandtime)}</b> ${escapeText(String(train.arrplacename))}`;
        if (train.adultcharge) html += ` <span class="sub">${formatMoney(Number(train.adultcharge))}원</span>`;
        html += `<button class="small" onclick="addTrainSchedule(${index})">+ 일정</button></li>`;
      });
      html += '</ul>';
    }
  }
  return html;
}

function makeBusHtml() {
  let html = '<div class="tr-form">';
  html += makeSelect(transit.busCities, 'citycode', 'cityname', transit.busCity, 'changeBusCity(this.value)');
  html += `<input id="stopName" type="text" placeholder="정류장 이름 (예: 창원대)" value="${escapeText(transit.stopName)}" onkeyup="if (event.key === 'Enter') searchStops()">`;
  html += '<button class="small" onclick="searchStops()">🔍 찾기</button></div>';

  if (transit.stops.length > 0) {
    html += '<p class="sub">정류장을 고르세요 (방향마다 따로 있어요)</p><div class="tr-stops">';
    transit.stops.forEach((stop, index) => {
      html += `<button class="small" onclick="chooseStop(${index})">${escapeText(String(stop.nodenm))} <span class="sub">${escapeText(String(stop.nodeno || ''))}</span></button>`;
    });
    html += '</div>';
  }

  if (data.busStop) {
    html += `<div class="tr-stop-head"><b>📍 ${escapeText(data.busStop.name)}</b>`;
    html += `<span class="sub">${transit.arrivalsTime === '' ? '' : transit.arrivalsTime + ' 기준'}</span>`;
    html += '<button class="small" onclick="loadArrivals()">🔄 새로고침</button></div>';
    if (transit.arrivals.length === 0) {
      html += '<p class="empty">지금 오는 버스 정보가 없어요.</p>';
    } else {
      html += '<ul class="tr-list">';
      for (const bus of transit.arrivals) {
        html += `<li><span class="tr-bus">${escapeText(String(bus.routeno))}</span>`;
        html += `<b>${arrivalText(bus.arrtime)}</b> <span class="sub">${bus.arrprevstationcnt}정류장 전 · ${escapeText(String(bus.vehicletp || ''))}</span></li>`;
      }
      html += '</ul>';
    }
  }
  return html;
}

function initTransit() {
  if (serverMode) callApi('/api/train/cities', 'trainCities');
  renderTransit();
}

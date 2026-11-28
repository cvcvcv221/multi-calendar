// =============================================
// transit-api.js : 기차·버스 실시간 정보 (작성: Claude / AI: 생성)
//  - 공공데이터포털 국토교통부 TAGO API를 서버에서 대신 불러 온다
//  - API 키는 .env 파일에서 읽는다 (.gitignore에 있어서 GitHub에 안 올라감)
//  - 웹페이지는 fetch 대신 숨은 iframe으로 /api/... 주소를 열고,
//    서버는 parent.onApiResult(...)를 부르는 <script>를 돌려준다
// server.js에서 require('./transit-api')(app); 으로 연결
// =============================================

const https = require('https');
const fs = require('fs');

// ---------- .env 읽기 : "이름=값" 한 줄씩 ----------
function readEnv() {
  const env = {};
  try {
    const lines = fs.readFileSync(__dirname + '/.env', 'utf8').split('\n');
    for (const line of lines) {
      const index = line.indexOf('=');
      if (index > 0 && line.trim()[0] !== '#') {
        env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
      }
    }
  } catch (error) {
    // .env 파일이 없음
  }
  return env;
}

const API_KEY = readEnv().TAGO_API_KEY || '';
const BASE = 'https://apis.data.go.kr/1613000/';

// ---------- TAGO API 호출 → callback(오류메시지, 항목배열) ----------
function callTago(path, params, callback) {
  if (API_KEY === '') {
    callback('.env 파일에 TAGO_API_KEY가 없어요.', []);
    return;
  }
  // 키는 포털의 "일반 인증키(Encoding)"를 그대로 사용
  let url = BASE + path + '?serviceKey=' + API_KEY + '&_type=json&numOfRows=200&pageNo=1';
  for (const key in params) {
    url += '&' + key + '=' + encodeURIComponent(params[key]);
  }

  https.get(url, (res) => {
    let text = '';
    res.on('data', (chunk) => { text += chunk; });
    res.on('end', () => {
      // 키 오류 등은 JSON이 아니라 XML로 온다
      if (text.indexOf('<returnAuthMsg>') >= 0 || text.indexOf('<errMsg>') >= 0) {
        const match = text.match(/<returnAuthMsg>([^<]*)</);
        callback('API 키 오류 : ' + (match ? match[1] : text.slice(0, 120)) + ' (활용신청 승인 여부를 확인하세요)', []);
        return;
      }
      try {
        const json = JSON.parse(text);
        const header = json.response.header;
        if (header.resultCode !== '00') {
          callback('API 오류 : ' + header.resultMsg, []);
          return;
        }
        const body = json.response.body;
        let items = body.items && body.items.item ? body.items.item : [];
        if (!Array.isArray(items)) items = [items]; // 결과가 1개면 배열이 아니라 객체로 온다
        callback(null, items);
      } catch (error) {
        callback('응답을 읽지 못했어요 : ' + text.slice(0, 120), []);
      }
    });
  }).on('error', (error) => {
    callback('API 서버에 연결하지 못했어요 : ' + error.message, []);
  });
}

// ---------- iframe으로 결과 보내기 ----------
function sendToPage(response, tag, error, items) {
  // </script>가 데이터 안에 있어도 깨지지 않게
  const safe = (value) => JSON.stringify(value).split('</').join('<\\/');
  response.type('html');
  response.send(`<script>parent.onApiResult(${safe(tag)}, ${safe(error)}, ${safe(items)});</script>`);
}

// 요청마다 tag(결과 이름)는 영문·숫자만 허용
function tagOf(request) {
  const tag = String(request.query.tag || '');
  return /^[a-zA-Z0-9]+$/.test(tag) ? tag : 'unknown';
}

// 필요한 값만 남겨서 보낸다
function pick(items, fields) {
  return items.map((item) => {
    const result = {};
    for (const field of fields) result[field] = item[field];
    return result;
  });
}

// ---------- 주소(라우트) 연결 ----------
module.exports = function (app) {
  // 상태 확인 : 키가 들어 있는지
  app.get('/api/status', (request, response) => {
    sendToPage(response, tagOf(request), API_KEY === '' ? '.env 파일에 TAGO_API_KEY가 없어요.' : null, []);
  });

  // 🚆 기차 : 시/도 목록
  app.get('/api/train/cities', (request, response) => {
    callTago('TrainInfo/GetCtyCodeList', {}, (error, items) => {
      sendToPage(response, tagOf(request), error, pick(items, ['citycode', 'cityname']));
    });
  });

  // 🚆 기차 : 시/도의 기차역 목록
  app.get('/api/train/stations', (request, response) => {
    callTago('TrainInfo/GetCtyAcctoTrainSttnList', { cityCode: request.query.city }, (error, items) => {
      sendToPage(response, tagOf(request), error, pick(items, ['nodeid', 'nodename']));
    });
  });

  // 🚆 기차 : 출발역 → 도착역, 날짜(YYYYMMDD)의 열차 시간표
  app.get('/api/train/search', (request, response) => {
    const params = {
      depPlaceId: request.query.dep,
      arrPlaceId: request.query.arr,
      depPlandTime: request.query.date
    };
    callTago('TrainInfo/GetStrtpntAlocFndTrainInfo', params, (error, items) => {
      sendToPage(response, tagOf(request), error,
        pick(items, ['traingradename', 'trainno', 'depplacename', 'arrplacename', 'depplandtime', 'arrplandtime', 'adultcharge']));
    });
  });

  // 🚌 버스 : 도시 목록
  app.get('/api/bus/cities', (request, response) => {
    callTago('ArvlInfoInqireService/getCtyCodeList', {}, (error, items) => {
      sendToPage(response, tagOf(request), error, pick(items, ['citycode', 'cityname']));
    });
  });

  // 🚌 버스 : 정류장 이름으로 찾기
  app.get('/api/bus/stops', (request, response) => {
    const params = { cityCode: request.query.city, nodeNm: request.query.name };
    callTago('BusSttnInfoInqireService/getSttnNoList', params, (error, items) => {
      sendToPage(response, tagOf(request), error, pick(items, ['nodeid', 'nodenm', 'nodeno']));
    });
  });

  // 🚌 버스 : 정류장 실시간 도착 예정
  app.get('/api/bus/arrivals', (request, response) => {
    const params = { cityCode: request.query.city, nodeId: request.query.node };
    callTago('ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList', params, (error, items) => {
      sendToPage(response, tagOf(request), error,
        pick(items, ['routeno', 'routetp', 'arrprevstationcnt', 'arrtime', 'vehicletp']));
    });
  });

  console.log(API_KEY === '' ? '⚠️  .env에 TAGO_API_KEY가 없어서 기차·버스 정보는 꺼져 있어요.' : '🚆 기차·버스 정보 켜짐 (TAGO API 키 읽음)');
};

# 🗓️ 다용도 캘린더 (ICT융합공학 기말 팀과제)

일정 · 과제 · 습관 · 지출을 **한 달력**에서 관리하는 대학생용 캘린더입니다.
교재 『자바스크립트 프로그래밍 입문 2판』(윤인성) 범위의 문법만 사용했습니다.

### 🔗 바로 써 보기 : **https://cvcvcv221.github.io/multi-calendar/**
> 웹에서는 예시 데이터로 체험만 할 수 있어요. (저장은 `npm start`로 실행했을 때만)

## 👥 협업 방법

- 의견·버그 → **Issues** (템플릿 선택)
- 코드 수정 → 브랜치 → **Pull Request** → 팀원 확인 후 합치기
- **AI 사용 여부를 커밋·PR마다 표시** → 자세한 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)
- AI 사용 기록 → [docs/AI_USAGE.md](docs/AI_USAGE.md)

## 실행 방법

**1) 저장 기능까지 쓰기 (발표·시연용, 추천)**

```bash
git clone (저장소 주소)
cd multi-calendar
npm install     # 처음 한 번 (express 설치)
npm start       # 서버 실행
```
브라우저에서 **http://127.0.0.1:52273** 접속 → 오른쪽 위 💾 저장 버튼을 누르면 `data.json`에 저장됩니다.

**2) 그냥 보기**

위의 🔗 링크로 열거나, `public/index.html`을 더블클릭해도 실행됩니다. (예시 데이터로 시작, 저장은 안 됨)

> `data.json`을 지우면 예시 데이터로 처음부터 시작합니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 월간 / 주간 보기 | 이전·다음 이동, 오늘로 이동, 다른 달 날짜를 누르면 그 달로 이동 |
| 모드 켜고 끄기 | 일정 · 과제 · 습관 · 지출을 버튼으로 골라서 보기 |
| 일정 | 시작일~종료일(여러 날 일정은 막대로 이어짐), 시간, 색상 6개, **매주/매월 반복**, 메모 |
| 과제·시험 | 마감일, 중요도, 완료 체크, D-day, 마감 하루 전부터 빨간색 강조 |
| 습관 트래커 | 습관 추가(prompt), 최근 7일 표에서 바로 체크, 연속 달성 🔥, 최고 기록 |
| 지출 | 금액·분류 입력, 한 달 예산(prompt) 대비 막대, 초과 경고, 분류별 막대그래프 |
| 오늘 요약 | 시간대별 인사, 다음 일정, 다가오는 마감 D-day, 남은 습관, 오늘 지출 |
| 월간 리포트 | 일정 수, 과제 완료율, 습관 달성률, 총 지출, 가장 바쁜 날 |
| 검색 | 제목·메모 검색, 결과를 누르면 그 날짜로 이동 |
| 공휴일 | 2026년 공휴일·대체공휴일 빨간 글씨 표시 |
| 되돌리기 | 삭제한 항목·습관 복구 (배열 push / pop 으로 만든 스택) |
| 다크 모드 | 🌙 버튼 |
| 실시간 시계 | 1초마다 갱신, 1분마다 오늘 요약 갱신 (`setInterval`) |
| 저장 | Node.js 서버가 `data.json` 파일에 저장, 저장 안 한 변경 수 표시 |

### 🚆🚌 교통 정보 (`transit.js` + `transit-api.js`)

| 기능 | 설명 |
|---|---|
| 🚆 기차 시간표 | 출발역 → 도착역, 달력에서 고른 날짜의 열차 목록. 누르면 그날 일정으로 추가 (출발 시각·열차 번호·도착 시각·요금) |
| 🚌 버스 실시간 도착 | 정류장 이름으로 찾아서 고르면 "271번 7분 · 3정류장 전"처럼 표시, 고른 정류장은 기억 |

- 공공데이터포털 **국토교통부 TAGO** API (버스도착정보, 버스정류소정보, 열차정보) 사용
- **npm start로 실행할 때만** 동작 (API 키를 서버만 갖고 있어야 해서 GitHub Pages에서는 안내만 표시)
- 웹페이지는 `fetch` 대신 숨은 `<iframe>`으로 서버에 요청 → 서버가 결과를 `<script>`로 돌려줌 (교재 범위 유지)

**API 키 설정 (각자 한 번)**
1. data.go.kr 로그인 → 위 API 3개 활용신청 (자동승인)
2. 마이페이지 → 활용신청 현황 → **일반 인증키(Encoding)** 복사
3. `.env.example`을 복사해서 이름을 `.env`로 바꾸고 `TAGO_API_KEY=` 뒤에 키 붙여넣기
4. `npm start` → 터미널에 "🚆 기차·버스 정보 켜짐"이 나오면 성공

> ⚠️ `.env`는 `.gitignore`에 있어서 GitHub에 안 올라가요. 키를 코드나 채팅에 붙이지 마세요.

### ✨ 참신한 기능 (`smart.js`)

| 기능 | 설명 |
|---|---|
| 🧭 거꾸로 계획 | 과제의 🧭 버튼 → 몇 번 나눌지 입력 → 오늘~마감 전날 중 **덜 바쁜 날**(주말·공휴일 가산점)을 골라 준비 일정을 자동 배치. 다시 누르면 새 계획으로 교체 |
| 🌡️ 바쁨 지도 | 달력 위 버튼으로 켜면 날짜 칸이 바쁜 정도(일정 1점 + 과제 중요도 3/2/1점)에 따라 5단계 색으로 칠해짐 |
| 📈 지출 페이스 | 지금 속도로 쓰면 월말에 얼마가 될지 예측 + 남은 날 동안 하루 얼마까지 써도 되는지 |
| 🌱 습관 잔디 | 최근 12주 동안 하루 습관 달성률을 깃허브 잔디처럼 표시, 칸을 누르면 그 날로 이동 |
| 🎯 지금 할 일 추천 | 중요도 ÷ (남은 날 + 1) 점수가 가장 큰 과제를 오늘 요약 맨 위에 추천 |

## 파일 구조 & 역할 분담

| 파일 | 담당 | 내용 |
|---|---|---|
| `public/js/data.js` | **공통** | `data` 객체, 상수, 날짜·문자열 함수, **`CalendarItem` · `Habit` 클래스**, 예시 데이터 |
| `public/js/calendar.js` | **A** | 월간·주간 달력 그리기, 이동, 공휴일, 뱃지 |
| `public/js/main.js` | **A** | 시작점 `window.onload`, `render()`, 모드 버튼, 다크 모드, 저장 준비 |
| `server.js` | **A** | express 서버, 저장/불러오기 |
| `public/js/schedule.js` | **B** | 선택한 날짜 목록, 추가·수정 창, 입력 검사, 삭제·되돌리기, 검색 |
| `public/js/habit.js` | **C** | 습관 추가·삭제·체크, 연속 일수, 최근 7일 표 |
| `public/js/money.js` | **C** | 예산, 분류별 지출 그래프 |
| `public/js/report.js` | **C** | 오늘 요약, 월간 리포트 |
| `public/js/smart.js` | **공통 (AI 생성)** | 거꾸로 계획, 바쁨 지도, 지출 페이스, 습관 잔디, 지금 할 일 추천 |
| `public/index.html`, `css/style.css` | 공통 | 화면 구조와 디자인 |

## 핵심 흐름 (발표 때 이 순서로 설명)

```
버튼 클릭 (onclick 이벤트)
  → data 객체 변경 (배열 push / splice / filter)
  → render() 호출
  → 각 render 함수가 문자열로 HTML을 만들어 innerHTML로 화면 갱신
  → 💾 저장 : form 전송 → server.js → data.json 파일
```

## 📖 교재 대응표 (『자바스크립트 프로그래밍 입문 2판』, 쪽수는 교재 기준)

발표할 때 "이 기능은 교재 ○장에서 배운 ○○로 만들었다"고 설명하면 됩니다.

### Part 1 자바스크립트 기본

| 교재 | 배운 내용 | 우리 코드에서 |
|---|---|---|
| 2장 p59, p81 | 템플릿 문자열 `` `${}` ``, `typeof` | HTML 문자열 만들기, 서버 실행 여부 확인(`main.js loadData`) |
| 3장 p105~119 | `if` `else if`, `switch`, 조건 연산자 `? :` | 입력 검사, 리포트 집계(`report.js`), 반복 종류 판단(`CalendarItem.occursOn`) |
| 4장 p131~147 | 배열, `for` `while` `for in` `for of`, `break` | 달력 42칸 그리기, 연속 달성 계산(`while`), 선택 상자 만들기(`for in`) |
| 5장 p161~173 | 익명·선언적·화살표 함수, 콜백 함수 | 모든 기능 함수, `filter` `sort` `forEach`의 콜백 |
| 5장 p178 | 타이머 `setTimeout` `setInterval` `clearTimeout` | 실시간 시계, 알림 메시지 자동 사라짐 |
| 6장 p193~199 | 객체, 객체와 반복문, 속성과 메소드 | `data`, `MODES`, `COLORS`, `habitLogs` (날짜 → 완료 목록) |
| 6장 p201~206 | **클래스, 생성자, `this`, 메소드** | **`CalendarItem` 클래스**(`occursOn` `getLength` `isUrgent`), **`Habit` 클래스**(`isDoneOn` `getStreak` `getBestStreak`) |
| 7장 p223 | Number `toFixed()` | 퍼센트, 그래프 막대 길이 |
| 7장 p227~232 | String `split` `slice` `indexOf` `charAt` `concat` | 날짜 문자열 나누기, 검색, 금액 쉼표 `formatMoney` |
| 7장 p232~235 | Date `get○○` `set○○` `getTime` | 달력 계산, D-day, 반복 일정, 시계 |
| 7장 p236~242 | Array `push` `pop` `splice` `concat` `sort` / `forEach` `map` `filter` | 항목 추가·삭제, 되돌리기 스택(`push`/`pop`), 정렬, 검색 |
| 7장 p245 | `JSON.stringify` `JSON.parse` | 저장 데이터 변환 |
| 8장 p257~267 | `try catch`, 예외 객체, **`throw`로 예외 강제 발생** | 입력 검사 `validateItem()`이 `throw new Error()` → `saveForm()`이 `catch`해서 `alert(error.message)` |

### Part 2 서버 자바스크립트 (`server.js`)

| 교재 | 배운 내용 | 우리 코드에서 |
|---|---|---|
| 9장 p279 | `__dirname` | 파일 경로 |
| 9장 p294~301 | `fs` 모듈 `readFileSync` `writeFileSync`, 파일 처리와 예외 처리 | `data.json` 읽기·쓰기, 파일이 없으면 `catch` |
| 10장 p328~341 | express 서버, `response.type()` `send()` `status()` `redirect()` | 저장된 데이터를 JS 파일로 보내기, 저장 후 첫 화면으로 이동 |
| 10장 p345~347 | static 미들웨어, body-parser(`express.urlencoded`), `<form method="post">` | `public` 폴더 제공, 저장 form 받기(`request.body.data`) |

### Part 3 클라이언트 자바스크립트

| 교재 | 배운 내용 | 우리 코드에서 |
|---|---|---|
| 12장 p380 | `alert()` `prompt()` | 입력 오류 알림, 습관 이름·예산 입력 |
| 12장 p383 | `location` 객체 (`search`) | 저장 후 "저장했어요" 알림(`/?saved=1`) |
| 13장 p403~411 | `getElementById`, `innerHTML` `textContent` `style` `setAttribute` | 모든 화면 그리기, 보이기/숨기기(`style.display`) |
| 13장 p416 | 인라인 이벤트 모델 `onclick="함수()"` `onkeyup` `onchange` `onsubmit` | 달력 칸·목록 버튼(문자열로 만든 HTML), 검색창 |
| 13장 p419~421 | 고전 이벤트 모델 `요소.onclick = function () {}`, `this` | 상단·창 버튼 연결(`init○○` 함수들), 검색창 `onSearch(this.value)` |
| 13장 p422 | 기본 이벤트 제거 (`return false`) | 파일로 열었을 때 저장 form 전송 막기(`prepareSave`) |
| 13장 | `window.onload` | 시작점 (`main.js`) |

**쓰지 않은 것** (교재에 없음) : `addEventListener`, `createElement` `appendChild`, `classList`, `localStorage`, `fetch`, `reduce` `find` `includes`, `padStart`, `Math`, `confirm`, `preventDefault` 등
→ 새 코드를 넣을 때도 위 표에 있는 문법만 쓰기!

> 참고 : 입력칸 값을 읽는 `요소.value`는 교재 13장의 "웹 표준 속성은 `img.src`처럼 이름으로 바로 사용한다"(p411)와 같은 방식입니다.

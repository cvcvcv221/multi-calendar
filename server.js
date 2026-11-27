// =============================================
// server.js : 저장용 서버 (Node.js + express, 교재 9~10장)
//  - public 폴더의 웹페이지를 제공 (static 미들웨어)
//  - 저장 버튼을 누르면 data.json 파일에 저장 (body-parser + fs 모듈)
//  - 저장된 데이터를 saved-data.js 로 웹페이지에 전달
// 실행 : npm install → npm start → http://127.0.0.1:52273
// =============================================

// 모듈을 추출합니다.
const express = require('express');
const fs = require('fs');

// 서버를 생성합니다.
const app = express();
const dataFile = __dirname + '/data.json';

// 미들웨어를 설정합니다.
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));

// data.json 파일 읽기 (없거나 깨졌으면 null)
function readData() {
  try {
    const text = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

// 저장된 데이터를 자바스크립트 파일 형태로 제공합니다.
// 웹페이지의 <script src="saved-data.js">가 savedData 변수를 만듭니다.
app.get('/saved-data.js', (request, response) => {
  const data = readData();
  response.type('application/javascript');
  response.send('const savedData = ' + JSON.stringify(data) + ';');
});

// 저장 : form으로 보낸 data 값을 파일에 씁니다.
app.post('/save', (request, response) => {
  try {
    const data = JSON.parse(request.body.data);
    fs.writeFileSync(dataFile, JSON.stringify(data), 'utf8');
    response.redirect('/?saved=1');
  } catch (error) {
    response.status(400).send('저장하지 못했습니다. 데이터 형식을 확인하세요. <a href="/">돌아가기</a>');
  }
});

// 서버를 실행합니다.
app.listen(52273, () => {
  console.log('Server running at http://127.0.0.1:52273');
});

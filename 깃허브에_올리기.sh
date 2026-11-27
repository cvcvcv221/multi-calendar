#!/bin/bash
# 이 폴더를 GitHub 비공개 저장소로 올리는 스크립트 (처음 한 번만 실행)
# 사용법 : 터미널에서 이 폴더로 이동한 뒤  bash 깃허브에_올리기.sh
set -e
cd "$(dirname "$0")"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI(gh)가 없습니다. 먼저 설치하세요:  brew install gh"
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub 로그인이 필요합니다. 안내에 따라 로그인하세요."
  gh auth login -h github.com -p https -w
fi

if [ ! -d .git ]; then
  git init -b main
fi
git add .
git commit -m "[시작] 다용도 캘린더 초기 버전

AI: 대부분 (코드 전체를 Claude가 교재 범위 조건에 맞춰 생성, 팀이 방향 결정·검토)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WSW3ooicLqQDhvwM1WXr2A" || true

gh repo create multi-calendar --private --source=. --remote=origin --push \
  --description "ICT융합공학 기말 팀과제 - 다용도 캘린더 (일정·과제·습관·지출)"

# 이슈 라벨 만들기 (이미 있으면 넘어감)
gh label create feedback --color 4F8EF7 --description "피드백·아이디어" 2>/dev/null || true
gh label create bug --color EB5757 --description "버그" 2>/dev/null || true

echo ""
echo "✅ 완료! 저장소 주소:"
gh repo view --json url -q .url
echo ""
echo "팀원 초대 : 저장소 → Settings → Collaborators → Add people"
echo "  또는 터미널에서  gh api -X PUT repos/{owner}/multi-calendar/collaborators/팀원아이디"

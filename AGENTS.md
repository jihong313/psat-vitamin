# AGENTS.md - Antigravity Workspace Guide & Context

## 1. 프로젝트 개요 (Project Overview)
- **프로젝트명**: PSAT 5급 공채 수험 플랜 & PSAT Vitamin Lab
- **목표**: 2026-2027 5급 공채(행정고시/외교원) 1차 합격 및 대학 학기(GIS행정자료분석, 정치학원론, 정치경제학) 병행 관리
- **핵심 구성**:
  1. `plan/`: 24주 완결 마스터 타임테이블 및 3개 분리 캘린더(`psat_study.ics`, `college_classes.ics`, `daily_routine.ics`, `generate_ics.py`)
  2. `vitamin/`: 자료해석 스피드 연산 트레이너 웹앱 (덧셈, 뺄셈, 곱셈, 분수비교, 곱셈비교, 종합모드)
  3. `index.html`: 접속 시 `./vitamin/`으로 자동 리다이렉트
  4. `README.md`: 다른 기기(스마트폰, 태블릿, 노션 등) 연동 가이드

---

## 2. 기술 스택 및 아키텍처 규칙 (Tech Stack & Architecture)
- **Vitamin Lab 프론트엔드**:
  - 순수 **HTML5, Vanilla CSS, Vanilla JavaScript** (외부 프레임워크나 복잡한 빌드 도구 없이 브라우저에서 직접 구동)
  - **디자인 시스템**: CSS 커스텀 속성 기반 듀얼 테마 (`[data-theme="beige"]` 웜 베이지 페이퍼 테마, `[data-theme="dark"]` 옵시디언 다크 테마)
  - **사운드 엔진**: 외부 mp3 의존성 없이 `Web Audio API` 오디오 합성기(Synthesizer)로 경쾌음, 오답음, 팡파레 구현
  - **시간 트래킹**: `Page Visibility API`를 적용하여 브라우저 탭 활성화 상태에서만 실제 순 공부 시간 누적 기록
  - **데이터 영속성**: `localStorage` 활용 (오늘 학습 시간, 푼 문항 수, 회차별 기록실 세션 50개, 오답 보관함 Vault)
  - **조작성**: 마우스 없이도 훈련 가능한 풀 키보드 단축키 지원 (숫자패드 Enter, 스페이스바, 방향키 `←`/`→`, `A`/`B`, 음소거 `M`)

---

## 3. 에이전트 작업 지침 (Instructions for Antigravity)
- **언어**: 사용자와의 모든 소통 및 커밋/코드 설명은 **한국어**를 우선 사용합니다.
- **코드 수정 시 주의사항**:
  - `vitamin/style.css`의 듀얼 테마 변수(`--bg-app`, `--text-main`, `--accent-primary` 등) 구조를 항상 유지하세요.
  - 문제 생성기(`ProblemGenerator`)에 새로운 PSAT 연산 유형 추가 시, `rawExpression`, `displayHtml`, `correctAnswer`, `tip` 포맷을 준수하세요.
  - 캘린더 수정 요구 시 `plan/generate_ics.py`의 날짜 범위 및 이벤트 생성 함수(`make_event`)와 `PSAT_2026_2027_Master_Schedule.md`를 함께 업데이트하세요.

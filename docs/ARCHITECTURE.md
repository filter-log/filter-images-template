# Architecture

## 전체 구성

이 시스템은 4개의 계층으로 나뉩니다.

1. 업로드 포털
   - 비전공자용 드래그 앤 드롭 UI
   - 정적 페이지
   - 권장 배포 위치: `filter-log.github.io/upload/`
   - 업로드 암호 입력 필드 포함
2. 서버리스 업로드 API
   - GitHub REST API로 활성 이미지 저장소에 파일 기록
   - 서버측 업로드 암호 검증
   - 인증 세션 쿠키 발급
   - GitHub App 또는 fine-grained token 사용
3. 이미지 저장소 템플릿
   - `filter-images-template`
   - 이후 `filter-images-1`, `filter-images-2` 등으로 템플릿 기반 생성
4. 공개 갤러리
   - 각 이미지 저장소의 GitHub Pages
   - `data/images.json` 기준 월별 탐색

## 요청 흐름

1. 사용자가 업로드 포털에서 이미지, 날짜, 선택 폴더, 업로드 암호를 입력합니다.
2. 포털이 먼저 `/api/auth`로 암호를 전송합니다.
3. API는 `UPLOAD_PASSWORD`를 서버측에서 검증하고, 맞으면 HttpOnly 세션 쿠키를 발급합니다.
4. 포털이 같은 세션으로 `/api/upload`에 `multipart/form-data` 요청을 전송합니다.
5. `/api/upload`는 세션 쿠키가 없으면 본문 파싱 전에 401로 거부합니다.
6. API는 `ACTIVE_IMAGE_REPO` 값을 읽어 현재 업로드 대상 저장소를 선택합니다.
7. API는 파일명을 정리하고 중복 이름을 방지한 뒤 `incoming/YYYY/MM/optional-folder/`에 원본을 저장합니다.
8. 활성 이미지 저장소의 GitHub Actions가 push를 감지합니다.
9. Actions가 원본을 다음으로 변환합니다.
   - `images/YYYY/MM/optional-folder/filename.webp`
   - `thumbs/YYYY/MM/optional-folder/filename.webp`
10. 같은 워크플로에서 `data/images.json`을 재생성합니다.
11. GitHub Pages가 정적 갤러리를 그대로 서비스합니다.
12. 사용자는 공개 갤러리에서 월별로 탐색하고 URL/Markdown을 복사합니다.

## 저장소 역할

### `filter-log.github.io`

- 블로그 본체
- 업로드 포털 링크 노출
- 공개 갤러리 링크 집계
- 필요 시 업로드 포털 자체 정적 호스팅

### `filter-images-template`

- 공개 갤러리 HTML/CSS/JS
- 후처리 스크립트
- GitHub Actions 워크플로
- 운영 문서

### `filter-images-1`, `filter-images-2`, ...

- 실제 이미지 저장소
- 동일한 템플릿 구조 사용
- GitHub Pages로 각 저장소가 독립 갤러리 제공

### 업로드 API 저장소

- 업로드 암호와 인증 세션 secret 보관
- 민감한 GitHub 자격 증명 보관
- 활성 저장소 전환 환경변수 보관
- 업로드 포털과 이미지 저장소 사이의 유일한 쓰기 경로

## 업로드 대상 분기 전략

현재 구현:

- `ACTIVE_IMAGE_REPO=filter-images-1`
- 운영자가 환경변수 1개만 바꾸면 새 업로드가 `filter-images-2`로 이동

향후 확장:

- 저장소별 사용량 JSON 또는 GitHub GraphQL 조회로 자동 선택
- 특정 월/이벤트별 분기 규칙 추가

중요한 점:

- 기존 URL은 기존 저장소에 남기고 절대 이동하지 않음
- 새 업로드만 새 저장소로 보냄

## 보안 모델

- 업로드 페이지는 공개 가능하지만 실제 업로드는 암호 인증 세션이 있어야만 허용
- 업로드 암호 검증은 서버에서만 수행
- `/api/upload`는 인증이 없으면 파일 본문 파싱 전 차단
- 클라이언트에는 GitHub 토큰 또는 App 키를 절대 두지 않음
- 서버리스 API만 GitHub 쓰기 권한 보유
- GitHub App은 `filter-images-*` 저장소에만 설치
- CORS와 쿠키 허용 origin은 업로드 포털 도메인만 허용
- GitHub Pages는 읽기 전용 공개 경로로만 사용

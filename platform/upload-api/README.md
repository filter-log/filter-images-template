# Upload API Scaffold

이 폴더는 GitHub REST API로 이미지 저장소에 업로드하는 서버리스 함수 스캐폴드입니다.

## 권장 배포

- Vercel Serverless Functions
- 대체 가능: Netlify Functions, Cloud Run, AWS Lambda

## 동작 방식

1. 업로드 포털이 먼저 `POST /api/auth`로 업로드 암호를 보냅니다.
2. API는 `UPLOAD_PASSWORD`를 검증하고 HttpOnly 세션 쿠키를 발급합니다.
3. 이후 `POST /api/upload`는 이 세션 쿠키가 없으면 401로 거부합니다.
4. API는 `ACTIVE_IMAGE_REPO`를 읽어 현재 활성 저장소를 선택합니다.
5. GitHub App 설치 토큰 또는 fine-grained token으로 GitHub Contents API를 호출합니다.
6. 파일은 먼저 `incoming/YYYY/MM/optional-folder/filename.ext`에 저장됩니다.
7. 대상 이미지 저장소의 GitHub Actions가 이를 감지해 최종 `images/`와 `thumbs/`를 생성합니다.

## 최소 권한 원칙

GitHub App 권장 권한:

- `Contents: Read and write`
- `Metadata: Read-only`

설치 대상 저장소는 `filter-images-*`로만 제한합니다.

## 환경변수

`.env.example` 참고.

핵심 값:

- `UPLOAD_PASSWORD`
- `UPLOAD_SESSION_SECRET`
- `UPLOAD_SESSION_TTL_SECONDS`
- `GITHUB_OWNER`
- `ACTIVE_IMAGE_REPO`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `UPLOAD_PORTAL_ORIGIN`

## 확장 포인트

- 저장소 용량 상태를 기준으로 `ACTIVE_IMAGE_REPO` 대신 자동 선택 로직 추가
- 관리자 승인 큐 추가
- 업로드 메타데이터(DB 또는 JSON manifest) 추가
- 브루트포스 방지용 rate limiting 추가

# Upload API Scaffold

이 폴더는 레포 전용 업로드 API 스캐폴드다. 핵심 원칙은 간단하다. 배포 인스턴스 하나가 레포 하나만 수정한다.

## 권장 배포

- 100장 업로드 운영 기준: Cloud Run, Fly.io, Render 같은 큰 request body를 처리할 수 있는 환경 권장
- Vercel 설정 파일은 포함되어 있지만, 대용량 다중 업로드 운영에는 플랫폼 한도를 먼저 확인해야 함

## 동작 방식

1. `/upload/` 페이지가 `POST /api/auth`로 업로드 암호를 보낸다.
2. API는 `UPLOAD_PASSWORD`를 검증하고 HttpOnly 세션 쿠키를 발급한다.
3. `/api/upload`는 이 쿠키가 없으면 401로 거부한다.
4. API는 `TARGET_REPO` 기준으로 자기 레포만 대상으로 삼는다.
5. 업로드 파일은 `incoming/YYYY/MM/optional-folder/filename.ext`로 들어간다.
6. GitHub Git Data API를 사용해 최대 100장 파일을 한 커밋 흐름으로 기록한다.
7. 이후 해당 레포의 GitHub Actions가 후처리를 실행한다.

## 최소 권한 원칙

GitHub App 권장 권한:

- `Contents: Read and write`
- `Metadata: Read-only`

가장 좋은 설정은 이 API 인스턴스용 App 설치를 대상 레포 하나로만 제한하는 것이다.

## 필수 env

- `TARGET_REPO`
- `PUBLIC_REPOSITORY_NAME`
- `GITHUB_OWNER`
- `UPLOAD_PASSWORD`
- `UPLOAD_SESSION_SECRET`
- `UPLOAD_PORTAL_ORIGIN`

추가 env는 `.env.example` 참고.

## 왜 `TARGET_REPO`를 쓰는가

- 중앙 활성 레포 전환 개념을 제거하기 위해서다.
- `filter-images-1` API는 `TARGET_REPO=filter-images-1`
- `filter-images-2` API는 `TARGET_REPO=filter-images-2`
- 따라서 업로드 페이지가 잘못된 레포로 저장될 수 없다.

## 확장 포인트

- 브루트포스 방지용 rate limiting
- 업로드 승인 큐
- EXIF/캡션/태그 메타데이터 저장
- 업로드 이후 webhook 기반 알림

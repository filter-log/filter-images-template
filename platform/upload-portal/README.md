# Upload Portal Scaffold

이 폴더는 비전공자용 업로드 전용 정적 페이지 스캐폴드입니다.

## 배포 위치

- 권장: `filter-log.github.io/upload/` 또는 별도 `filter-upload-portal` 저장소
- 필요 조건: `platform/upload-api`가 배포된 API 엔드포인트 1개

## 설정

1. `assets/config.js`의 `authEndpoint`, `uploadEndpoint`를 실제 서버리스 API URL로 바꿉니다.
2. 정적 파일 그대로 GitHub Pages 또는 Netlify에 배포합니다.
3. API 쪽 CORS 허용 Origin에 이 포털 도메인을 추가합니다.

## UX 포인트

- 드래그 앤 드롭
- 여러 장 선택
- 업로드 전 미리보기
- 업로드 암호 입력
- 서버측 암호 검증 후 세션 기반 업로드
- 날짜 기본값 자동 입력
- 선택 폴더명 입력
- 업로드 후 공개 URL/Markdown 복사

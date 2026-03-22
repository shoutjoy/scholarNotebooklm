# Korean / UTF-8 Rules

이 프로젝트에서 한글이 깨지는 일을 줄이기 위한 기본 규칙입니다.

1. 모든 텍스트 파일은 UTF-8로 저장합니다.
- 대상: js, html, css, json, md, txt, yml, yaml
- PowerShell 스크립트만 CRLF, 나머지는 LF를 기본으로 사용합니다.

2. 파일을 수정할 때는 UTF-8로 읽고 UTF-8로 씁니다.
- PowerShell: `Get-Content -Encoding UTF8`, `Set-Content -Encoding UTF8`
- Python: `encoding="utf-8"`

3. 터미널에 `????`로 보여도 실제 파일이 정상일 수 있습니다.
- 최종 확인은 IDE 파일 내용으로 합니다.
- 터미널 출력만 보고 한글이 깨졌다고 단정하지 않습니다.

4. 이미 깨진 문자열은 원문 기준으로 다시 넣습니다.
- 깨진 문자열을 다시 복사해서 저장하지 않습니다.
- 가능하면 파일 전체 블록을 UTF-8로 다시 씁니다.

5. 한글이 중요한 파일은 부분 치환보다 전체 문구 교체를 우선합니다.
- 작은 조각 치환 중 인코딩 문제가 섞이면 오류가 누적될 수 있습니다.

6. 외부 도구가 파일을 덮어쓸 때는 저장 인코딩을 다시 확인합니다.
- VS Code 설정, .editorconfig, .gitattributes 규칙을 우선 기준으로 삼습니다.

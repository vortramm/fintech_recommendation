# 앱에서 혜택 목록 주소 찾기

LINK · 마이샵 · 하나PICK · 꾹의 공통 목록은 웹 페이지의 정적 HTML 에 없습니다. 전부 앱과
모바일 웹이 XHR 로 받아서 그립니다. 그 주소를 찾으면 `data/sources.json` 에 적어 자동
수집에 태울 수 있습니다. 쉬운 것부터 순서대로 해 보세요.

찾은 응답은 `tools/from-har.mjs` 에 넘기면 `pick` 매핑까지 만들어 줍니다.

---

## 0단계 — 웹 쪽부터 (앱 없이)

앱과 웹이 같은 API 를 쓰는 경우가 많습니다. 수집기가 페이지를 브라우저로 띄우고 그때
오가는 JSON 응답을 받아 두므로, 앱을 건드리기 전에 이것부터 돌려 보세요.

### 방법 A — GitHub 에서 클릭으로 (설치 없음, 권장)

1. 레포 → **Actions** 탭 → 왼쪽에서 **혜택 데이터 갱신** 선택
2. 오른쪽 **Run workflow** 버튼
3. 입력값
   - `only` — 특정 소스만 돌리려면 `samsung` 처럼 id 일부를 넣고, 전체면 비워 둡니다
   - `dump` — 켜 두면 받은 JSON 응답 원본을 통째로 저장합니다 (기본 켜짐)
4. 실행이 끝나면 두 군데를 봅니다
   - **로그** — 소스별 상태와 "혜택 목록처럼 보이는 응답 (pick 매핑 후보)" 가 그대로 찍힙니다.
     보통 이것만 복사해도 매핑을 적을 수 있습니다.
   - **Artifacts → benefit-capture** — `data/feed.json` 과 `tools/captures/*.json`(응답 원본)

로그가 이런 모양으로 나옵니다.

```
· samsung-link            ok · 공지 12
· shinhan-myshop          login-required
· woori-kkook             blocked

혜택 목록처럼 보이는 응답 (pick 매핑 후보)
 1) [samsung-link] https://www.samsungcard.com/.../benefitList.json
    path: data.benefitList · 24행
    keys: mchtNm, dcRt, maxDcAmt, minPayAmt, prd
    sample: {"mchtNm":"이마트","dcRt":5,"maxDcAmt":"5,000",...}
```

`login-required` 나 `blocked` 만 잔뜩 나오면 그때 1단계(앱) 로 넘어가면 됩니다.

### 방법 B — 내 컴퓨터에서

```bash
git clone -b claude/payment-discount-finder-stcobp https://github.com/vortramm/fintech_recommendation
cd fintech_recommendation

npm install                      # Node 18 이상
npx playwright install chromium  # 헤드리스 브라우저, 한 번만

npm run selftest                 # 네트워크 없이 수집 로직 점검 (먼저 여기부터)
npm run collect -- --dump --only samsung   # 삼성카드만, 응답 원본까지 저장
npm run collect -- --dump                  # 전체
```

`npm run collect` 뒤의 `--` 를 빠뜨리면 옵션이 스크립트로 전달되지 않으니 주의하세요.

보는 곳은 세 군데입니다.

```bash
# 1. 터미널에 찍힌 소스별 상태와 pick 매핑 후보  ← 보통 이거면 충분합니다
# 2. 받은 응답 원본
ls tools/captures/ && head -c 600 tools/captures/samsung-link.json
# 3. 수집 결과 요약
python3 -c "import json;d=json.load(open('data/feed.json'));print(d['sources']);print(len(d['hints']),'hints')"
```

`hints` 에 `path: data.benefitList` 같은 게 잡히면 거기서 끝입니다. 그 값을
`data/sources.json` 의 해당 소스에 `pick` 으로 적고 다시 수집하면 순위에 들어갑니다.
앱까지 갈 필요가 없습니다.

## 1단계 — 앱의 "공유하기" (도구 없이, 1분)

카드사 앱의 혜택 상세 화면에서 공유 버튼을 눌러 본인에게 보내면 URL 이 나옵니다.
앱 화면이 WebView 면 그 URL 이 곧 공개 주소입니다. PC 브라우저에서 열어 보고,
목록이 보이면 `sources.json` 의 `catalogUrl` 에 그대로 넣으면 됩니다.

가장 합법적이고 빠른 길이라 먼저 시도할 가치가 있습니다.

## 2단계 — 안드로이드 WebView 원격 디버깅 (30분)

앱 화면이 WebView 라면 PC 크롬으로 그 안을 그대로 들여다볼 수 있습니다.

1. 폰: 설정 → 개발자 옵션 → USB 디버깅 켜기
2. PC: 크롬 주소창에 `chrome://inspect/#devices`
3. 앱에서 혜택 화면을 연 뒤 목록에 뜨는 WebView 를 `inspect`
4. Network 탭 → 목록을 새로고침 → 응답 확인
5. Network 탭에서 우클릭 → **Save all as HAR with content**

금융 앱은 `setWebContentsDebuggingEnabled(false)` 로 이 경로를 막아 둔 경우가 많습니다.
목록에 WebView 가 안 뜨면 3단계로 갑니다.

## 3단계 — 프록시로 앱 트래픽 캡처 (1~2시간)

[HTTP Toolkit](https://httptoolkit.com) 이 가장 쉽습니다. HAR 내보내기가 기본이라
바로 다음 단계로 넘어갈 수 있습니다. mitmproxy 를 쓴다면:

```bash
mitmdump -w flows                      # 캡처
# 폰 Wi-Fi → 프록시를 PC IP:8080 으로, mitm.it 접속해 CA 설치
mitmdump -r flows --set hardump=capture.har   # HAR 로 변환
```

안드로이드 7 이상은 **사용자가 설치한 CA 를 앱이 신뢰하지 않습니다.** 그래서 보통
여기서 한 번 막힙니다. 루팅해서 시스템 CA 로 넣거나, 에뮬레이터(`emulator -writable-system`)
를 쓰는 방법이 있습니다.

## 4단계 — 인증서 피닝까지 걸려 있을 때

앱이 서버 인증서를 직접 검증하면 프록시가 통하지 않습니다. Frida + objection 의
SSL unpinning 이 일반적인 해법이지만, 국내 카드 앱은 보호 솔루션(AppSealing 류)으로
루팅 · 에뮬레이터 · Frida 를 탐지해 앱이 아예 뜨지 않는 경우가 많습니다.

**여기서 막히면 그만두는 걸 권합니다.** 들이는 품에 비해 얻는 게 적고, 앱 보호를
무력화하는 쪽으로 더 들어갈 이유가 없습니다. 5단계가 보통 더 빠릅니다.

## 5단계 — APK 정적 분석 (앱을 실행하지 않고 주소만)

주소만 알면 되는 경우가 많으니, 뜯어서 문자열을 보는 편이 빠를 때가 있습니다.

```bash
# 기기에서 APK 추출
adb shell pm path com.samsung.android.spay        # 패키지명은 앱마다 다릅니다
adb pull /data/app/.../base.apk

# 디컴파일 후 주소 찾기
jadx -d out base.apk
grep -rhoE 'https://[a-zA-Z0-9./_-]+' out | sort -u | grep -iE 'benefit|link|coupon|event|mcht'

# 리소스에 박힌 base URL
grep -rn 'BASE_URL\|apiUrl\|host' out/resources/res/values/strings.xml
```

찾은 주소를 인증 헤더 없이 호출해서 200 이 오면 공개 엔드포인트입니다.

```bash
curl -sS -H 'User-Agent: Mozilla/5.0' 'https://.../benefit/list.json' | head -c 500
```

## 6단계 — 캡처를 설정으로 바꾸기

HAR 을 확보했으면 손으로 JSON 을 쓸 필요 없습니다.

```bash
node tools/from-har.mjs capture.har                      # 후보 확인
node tools/from-har.mjs capture.har --write samsung-link # 1순위를 그 소스에 반영
npm run collect -- --only samsung                        # 수집해서 확인
```

혜택 목록처럼 생긴 응답을 점수순으로 보여주고, 필드 이름에서 역할(가맹점명 · 할인율 ·
한도 · 최소금액 · 기간)을 추측해 `pick` 매핑까지 만들어 넣습니다.

---

## 지킬 선

- **개인 용도, 읽기 전용.** 공통 혜택 목록만 봅니다. 로그인이 필요한 개인 데이터는
  수집기에 넣지 않았고, 카드사 계정 자격증명을 저장하는 코드도 없습니다.
- **약관 확인.** 각 사 이용약관과 `robots.txt` 를 먼저 보세요. 재배포가 아니라 본인
  참고용이라도, 명시적으로 금지한 곳은 피하는 게 맞습니다.
- **요청 간격.** 수집은 하루 네 번이면 충분합니다. 짧은 주기로 두드리지 마세요.
- **캡처 파일은 커밋 금지.** HAR 에는 인증 토큰과 개인정보가 그대로 들어갑니다.
  `.gitignore` 에 `*.har` 와 `tools/captures/` 를 넣어 두었습니다.
- **막히면 정공법.** 카드사 고객센터나 제휴 담당에 공개 API 를 물어보는 게 의외로
  빠를 때가 있습니다.

---

# 로그인이 필요한 프로그램은

하나PICK 과 페이북 마이태그는 목록 주소를 열면 로그인 화면으로 넘어갑니다. 마이샵처럼
주소만 바꿔서 해결되는 경우가 아니라, 공개 카탈로그 자체가 없습니다.

## 왜 자동 수집(GitHub Actions)에 넣지 않는가

- **그건 공통 목록이 아니라 내 혜택입니다.** 로그인 뒤에 내려오는 건 나에게 열린
  개인화 목록이라, 다른 사람에게는 맞지 않습니다. 이 페이지가 공유되는 순간 틀린 정보가 됩니다.
- **이 레포는 공개입니다.** 워크플로 로그와 아티팩트도 공개됩니다. 로그인 세션으로 받은
  응답에는 이름·카드번호 뒷자리·이용내역이 섞여 있을 수 있습니다.
- **자격증명을 CI 에 두는 위험.** Secrets 에 넣어도 로그·덤프·서드파티 액션을 통해 샐 수 있습니다.
- **인증 수단이 자동화를 버팁니다.** 간편비밀번호, 기기 등록, ARS·OTP 본인확인은
  헤드리스 브라우저로 안정적으로 통과하기 어렵고, 통과시키려 애쓸수록 계정 잠김 위험이 커집니다.
- 대부분의 카드사 이용약관은 자동화된 접근을 금지합니다.

## 구형 맥에서 브라우저가 안 받아질 때

Playwright 크로미엄은 비교적 최신 macOS 를 요구합니다. `npx playwright install chromium`
이 실패하거나 실행이 안 되면, 이미 깔린 크롬을 대신 씁니다.

```bash
BROWSER_CHANNEL=chrome npm run login -- hana-pick
BROWSER_CHANNEL=chrome npm run collect:mine
```

크롬도 없다면 실행 파일을 직접 가리켜도 됩니다.

```bash
export CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

## 내 계정으로 가져오기 — 로컬에서만 도는 경로

본인 컴퓨터에서만 돌아갑니다. CI 에서는 막혀 있습니다.

```bash
npm run login -- hana-pick
```

브라우저가 열리면 **직접 로그인**하고 혜택 목록 화면까지 간 뒤, 터미널에서 Enter 를 누릅니다.
세션이 저장되고 **곧바로 그 소스를 수집**합니다. 결과는 `data/feed.local.js` 에 쌓이고,
페이지를 열면 **"내 계정"** 배지를 달고 순위에 들어갑니다.

이후에는 로그인 없이 다시 수집할 수 있습니다.

```bash
npm run collect:mine          # 저장된 세션이 있는 소스를 모두 다시 수집
```

세션이 만료되면 화면과 로그에 **"세션 만료"** 로 표시됩니다. `npm run login -- <소스>` 를
다시 하면 됩니다. 카드사 세션은 짧게는 몇십 분이라 자주 하게 됩니다.

### 로그인해 볼 만한 소스

| 소스 id | 무엇이 열리나 |
| --- | --- |
| `hana-pick` | 하나PICK 목록 (비로그인으로는 로그인 화면만 나옴) |
| `bc-mytag` | 페이북 마이태그 |
| `shinhan-events` · `bc-events` | 로그인해야 보이는 이벤트 목록 |
| `samsung-link` · `woori-kkook` · `shinhan-myshop` | 공개 목록 대신 **나에게 열린** 목록 |

마지막 줄이 중요합니다. LINK · 꾹 · 마이샵은 로그인 없이도 공통 목록이 나오지만,
로그인하면 내게 실제로 열린 것만 추려집니다. 내 세션으로 받은 것이 공개 목록과 겹치면
**내 쪽을 우선**해서 보여줍니다.

### 새로 열린 응답에 파서 붙이기

로그인 뒤에 어떤 모양의 응답이 오는지는 돌려 봐야 압니다. 구조만 확인하려면:

```bash
npm run collect:mine          # --dump 가 붙어 있어 .auth-captures/ 에 원본이 남습니다
npm run inspect               # 개인정보를 가린 구조 요약만 출력
```

`inspect` 는 이름·연락처·카드번호·고객번호 같은 식별 정보를 `***` 로 가리고, 가맹점명·
할인율·한도·기간은 그대로 보여줍니다. 파서를 쓰는 데 필요한 건 그것뿐입니다. 출력은
이런 모양입니다.

```
=== hana-pick · 응답 2개
  https://m.hanacard.co.kr/api/pick/list.json
    path: data.pickList · 2행
    {"mchtNm":"스타벅스","dcRt":10,"maxDcAm":"3,000","minPayAm":"10,000",
     "strtDd":"20260901","endDd":"20260930","custMngNo":"***","evntNm":"하나PICK 9월 커피"}
```

이 출력을 공유하면 `tools/parsers.mjs` 에 파서를 추가할 수 있습니다. 원본 캡처
(`.auth-captures/`)는 개인정보가 그대로 들어 있으니 공유하지 마세요.

## 무엇이 어디에 저장되나

| 항목 | 위치 | 커밋됨? |
| --- | --- | --- |
| 로그인 세션(쿠키) | `.auth/<소스>.json` | 아니오 (.gitignore) |
| 아이디·비밀번호 | 저장하지 않음 | — |
| 받은 응답 원본 | `.auth-captures/` | 아니오 (.gitignore) |
| 수집된 개인 혜택 | `data/feed.local.js` | 아니오 (.gitignore) |

`data/feed.local.js` 는 내 컴퓨터에만 있으므로 배포된 페이지나 다른 사람 화면에는
나오지 않습니다.

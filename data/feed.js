/* tools/collect.mjs 가 생성합니다. 직접 고치지 마세요. */
window.DISCOUNT_FEED = {
  "collectedAt": null,
  "note": "아직 수집 전입니다. `npm run collect` 를 돌리거나 GitHub Actions 가 실행되면 갱신됩니다.",
  "sources": [],
  "programs": [
    {
      "id": "samsung-link",
      "app": "samsung",
      "program": "LINK",
      "url": "https://www.samsungcard.com/personal/services/link/UHPPBE0401M1.jsp",
      "catalogUrl": "https://www.samsungcard.com/home/benefit/link/PGHPPCCBenefitLinkViewIndex001",
      "collect": true,
      "keywords": [
        "할인",
        "적립",
        "캐시백",
        "쿠폰"
      ],
      "note": "공통 혜택 풀은 공개돼 있으나 목록이 XHR로 내려옵니다. 실제 적용은 앱에서 '링크' 를 눌러야 됩니다."
    },
    {
      "id": "shinhan-myshop",
      "app": "shinhan",
      "program": "마이샵",
      "url": "https://www.shinhancard.com/pconts/html/benefit/myShop/intro/MOBFM501R01.html",
      "catalogUrl": "https://www.shinhancard.com/pconts/html/benefit/myShop/intro/MOBFM501R01.html",
      "collect": true,
      "keywords": [
        "할인",
        "적립",
        "캐시백",
        "마이샵"
      ],
      "note": "매월 1일 제휴 목록이 갱신됩니다. 대상 선정은 개인화됩니다."
    },
    {
      "id": "woori-kkook",
      "app": "woori",
      "program": "꾹",
      "url": "https://m.wooricard.com/dcmw/yh1/bnf/bnf08/M1BNF208S00.do",
      "catalogUrl": "https://m.wooricard.com/dcmw/yh1/bnf/bnf08/M1BNF208S00.do",
      "collect": true,
      "keywords": [
        "할인",
        "적립",
        "쿠폰",
        "꾹"
      ],
      "note": "'담기' 를 눌러야 적용됩니다. 담기 전 목록은 공통입니다."
    },
    {
      "id": "bc-mytag",
      "app": "bccard",
      "program": "마이태그",
      "url": "https://www.bccard.com/app/card/ContentsLinkActn.do?pgm_id=ind1200",
      "catalogUrl": "https://www.bccard.com/app/card/ContentsLinkActn.do?pgm_id=ind1200",
      "collect": true,
      "keywords": [
        "할인",
        "적립",
        "마이태그",
        "캐시백"
      ],
      "note": "월 단위로 태그 목록이 바뀝니다."
    },
    {
      "id": "hana-pick",
      "app": "hana",
      "program": "하나PICK",
      "url": "https://www.hanacard.co.kr/OPP00000000M.web",
      "catalogUrl": "https://www.hanacard.co.kr/OPP00000000M.web",
      "collect": true,
      "keywords": [
        "할인",
        "적립",
        "쿠폰",
        "PICK"
      ],
      "note": "하나PICK 전용 주소 미확인. 앱/모바일(m.hanacard.co.kr)에서 주소를 잡아 catalogUrl 에 넣어 주세요 — docs/find-app-endpoints.md"
    },
    {
      "id": "kb-pay",
      "app": "kbpay",
      "program": "KB Pay 혜택",
      "url": "https://m.kbcard.com/",
      "catalogUrl": null,
      "collect": false,
      "note": "공개 카탈로그 주소 확인 필요."
    },
    {
      "id": "hyundai-coupon",
      "app": "hyundai",
      "program": "현대카드 쿠폰",
      "url": "https://www.hyundaicard.com/",
      "catalogUrl": null,
      "collect": false,
      "note": "공개 카탈로그 주소 확인 필요."
    },
    {
      "id": "lotte-digiloca",
      "app": "lotte",
      "program": "디지로카 혜택",
      "url": "https://www.lottecard.co.kr/",
      "catalogUrl": null,
      "collect": false,
      "note": "공개 카탈로그 주소 확인 필요."
    },
    {
      "id": "toss-benefit",
      "app": "toss",
      "program": "토스 혜택",
      "url": "https://pay.toss.im/",
      "catalogUrl": "https://pay.toss.im/",
      "collect": true,
      "keywords": [
        "할인",
        "적립",
        "쿠폰",
        "혜택"
      ],
      "note": "토스페이 제휴 혜택. 앱 안에서 개인화되어 노출됩니다."
    },
    {
      "id": "payco-coupon-program",
      "app": "payco",
      "program": "페이코 쿠폰",
      "url": "https://coupons.payco.com/coupon-list",
      "catalogUrl": "https://coupons.payco.com/coupon-list",
      "collect": true,
      "keywords": [
        "할인",
        "적립",
        "쿠폰"
      ],
      "note": "쿠폰 리스트가 공개돼 있습니다."
    }
  ],
  "structured": [],
  "raw": [],
  "hints": []
};

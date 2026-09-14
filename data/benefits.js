/**
 * 결제처별 카드사앱 · 핀테크앱 할인 혜택 데이터
 *
 * ⚠️ 여기 담긴 수치는 구조를 보여주기 위한 예시입니다.
 *    실제 혜택은 매달 바뀌므로 각 앱의 "혜택 / 이벤트" 탭을 보고 값을 고쳐 주세요.
 *
 * 혜택은 두 층으로 나뉩니다.
 *   scope: "merchant"  특정 가맹점 전용 제휴   (merchant: 가맹점 id)
 *   scope: "category"  업종 전체에 걸리는 혜택 (category: 업종 id)
 * 검색한 결제처가 merchants 에 없어도, 업종만 고르면 category 혜택으로 비교됩니다.
 *
 * 계산 방식 (kind)
 *   "rate"   → rate(할인율 0~1) + cap(할인 한도, 없으면 무제한)
 *   "fixed"  → amount(정액 할인액)
 *   "tiered" → tiers: [{ min: 결제금액, amount: 할인액 }, ...]
 *
 * 공통 필드
 *   app          앱 id
 *   minAmount    최소 결제금액
 *   benefitType  "할인"(즉시 차감) | "적립"(포인트·캐시백)
 *   condition    충족 조건 한 줄
 *   monthlyCap   월/일 사용 횟수 제한 (표시 전용)
 *   funding      결제 재원. 생략하면 카드 결제.
 *                "prepaid" 를 넣으면 현금성 결제(머니 충전·선불 잔액)로 보고 비교에서 제외합니다.
 */
window.DISCOUNT_DB = {
  updatedAt: "2026-09-01",
  source: "예시 데이터 — 각 앱 공지 기준으로 직접 갱신해 주세요.",

  apps: {
    toss:     { name: "토스",             kind: "핀테크" },
    kakaopay: { name: "카카오페이",        kind: "핀테크" },
    naverpay: { name: "네이버페이",        kind: "핀테크" },
    payco:    { name: "페이코",           kind: "핀테크" },
    paybooc:  { name: "페이북 (신한카드)",  kind: "카드사" },
    kbpay:    { name: "KB Pay (국민카드)", kind: "카드사" },
    hyundai:  { name: "현대카드",          kind: "카드사" },
    samsung:  { name: "삼성카드",          kind: "카드사" },
    lotte:    { name: "롯데카드",          kind: "카드사" },
    woori:    { name: "우리WON카드",       kind: "카드사" },
    hana:     { name: "하나카드",          kind: "카드사" },
    nhpay:    { name: "NH페이 (농협카드)",  kind: "카드사" },
    bccard:   { name: "BC카드 페이북",      kind: "카드사" },
    ssgpay:   { name: "SSG페이",          kind: "간편결제" },
    smilepay: { name: "스마일페이",         kind: "간편결제" }
  },

  /* 업종 — 검색한 결제처가 등록돼 있지 않을 때 여기서 고르면 됩니다 */
  categories: {
    online:    { name: "온라인 종합몰" },
    fashion:   { name: "패션 · 리셀" },
    beauty:    { name: "뷰티 · 드럭스토어" },
    grocery:   { name: "마트 · 장보기" },
    cvs:       { name: "편의점" },
    delivery:  { name: "배달앱" },
    cafe:      { name: "카페" },
    dining:    { name: "외식 · 프랜차이즈" },
    travel:    { name: "여행 · 숙박" },
    air:       { name: "항공" },
    culture:   { name: "영화 · 공연 · 도서" },
    subscribe: { name: "구독 · OTT" },
    fuel:      { name: "주유" },
    transit:   { name: "교통 · 이동" },
    telecom:   { name: "통신 · 공과금" },
    health:    { name: "병원 · 약국" },
    digital:   { name: "가전 · 디지털" },
    dept:      { name: "백화점 · 아울렛" },
    living:    { name: "생활 · 가구" },
    pet:       { name: "반려동물" }
  },

  /* 결제처 — 별칭(aliases)으로도 검색되고, 초성 검색도 됩니다 */
  merchants: [
    { id: "coupang",   name: "쿠팡",        category: "online", aliases: ["coupang", "로켓배송"] },
    { id: "11st",      name: "11번가",      category: "online", aliases: ["십일번가", "11st"] },
    { id: "gmarket",   name: "G마켓",       category: "online", aliases: ["지마켓", "gmarket"] },
    { id: "auction",   name: "옥션",        category: "online", aliases: ["auction"] },
    { id: "ssgcom",    name: "SSG닷컴",     category: "online", aliases: ["쓱닷컴", "ssg", "신세계몰"] },
    { id: "navershop", name: "네이버쇼핑",   category: "online", aliases: ["스마트스토어", "naver"] },
    { id: "lotteon",   name: "롯데온",      category: "online", aliases: ["lotteon", "롯데닷컴"] },
    { id: "tmon",      name: "티몬",        category: "online", aliases: ["tmon"] },
    { id: "wemakeprice", name: "위메프",    category: "online", aliases: ["wemakeprice", "위메프몰"] },
    { id: "cjonstyle", name: "CJ온스타일",  category: "online", aliases: ["cj몰", "오쇼핑"] },
    { id: "gsshop",    name: "GS샵",       category: "online", aliases: ["gsshop", "gs홈쇼핑"] },
    { id: "hmall",     name: "현대Hmall",   category: "online", aliases: ["hmall", "현대홈쇼핑"] },
    { id: "ali",       name: "알리익스프레스", category: "online", aliases: ["ali", "알리", "aliexpress"] },
    { id: "temu",      name: "테무",        category: "online", aliases: ["temu"] },
    { id: "iherb",     name: "아이허브",     category: "online", aliases: ["iherb"] },

    { id: "musinsa",   name: "무신사",      category: "fashion", aliases: ["musinsa"] },
    { id: "kream",     name: "KREAM",      category: "fashion", aliases: ["크림", "kream", "리셀"] },
    { id: "soldout",   name: "솔드아웃",     category: "fashion", aliases: ["soldout"] },
    { id: "29cm",      name: "29CM",       category: "fashion", aliases: ["이십구센티", "29씨엠"] },
    { id: "wconcept",  name: "W컨셉",       category: "fashion", aliases: ["wconcept", "더블유컨셉"] },
    { id: "balaan",    name: "발란",        category: "fashion", aliases: ["balaan"] },
    { id: "trenbe",    name: "트렌비",      category: "fashion", aliases: ["trenbe"] },
    { id: "mustit",    name: "머스트잇",     category: "fashion", aliases: ["mustit"] },
    { id: "ably",      name: "에이블리",     category: "fashion", aliases: ["ably"] },
    { id: "zigzag",    name: "지그재그",     category: "fashion", aliases: ["zigzag"] },
    { id: "uniqlo",    name: "유니클로",     category: "fashion", aliases: ["uniqlo"] },
    { id: "topten",    name: "탑텐",        category: "fashion", aliases: ["topten"] },
    { id: "abcmart",   name: "ABC마트",     category: "fashion", aliases: ["abcmart", "에이비씨마트"] },
    { id: "nike",      name: "나이키",      category: "fashion", aliases: ["nike"] },
    { id: "adidas",    name: "아디다스",     category: "fashion", aliases: ["adidas"] },

    { id: "oliveyoung", name: "올리브영",    category: "beauty", aliases: ["oliveyoung", "올영"] },
    { id: "sicor",     name: "시코르",      category: "beauty", aliases: ["chicor"] },
    { id: "innisfree", name: "이니스프리",   category: "beauty", aliases: ["innisfree"] },
    { id: "lalavla",   name: "랄라블라",     category: "beauty", aliases: ["lalavla"] },

    { id: "emart",     name: "이마트",      category: "grocery", aliases: ["emart"] },
    { id: "homeplus",  name: "홈플러스",     category: "grocery", aliases: ["homeplus", "홈플"] },
    { id: "lottemart", name: "롯데마트",     category: "grocery", aliases: ["lottemart"] },
    { id: "costco",    name: "코스트코",     category: "grocery", aliases: ["costco"] },
    { id: "traders",   name: "트레이더스",   category: "grocery", aliases: ["traders"] },
    { id: "kurly",     name: "컬리",        category: "grocery", aliases: ["마켓컬리", "kurly"] },
    { id: "oasis",     name: "오아시스마켓",  category: "grocery", aliases: ["oasis"] },
    { id: "hanaro",    name: "하나로마트",    category: "grocery", aliases: ["농협마트"] },

    { id: "gs25",      name: "GS25",       category: "cvs", aliases: ["지에스25"] },
    { id: "cu",        name: "CU",         category: "cvs", aliases: ["씨유"] },
    { id: "seven",     name: "세븐일레븐",   category: "cvs", aliases: ["7eleven", "세븐"] },
    { id: "emart24",   name: "이마트24",    category: "cvs", aliases: ["emart24"] },

    { id: "baemin",    name: "배달의민족",   category: "delivery", aliases: ["배민", "baemin"] },
    { id: "yogiyo",    name: "요기요",      category: "delivery", aliases: ["yogiyo"] },
    { id: "coupangeats", name: "쿠팡이츠",  category: "delivery", aliases: ["이츠", "eats"] },
    { id: "ddangyo",   name: "땡겨요",      category: "delivery", aliases: ["ddangyo"] },

    { id: "starbucks", name: "스타벅스",     category: "cafe", aliases: ["스벅", "starbucks"] },
    { id: "twosome",   name: "투썸플레이스",  category: "cafe", aliases: ["twosome", "투썸"] },
    { id: "megacoffee", name: "메가MGC커피", category: "cafe", aliases: ["메가커피", "mega"] },
    { id: "compose",   name: "컴포즈커피",   category: "cafe", aliases: ["compose"] },
    { id: "ediya",     name: "이디야커피",   category: "cafe", aliases: ["ediya"] },
    { id: "paikdabang", name: "빽다방",     category: "cafe", aliases: ["paik"] },
    { id: "hollys",    name: "할리스",      category: "cafe", aliases: ["hollys"] },

    { id: "mcdonalds", name: "맥도날드",     category: "dining", aliases: ["맥날", "mcdonalds"] },
    { id: "burgerking", name: "버거킹",     category: "dining", aliases: ["burgerking", "버거깅"] },
    { id: "lotteria",  name: "롯데리아",     category: "dining", aliases: ["lotteria"] },
    { id: "kyochon",   name: "교촌치킨",     category: "dining", aliases: ["kyochon"] },
    { id: "bbq",       name: "BBQ",        category: "dining", aliases: ["비비큐"] },
    { id: "bhc",       name: "bhc치킨",     category: "dining", aliases: ["비에이치씨"] },
    { id: "domino",    name: "도미노피자",   category: "dining", aliases: ["domino"] },
    { id: "subway",    name: "서브웨이",     category: "dining", aliases: ["subway"] },

    { id: "yanolja",   name: "야놀자",      category: "travel", aliases: ["yanolja"] },
    { id: "goodchoice", name: "여기어때",    category: "travel", aliases: ["goodchoice"] },
    { id: "agoda",     name: "아고다",      category: "travel", aliases: ["agoda"] },
    { id: "booking",   name: "부킹닷컴",     category: "travel", aliases: ["booking"] },
    { id: "trip",      name: "트립닷컴",     category: "travel", aliases: ["trip", "ctrip"] },
    { id: "myrealtrip", name: "마이리얼트립", category: "travel", aliases: ["myrealtrip"] },
    { id: "hanatour",  name: "하나투어",     category: "travel", aliases: ["hanatour"] },
    { id: "interparktour", name: "인터파크 투어", category: "travel", aliases: ["interpark"] },

    { id: "koreanair", name: "대한항공",     category: "air", aliases: ["koreanair", "kal"] },
    { id: "asiana",    name: "아시아나항공",  category: "air", aliases: ["asiana"] },
    { id: "jejuair",   name: "제주항공",     category: "air", aliases: ["jejuair"] },
    { id: "jinair",    name: "진에어",      category: "air", aliases: ["jinair"] },
    { id: "twayair",   name: "티웨이항공",   category: "air", aliases: ["tway"] },

    { id: "cgv",       name: "CGV",        category: "culture", aliases: ["씨지비"] },
    { id: "lottecinema", name: "롯데시네마", category: "culture", aliases: ["lottecinema"] },
    { id: "megabox",   name: "메가박스",     category: "culture", aliases: ["megabox"] },
    { id: "interparkticket", name: "인터파크 티켓", category: "culture", aliases: ["티켓"] },
    { id: "yes24",     name: "예스24",      category: "culture", aliases: ["yes24"] },
    { id: "kyobo",     name: "교보문고",     category: "culture", aliases: ["kyobo", "서점"] },
    { id: "aladin",    name: "알라딘",      category: "culture", aliases: ["aladin"] },

    { id: "netflix",   name: "넷플릭스",     category: "subscribe", aliases: ["netflix"] },
    { id: "youtube",   name: "유튜브 프리미엄", category: "subscribe", aliases: ["youtube", "유튜브"] },
    { id: "disney",    name: "디즈니+",     category: "subscribe", aliases: ["disney"] },
    { id: "tving",     name: "티빙",        category: "subscribe", aliases: ["tving"] },
    { id: "wavve",     name: "웨이브",      category: "subscribe", aliases: ["wavve"] },
    { id: "spotify",   name: "스포티파이",   category: "subscribe", aliases: ["spotify"] },
    { id: "millie",    name: "밀리의서재",   category: "subscribe", aliases: ["millie"] },

    { id: "skenergy",  name: "SK에너지",    category: "fuel", aliases: ["sk주유소"] },
    { id: "gscaltex",  name: "GS칼텍스",    category: "fuel", aliases: ["gs주유소"] },
    { id: "soil",      name: "S-OIL",      category: "fuel", aliases: ["에스오일"] },
    { id: "hdoilbank", name: "현대오일뱅크",  category: "fuel", aliases: ["오일뱅크"] },

    { id: "kakaot",    name: "카카오T",     category: "transit", aliases: ["kakaotaxi", "카카오택시"] },
    { id: "korail",    name: "코레일",      category: "transit", aliases: ["ktx", "레츠코레일"] },
    { id: "srt",       name: "SRT",        category: "transit", aliases: ["에스알티"] },
    { id: "tmap",      name: "티맵",        category: "transit", aliases: ["tmap"] },
    { id: "socar",     name: "쏘카",        category: "transit", aliases: ["socar"] },

    { id: "skt",       name: "SKT",        category: "telecom", aliases: ["에스케이티", "티월드"] },
    { id: "kt",        name: "KT",         category: "telecom", aliases: ["케이티"] },
    { id: "lguplus",   name: "LG U+",      category: "telecom", aliases: ["유플러스", "lgu"] },

    { id: "pharmacy",  name: "약국",        category: "health", aliases: ["드럭스토어"] },
    { id: "hospital",  name: "병원",        category: "health", aliases: ["의원", "치과"] },

    { id: "hitmart",   name: "롯데하이마트",  category: "digital", aliases: ["하이마트"] },
    { id: "applestore", name: "애플스토어",  category: "digital", aliases: ["apple", "애플"] },
    { id: "samsungstore", name: "삼성닷컴",  category: "digital", aliases: ["samsung"] },
    { id: "danawa",    name: "다나와",      category: "digital", aliases: ["danawa"] },

    { id: "lottedept", name: "롯데백화점",   category: "dept", aliases: ["롯데몰"] },
    { id: "shinsegae", name: "신세계백화점",  category: "dept", aliases: ["신세계"] },
    { id: "hyundaidept", name: "현대백화점", category: "dept", aliases: ["더현대"] },

    { id: "daiso",     name: "다이소",      category: "living", aliases: ["daiso"] },
    { id: "ikea",      name: "이케아",      category: "living", aliases: ["ikea"] },
    { id: "ohou",      name: "오늘의집",     category: "living", aliases: ["ohouse", "버킷플레이스"] },
    { id: "hanssem",   name: "한샘",        category: "living", aliases: ["hanssem"] },
    { id: "muji",      name: "무인양품",     category: "living", aliases: ["muji"] },

    { id: "petfriends", name: "펫프렌즈",    category: "pet", aliases: ["petfriends"] },
    { id: "aboutpet",  name: "어바웃펫",     category: "pet", aliases: ["aboutpet"] },
    { id: "animalhospital", name: "동물병원", category: "pet", aliases: ["펫병원"] }
  ],

  benefits: [
    /* ══ 업종 혜택 ══════════════════════════════════════════
       등록되지 않은 결제처도 업종만 맞으면 이 혜택들로 비교됩니다. */

    /* 온라인 종합몰 */
    { scope: "category", category: "online", app: "toss", kind: "rate", rate: 0.01, cap: 3000, minAmount: 10000,
      benefitType: "할인", condition: "토스페이에 카드 등록 후 결제", monthlyCap: "월 2회" },
    { scope: "category", category: "online", app: "kbpay", kind: "rate", rate: 0.005, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "KB Pay 온라인쇼핑 쿠폰 받고 KB국민카드 결제" },
    { scope: "category", category: "online", app: "naverpay", kind: "rate", rate: 0.005, cap: 3000,
      benefitType: "적립", condition: "네이버페이 카드 결제 시 포인트 적립" },
    { scope: "category", category: "online", app: "paybooc", kind: "rate", rate: 0.0055, cap: 5000, minAmount: 20000,
      benefitType: "할인", condition: "페이북 쿠폰 다운로드 후 신한카드 결제" },

    /* 패션 · 리셀 */
    { scope: "category", category: "fashion", app: "toss", kind: "rate", rate: 0.02, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "토스페이 카드 결제", monthlyCap: "월 1회" },
    { scope: "category", category: "fashion", app: "hyundai", kind: "rate", rate: 0.01, cap: 10000, minAmount: 50000,
      benefitType: "할인", condition: "현대카드 앱 패션 쿠폰 등록 후 결제" },
    { scope: "category", category: "fashion", app: "kakaopay", kind: "rate", rate: 0.015, cap: 4000, minAmount: 30000,
      benefitType: "할인", condition: "카카오페이에 카드 연결 후 결제" },
    { scope: "category", category: "fashion", app: "samsung", kind: "tiered", minAmount: 50000,
      tiers: [{ min: 50000, amount: 3000 }, { min: 150000, amount: 10000 }, { min: 300000, amount: 25000 }],
      benefitType: "할인", condition: "삼성카드 앱 패션업종 쿠폰 등록" },

    /* 뷰티 */
    { scope: "category", category: "beauty", app: "paybooc", kind: "rate", rate: 0.05, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "페이북 QR 결제 (신한카드)", monthlyCap: "월 1회" },
    { scope: "category", category: "beauty", app: "payco", kind: "rate", rate: 0.02, cap: 3000, minAmount: 20000,
      benefitType: "적립", condition: "페이코에 카드 등록 후 결제" },
    { scope: "category", category: "beauty", app: "lotte", kind: "fixed", amount: 3000, minAmount: 50000,
      benefitType: "할인", condition: "롯데카드 앱 뷰티 쿠폰 (선착순)" },

    /* 마트 · 장보기 */
    { scope: "category", category: "grocery", app: "samsung", kind: "tiered", minAmount: 50000,
      tiers: [{ min: 50000, amount: 3000 }, { min: 100000, amount: 7000 }, { min: 200000, amount: 15000 }],
      benefitType: "할인", condition: "삼성카드 앱 대형마트 쿠폰 등록" },
    { scope: "category", category: "grocery", app: "kbpay", kind: "rate", rate: 0.01, cap: 3000, minAmount: 30000,
      benefitType: "적립", condition: "KB Pay 결제 시 포인트리 적립" },
    { scope: "category", category: "grocery", app: "woori", kind: "rate", rate: 0.01, cap: 4000, minAmount: 30000,
      benefitType: "할인", condition: "우리WON카드 마트 쿠폰 받고 결제" },

    /* 편의점 */
    { scope: "category", category: "cvs", app: "kakaopay", kind: "rate", rate: 0.05, cap: 1000, minAmount: 5000,
      benefitType: "할인", condition: "카카오페이 바코드 결제 (카드 연결)", monthlyCap: "월 4회" },
    { scope: "category", category: "cvs", app: "paybooc", kind: "rate", rate: 0.05, cap: 1000, minAmount: 5000,
      benefitType: "할인", condition: "페이북 QR 결제 (신한카드)", monthlyCap: "월 4회" },
    { scope: "category", category: "cvs", app: "nhpay", kind: "rate", rate: 0.03, cap: 1000, minAmount: 5000,
      benefitType: "적립", condition: "NH페이 편의점 적립 (농협카드)" },

    /* 배달앱 */
    { scope: "category", category: "delivery", app: "toss", kind: "rate", rate: 0.05, cap: 2000, minAmount: 15000,
      benefitType: "할인", condition: "배달앱 결제수단에 토스페이 연결", monthlyCap: "월 2회" },
    { scope: "category", category: "delivery", app: "woori", kind: "rate", rate: 0.1, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "우리WON카드 배달 쿠폰 (선착순)" },
    { scope: "category", category: "delivery", app: "kbpay", kind: "fixed", amount: 2000, minAmount: 20000,
      benefitType: "할인", condition: "KB Pay 배달 쿠폰 받고 결제" },

    /* 카페 */
    { scope: "category", category: "cafe", app: "hyundai", kind: "rate", rate: 0.05, cap: 3000, minAmount: 10000,
      benefitType: "할인", condition: "현대카드 앱 커피 쿠폰 등록" },
    { scope: "category", category: "cafe", app: "toss", kind: "rate", rate: 0.1, cap: 500, minAmount: 3000,
      benefitType: "할인", condition: "토스 오프라인 카드 결제", monthlyCap: "일 1회" },
    { scope: "category", category: "cafe", app: "bccard", kind: "rate", rate: 0.03, cap: 1500, minAmount: 5000,
      benefitType: "적립", condition: "BC카드 페이북 마이태그 설정" },

    /* 외식 · 프랜차이즈 */
    { scope: "category", category: "dining", app: "hana", kind: "rate", rate: 0.05, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "하나카드 앱 외식 쿠폰 받고 결제" },
    { scope: "category", category: "dining", app: "kakaopay", kind: "rate", rate: 0.03, cap: 2000, minAmount: 15000,
      benefitType: "할인", condition: "카카오페이에 카드 연결 후 결제" },
    { scope: "category", category: "dining", app: "payco", kind: "fixed", amount: 1000, minAmount: 12000,
      benefitType: "할인", condition: "페이코 쿠폰 적용 (카드 결제)" },

    /* 여행 · 숙박 */
    { scope: "category", category: "travel", app: "hyundai", kind: "rate", rate: 0.07, cap: 20000, minAmount: 100000,
      benefitType: "할인", condition: "현대카드 앱 여행 쿠폰 등록", monthlyCap: "월 1회" },
    { scope: "category", category: "travel", app: "lotte", kind: "tiered", minAmount: 50000,
      tiers: [{ min: 50000, amount: 3000 }, { min: 150000, amount: 10000 }, { min: 300000, amount: 25000 }],
      benefitType: "할인", condition: "롯데카드 숙박 쿠폰 받고 결제" },
    { scope: "category", category: "travel", app: "toss", kind: "rate", rate: 0.02, cap: 5000, minAmount: 50000,
      benefitType: "할인", condition: "토스페이 카드 결제" },
    { scope: "category", category: "travel", app: "naverpay", kind: "rate", rate: 0.01, cap: 5000,
      benefitType: "적립", condition: "네이버페이 예약 후 카드 결제" },

    /* 항공 */
    { scope: "category", category: "air", app: "hana", kind: "rate", rate: 0.03, cap: 30000, minAmount: 200000,
      benefitType: "할인", condition: "하나카드 항공권 쿠폰 등록" },
    { scope: "category", category: "air", app: "samsung", kind: "fixed", amount: 20000, minAmount: 300000,
      benefitType: "할인", condition: "삼성카드 항공 제휴 쿠폰 (선착순)" },
    { scope: "category", category: "air", app: "hyundai", kind: "rate", rate: 0.01, cap: 50000,
      benefitType: "적립", condition: "현대카드 M포인트 적립" },

    /* 영화 · 공연 · 도서 */
    { scope: "category", category: "culture", app: "kakaopay", kind: "rate", rate: 0.03, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "카카오페이에 카드 연결 후 결제" },
    { scope: "category", category: "culture", app: "lotte", kind: "fixed", amount: 2000, minAmount: 15000,
      benefitType: "할인", condition: "롯데카드 문화 쿠폰 (선착순)" },
    { scope: "category", category: "culture", app: "samsung", kind: "rate", rate: 0.01, cap: 2000, minAmount: 10000,
      benefitType: "적립", condition: "삼성카드 문화업종 적립" },

    /* 구독 · OTT */
    { scope: "category", category: "subscribe", app: "hyundai", kind: "rate", rate: 0.1, cap: 3000, minAmount: 5000,
      benefitType: "할인", condition: "현대카드 구독 서비스 자동결제 등록", monthlyCap: "월 1회" },
    { scope: "category", category: "subscribe", app: "woori", kind: "rate", rate: 0.05, cap: 2000, minAmount: 5000,
      benefitType: "할인", condition: "우리WON카드 정기결제 쿠폰" },
    { scope: "category", category: "subscribe", app: "bccard", kind: "rate", rate: 0.03, cap: 1500, minAmount: 5000,
      benefitType: "적립", condition: "BC카드 페이북 마이태그(디지털구독) 설정" },

    /* 주유 */
    { scope: "category", category: "fuel", app: "hana", kind: "tiered", minAmount: 30000,
      tiers: [{ min: 30000, amount: 1500 }, { min: 50000, amount: 3000 }, { min: 100000, amount: 6000 }],
      benefitType: "할인", condition: "하나카드 주유 쿠폰 등록" },
    { scope: "category", category: "fuel", app: "kbpay", kind: "rate", rate: 0.02, cap: 3000, minAmount: 30000,
      benefitType: "할인", condition: "KB Pay 주유 쿠폰 받고 결제" },
    { scope: "category", category: "fuel", app: "nhpay", kind: "rate", rate: 0.01, cap: 2000, minAmount: 20000,
      benefitType: "적립", condition: "NH페이 주유 적립 (농협카드)" },

    /* 교통 · 이동 */
    { scope: "category", category: "transit", app: "kakaopay", kind: "rate", rate: 0.05, cap: 2000, minAmount: 5000,
      benefitType: "할인", condition: "카카오페이에 카드 연결 후 결제", monthlyCap: "월 2회" },
    { scope: "category", category: "transit", app: "toss", kind: "fixed", amount: 1000, minAmount: 8000,
      benefitType: "할인", condition: "토스페이 카드 결제" },
    { scope: "category", category: "transit", app: "woori", kind: "rate", rate: 0.02, cap: 2000, minAmount: 10000,
      benefitType: "적립", condition: "우리WON카드 교통 적립" },

    /* 통신 · 공과금 */
    { scope: "category", category: "telecom", app: "kbpay", kind: "rate", rate: 0.02, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "KB Pay 통신요금 자동납부 등록" },
    { scope: "category", category: "telecom", app: "lotte", kind: "fixed", amount: 3000, minAmount: 50000,
      benefitType: "할인", condition: "롯데카드 통신비 자동이체 쿠폰" },
    { scope: "category", category: "telecom", app: "bccard", kind: "rate", rate: 0.01, cap: 3000,
      benefitType: "적립", condition: "BC카드 페이북 마이태그(통신) 설정" },

    /* 병원 · 약국 */
    { scope: "category", category: "health", app: "bccard", kind: "rate", rate: 0.05, cap: 5000, minAmount: 30000,
      benefitType: "적립", condition: "BC카드 페이북 마이태그(병원·약국) 설정" },
    { scope: "category", category: "health", app: "kbpay", kind: "rate", rate: 0.02, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "KB Pay 생활업종 쿠폰 받고 결제" },

    /* 가전 · 디지털 */
    { scope: "category", category: "digital", app: "samsung", kind: "tiered", minAmount: 100000,
      tiers: [{ min: 100000, amount: 5000 }, { min: 500000, amount: 30000 }, { min: 1000000, amount: 70000 }],
      benefitType: "할인", condition: "삼성카드 앱 가전 쿠폰 등록" },
    { scope: "category", category: "digital", app: "hyundai", kind: "rate", rate: 0.01, cap: 30000, minAmount: 200000,
      benefitType: "할인", condition: "현대카드 디지털 쿠폰 등록" },
    { scope: "category", category: "digital", app: "toss", kind: "rate", rate: 0.005, cap: 5000, minAmount: 50000,
      benefitType: "할인", condition: "토스페이 카드 결제" },

    /* 백화점 · 아울렛 */
    { scope: "category", category: "dept", app: "lotte", kind: "rate", rate: 0.05, cap: 20000, minAmount: 100000,
      benefitType: "할인", condition: "롯데카드 백화점 쿠폰 (선착순)", monthlyCap: "월 1회" },
    { scope: "category", category: "dept", app: "samsung", kind: "rate", rate: 0.01, cap: 10000, minAmount: 50000,
      benefitType: "적립", condition: "삼성카드 백화점 적립" },

    /* 생활 · 가구 */
    { scope: "category", category: "living", app: "toss", kind: "rate", rate: 0.03, cap: 1000, minAmount: 5000,
      benefitType: "할인", condition: "토스 오프라인 카드 결제" },
    { scope: "category", category: "living", app: "kbpay", kind: "fixed", amount: 1000, minAmount: 20000,
      benefitType: "할인", condition: "KB Pay 생활업종 쿠폰 받고 결제" },
    { scope: "category", category: "living", app: "hana", kind: "rate", rate: 0.03, cap: 5000, minAmount: 50000,
      benefitType: "할인", condition: "하나카드 홈퍼니싱 쿠폰 등록" },

    /* 반려동물 */
    { scope: "category", category: "pet", app: "woori", kind: "rate", rate: 0.05, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "우리WON카드 펫 쿠폰 받고 결제" },
    { scope: "category", category: "pet", app: "bccard", kind: "rate", rate: 0.03, cap: 2000, minAmount: 10000,
      benefitType: "적립", condition: "BC카드 페이북 마이태그(반려동물) 설정" },

    /* ══ 가맹점 전용 제휴 ═══════════════════════════════════ */

    { scope: "merchant", merchant: "kream", app: "toss", kind: "rate", rate: 0.03, cap: 10000, minAmount: 50000,
      benefitType: "할인", condition: "KREAM 결제수단에 토스페이 연결", monthlyCap: "월 1회" },
    { scope: "merchant", merchant: "kream", app: "hyundai", kind: "rate", rate: 0.02, cap: 20000, minAmount: 100000,
      benefitType: "할인", condition: "현대카드 앱 KREAM 제휴 쿠폰 등록" },
    { scope: "merchant", merchant: "kream", app: "naverpay", kind: "rate", rate: 0.01, cap: 5000,
      benefitType: "적립", condition: "네이버페이 카드 결제 시 포인트 적립" },
    { scope: "merchant", merchant: "kream", app: "kbpay", kind: "fixed", amount: 5000, minAmount: 200000,
      benefitType: "할인", condition: "KB Pay 리셀 플랫폼 쿠폰 (선착순)" },

    { scope: "merchant", merchant: "coupang", app: "kbpay", kind: "rate", rate: 0.01, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "KB Pay 쿠팡 쿠폰 받고 KB국민카드 결제", monthlyCap: "월 1회" },
    { scope: "merchant", merchant: "coupang", app: "hyundai", kind: "tiered", minAmount: 30000,
      tiers: [{ min: 30000, amount: 2000 }, { min: 70000, amount: 5000 }, { min: 150000, amount: 12000 }],
      benefitType: "할인", condition: "현대카드 M계열 결제" },

    { scope: "merchant", merchant: "11st", app: "toss", kind: "rate", rate: 0.02, cap: 3000, minAmount: 10000,
      benefitType: "할인", condition: "11번가 결제수단에 토스페이 연결", monthlyCap: "월 1회" },
    { scope: "merchant", merchant: "11st", app: "smilepay", kind: "rate", rate: 0.01, cap: 2000, minAmount: 20000,
      benefitType: "적립", condition: "스마일페이에 카드 등록 후 결제" },

    { scope: "merchant", merchant: "gmarket", app: "smilepay", kind: "rate", rate: 0.02, cap: 5000, minAmount: 20000,
      benefitType: "할인", condition: "스마일페이에 카드 등록 후 결제" },
    { scope: "merchant", merchant: "auction", app: "smilepay", kind: "rate", rate: 0.02, cap: 5000, minAmount: 20000,
      benefitType: "할인", condition: "스마일페이에 카드 등록 후 결제" },

    { scope: "merchant", merchant: "ssgcom", app: "ssgpay", kind: "rate", rate: 0.03, cap: 6000, minAmount: 30000,
      benefitType: "할인", condition: "SSG페이에 카드 등록 후 결제", monthlyCap: "월 2회" },
    { scope: "merchant", merchant: "emart", app: "ssgpay", kind: "rate", rate: 0.02, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "SSG페이에 카드 등록 후 결제", monthlyCap: "월 2회" },

    { scope: "merchant", merchant: "navershop", app: "naverpay", kind: "rate", rate: 0.025, cap: 20000,
      benefitType: "적립", condition: "네이버페이 카드 결제 + 멤버십 가입", note: "적립률은 멤버십 등급에 따라 달라집니다." },

    { scope: "merchant", merchant: "musinsa", app: "toss", kind: "rate", rate: 0.03, cap: 6000, minAmount: 30000,
      benefitType: "할인", condition: "무신사 결제수단에 토스페이 연결", monthlyCap: "월 1회" },
    { scope: "merchant", merchant: "musinsa", app: "lotte", kind: "fixed", amount: 5000, minAmount: 100000,
      benefitType: "할인", condition: "롯데카드 앱 무신사 쿠폰 등록" },

    { scope: "merchant", merchant: "oliveyoung", app: "paybooc", kind: "rate", rate: 0.05, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "페이북 QR 결제 (신한카드)", monthlyCap: "월 1회" },

    { scope: "merchant", merchant: "baemin", app: "toss", kind: "rate", rate: 0.05, cap: 2000, minAmount: 15000,
      benefitType: "할인", condition: "배민 결제수단에 토스페이 연결", monthlyCap: "월 2회" },
    { scope: "merchant", merchant: "yogiyo", app: "kakaopay", kind: "rate", rate: 0.07, cap: 3000, minAmount: 15000,
      benefitType: "할인", condition: "카카오페이에 카드 연결 후 결제", monthlyCap: "월 1회" },
    { scope: "merchant", merchant: "coupangeats", app: "hyundai", kind: "rate", rate: 0.1, cap: 5000, minAmount: 20000,
      benefitType: "할인", condition: "현대카드 쿠팡이츠 제휴 쿠폰", monthlyCap: "월 2회" },

    { scope: "merchant", merchant: "starbucks", app: "paybooc", kind: "rate", rate: 0.1, cap: 2000, minAmount: 10000,
      benefitType: "할인", condition: "페이북 스타벅스 쿠폰 (신한카드)", monthlyCap: "월 1회" },
    { scope: "merchant", merchant: "starbucks", app: "nhpay", kind: "rate", rate: 0.02, cap: 2000,
      benefitType: "적립", condition: "NH페이 카드 결제 적립" },

    { scope: "merchant", merchant: "cgv", app: "hyundai", kind: "fixed", amount: 3000, minAmount: 12000,
      benefitType: "할인", condition: "현대카드 CGV 제휴 쿠폰", monthlyCap: "월 2회" },
    { scope: "merchant", merchant: "megabox", app: "woori", kind: "fixed", amount: 2000, minAmount: 10000,
      benefitType: "할인", condition: "우리WON카드 영화 쿠폰 (선착순)" },

    { scope: "merchant", merchant: "netflix", app: "hyundai", kind: "rate", rate: 0.1, cap: 3000, minAmount: 5000,
      benefitType: "할인", condition: "현대카드 넷플릭스 자동결제 등록", monthlyCap: "월 1회" },
    { scope: "merchant", merchant: "youtube", app: "toss", kind: "fixed", amount: 1000, minAmount: 10000,
      benefitType: "할인", condition: "토스페이 자동결제 등록" },

    { scope: "merchant", merchant: "yanolja", app: "lotte", kind: "tiered", minAmount: 50000,
      tiers: [{ min: 50000, amount: 3000 }, { min: 150000, amount: 10000 }, { min: 300000, amount: 25000 }],
      benefitType: "할인", condition: "롯데카드 야놀자 제휴 쿠폰" },
    { scope: "merchant", merchant: "goodchoice", app: "kbpay", kind: "rate", rate: 0.05, cap: 10000, minAmount: 50000,
      benefitType: "할인", condition: "KB Pay 여기어때 쿠폰 (선착순)" },

    { scope: "merchant", merchant: "kakaot", app: "kakaopay", kind: "rate", rate: 0.1, cap: 3000, minAmount: 5000,
      benefitType: "할인", condition: "카카오T에 카카오페이(카드) 연결", monthlyCap: "월 2회" },

    { scope: "merchant", merchant: "ikea", app: "hana", kind: "rate", rate: 0.05, cap: 10000, minAmount: 100000,
      benefitType: "할인", condition: "하나카드 이케아 제휴 쿠폰" },
    { scope: "merchant", merchant: "ohou", app: "toss", kind: "rate", rate: 0.02, cap: 5000, minAmount: 50000,
      benefitType: "할인", condition: "오늘의집 결제수단에 토스페이 연결" },

    { scope: "merchant", merchant: "daiso", app: "toss", kind: "rate", rate: 0.03, cap: 1000, minAmount: 5000,
      benefitType: "할인", condition: "토스 오프라인 카드 결제" },

    { scope: "merchant", merchant: "kurly", app: "kbpay", kind: "rate", rate: 0.05, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "KB Pay 컬리 첫 결제 쿠폰", monthlyCap: "최초 1회" },

    { scope: "merchant", merchant: "kyobo", app: "kakaopay", kind: "rate", rate: 0.03, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "카카오페이에 카드 연결 후 결제" },

    { scope: "merchant", merchant: "koreanair", app: "hyundai", kind: "rate", rate: 0.015, cap: 50000, minAmount: 300000,
      benefitType: "적립", condition: "현대카드 대한항공 마일리지 적립" },
    { scope: "merchant", merchant: "jejuair", app: "samsung", kind: "fixed", amount: 10000, minAmount: 150000,
      benefitType: "할인", condition: "삼성카드 제주항공 제휴 쿠폰 (선착순)" },

    { scope: "merchant", merchant: "applestore", app: "hyundai", kind: "rate", rate: 0.02, cap: 50000, minAmount: 500000,
      benefitType: "할인", condition: "현대카드 Apple 전용 혜택" },
    { scope: "merchant", merchant: "hitmart", app: "samsung", kind: "tiered", minAmount: 100000,
      tiers: [{ min: 100000, amount: 5000 }, { min: 500000, amount: 30000 }],
      benefitType: "할인", condition: "삼성카드 하이마트 제휴 쿠폰" },

    { scope: "merchant", merchant: "lottedept", app: "lotte", kind: "rate", rate: 0.05, cap: 30000, minAmount: 100000,
      benefitType: "할인", condition: "롯데카드 백화점 제휴 쿠폰", monthlyCap: "월 1회" }
  ]
};

/**
 * 결제처별 카드사앱 · 핀테크앱 할인 혜택 데이터
 *
 * ⚠️ 여기 담긴 수치는 구조를 보여주기 위한 예시 데이터입니다.
 *    실제 혜택은 매달 바뀌므로 각 앱의 "혜택 / 이벤트" 탭에서 확인한 뒤 값을 고쳐 주세요.
 *
 * 혜택 한 건의 형태 (kind 에 따라 필요한 필드가 다릅니다)
 *   kind: "rate"   → rate(할인율 0~1), cap(할인 한도, 없으면 생략)
 *   kind: "fixed"  → amount(정액 할인액)
 *   kind: "tiered" → tiers: [{ min: 결제금액, amount: 할인액 }, ...]
 *
 * 공통 필드
 *   merchant     결제처 id
 *   app          앱 id
 *   minAmount    최소 결제금액 (없으면 생략)
 *   benefitType  "할인" | "적립"   (적립은 포인트/캐시백으로 돌려받는 형태)
 *   condition    충족해야 하는 조건 한 줄 (쿠폰 다운로드, 특정 카드 연결 등)
 *   monthlyCap   월 통합 한도 안내 (계산에는 쓰지 않고 표시만 합니다)
 *   note         참고 사항
 */
window.DISCOUNT_DB = {
  updatedAt: "2026-09-01",
  source: "예시 데이터 — 각 앱 공지 기준으로 직접 갱신해 주세요.",

  apps: {
    toss:      { name: "토스",            kind: "핀테크",  short: "toss" },
    kakaopay:  { name: "카카오페이",       kind: "핀테크",  short: "kakao" },
    naverpay:  { name: "네이버페이",       kind: "핀테크",  short: "npay" },
    payco:     { name: "페이코",          kind: "핀테크",  short: "payco" },
    paybooc:   { name: "페이북 (신한카드)", kind: "카드사",  short: "shinhan" },
    kbpay:     { name: "KB Pay (국민카드)", kind: "카드사", short: "kb" },
    hyundai:   { name: "현대카드",         kind: "카드사",  short: "hyundai" },
    samsung:   { name: "삼성카드",         kind: "카드사",  short: "samsung" },
    lotte:     { name: "롯데카드",         kind: "카드사",  short: "lotte" },
    woori:     { name: "우리WON카드",      kind: "카드사",  short: "woori" },
    hana:      { name: "하나카드",         kind: "카드사",  short: "hana" },
    nhpay:     { name: "NH페이",          kind: "카드사",  short: "nh" },
    ssgpay:    { name: "SSG페이",         kind: "간편결제", short: "ssg" },
    smilepay:  { name: "스마일페이",        kind: "간편결제", short: "smile" }
  },

  merchants: [
    { id: "11st",     name: "11번가",        category: "온라인 쇼핑", aliases: ["십일번가", "11st", "sk11"] },
    { id: "coupang",  name: "쿠팡",          category: "온라인 쇼핑", aliases: ["coupang", "로켓배송"] },
    { id: "gmarket",  name: "G마켓",         category: "온라인 쇼핑", aliases: ["지마켓", "gmarket", "옥션"] },
    { id: "ssgcom",   name: "SSG닷컴",       category: "온라인 쇼핑", aliases: ["쓱닷컴", "ssg", "신세계몰"] },
    { id: "navershop",name: "네이버쇼핑",     category: "온라인 쇼핑", aliases: ["스마트스토어", "naver"] },
    { id: "kurly",    name: "컬리",          category: "장보기",     aliases: ["마켓컬리", "kurly"] },
    { id: "musinsa",  name: "무신사",        category: "패션",       aliases: ["musinsa"] },
    { id: "oliveyoung",name: "올리브영",      category: "뷰티",       aliases: ["oliveyoung", "올영"] },
    { id: "baemin",   name: "배달의민족",     category: "배달",       aliases: ["배민", "baemin"] },
    { id: "yogiyo",   name: "요기요",        category: "배달",       aliases: ["yogiyo"] },
    { id: "coupangeats", name: "쿠팡이츠",   category: "배달",       aliases: ["이츠", "eats"] },
    { id: "starbucks",name: "스타벅스",       category: "카페",       aliases: ["스벅", "starbucks"] },
    { id: "megacoffee",name: "메가MGC커피",  category: "카페",       aliases: ["메가커피", "mega"] },
    { id: "emart",    name: "이마트",        category: "장보기",     aliases: ["emart", "이마트몰"] },
    { id: "homeplus", name: "홈플러스",       category: "장보기",     aliases: ["homeplus", "홈플"] },
    { id: "gs25",     name: "GS25",         category: "편의점",     aliases: ["지에스25", "gs"] },
    { id: "cu",       name: "CU",           category: "편의점",     aliases: ["씨유", "cu편의점"] },
    { id: "daiso",    name: "다이소",        category: "생활",       aliases: ["daiso"] },
    { id: "kyobo",    name: "교보문고",       category: "생활",       aliases: ["kyobo", "서점"] },
    { id: "yanolja",  name: "야놀자",        category: "여행",       aliases: ["yanolja", "숙박"] }
  ],

  benefits: [
    /* ── 11번가 ───────────────────────────────────────────── */
    { merchant: "11st", app: "toss", kind: "rate", rate: 0.02, cap: 3000, minAmount: 10000,
      benefitType: "할인", condition: "토스결제 선택", monthlyCap: "월 1회" },
    { merchant: "11st", app: "paybooc", kind: "rate", rate: 0.0055, cap: 5000, minAmount: 20000,
      benefitType: "할인", condition: "페이북 쿠폰 다운로드 후 신한카드 결제" },
    { merchant: "11st", app: "kakaopay", kind: "fixed", amount: 2000, minAmount: 30000,
      benefitType: "할인", condition: "카카오페이머니 결제", monthlyCap: "월 1회" },
    { merchant: "11st", app: "smilepay", kind: "rate", rate: 0.01, cap: 2000, minAmount: 20000,
      benefitType: "적립", condition: "스마일캐시 충전결제" },

    /* ── 쿠팡 ─────────────────────────────────────────────── */
    { merchant: "coupang", app: "kbpay", kind: "rate", rate: 0.01, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "KB Pay 앱에서 쿠폰 받기", monthlyCap: "월 1회" },
    { merchant: "coupang", app: "naverpay", kind: "rate", rate: 0.005, cap: 3000,
      benefitType: "적립", condition: "네이버페이 포인트 적립" },
    { merchant: "coupang", app: "toss", kind: "fixed", amount: 1500, minAmount: 20000,
      benefitType: "할인", condition: "토스 쿠폰함에서 받기" },
    { merchant: "coupang", app: "hyundai", kind: "tiered", minAmount: 30000,
      tiers: [{ min: 30000, amount: 2000 }, { min: 70000, amount: 5000 }, { min: 150000, amount: 12000 }],
      benefitType: "할인", condition: "현대카드 M계열 결제" },

    /* ── G마켓 ────────────────────────────────────────────── */
    { merchant: "gmarket", app: "smilepay", kind: "rate", rate: 0.02, cap: 5000, minAmount: 20000,
      benefitType: "할인", condition: "스마일페이 간편결제" },
    { merchant: "gmarket", app: "toss", kind: "rate", rate: 0.01, cap: 2000, minAmount: 10000,
      benefitType: "할인", condition: "토스결제 선택" },
    { merchant: "gmarket", app: "kbpay", kind: "fixed", amount: 3000, minAmount: 50000,
      benefitType: "할인", condition: "선착순 쿠폰 (소진 시 종료)" },

    /* ── SSG닷컴 ──────────────────────────────────────────── */
    { merchant: "ssgcom", app: "ssgpay", kind: "rate", rate: 0.03, cap: 6000, minAmount: 30000,
      benefitType: "할인", condition: "SSG페이 머니 결제", monthlyCap: "월 2회" },
    { merchant: "ssgcom", app: "samsung", kind: "rate", rate: 0.007, cap: 4000, minAmount: 20000,
      benefitType: "할인", condition: "삼성카드 앱 쿠폰 등록" },
    { merchant: "ssgcom", app: "naverpay", kind: "rate", rate: 0.01, cap: 3000,
      benefitType: "적립", condition: "네이버페이 결제" },

    /* ── 네이버쇼핑 ────────────────────────────────────────── */
    { merchant: "navershop", app: "naverpay", kind: "rate", rate: 0.025, cap: 20000,
      benefitType: "적립", condition: "멤버십 가입 시 추가 적립", note: "적립률은 멤버십 등급에 따라 달라집니다." },
    { merchant: "navershop", app: "toss", kind: "rate", rate: 0.005, cap: 1500, minAmount: 10000,
      benefitType: "할인", condition: "토스 간편결제 연결" },
    { merchant: "navershop", app: "hyundai", kind: "rate", rate: 0.01, cap: 5000, minAmount: 50000,
      benefitType: "할인", condition: "현대카드 네이버 제휴 쿠폰" },

    /* ── 컬리 ─────────────────────────────────────────────── */
    { merchant: "kurly", app: "kbpay", kind: "rate", rate: 0.05, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "KB Pay 첫 결제 한정", monthlyCap: "최초 1회" },
    { merchant: "kurly", app: "toss", kind: "fixed", amount: 3000, minAmount: 40000,
      benefitType: "할인", condition: "토스 쿠폰함에서 받기" },
    { merchant: "kurly", app: "payco", kind: "rate", rate: 0.015, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "페이코 포인트 결제" },

    /* ── 무신사 ───────────────────────────────────────────── */
    { merchant: "musinsa", app: "toss", kind: "rate", rate: 0.03, cap: 6000, minAmount: 30000,
      benefitType: "할인", condition: "토스결제 선택", monthlyCap: "월 1회" },
    { merchant: "musinsa", app: "kakaopay", kind: "rate", rate: 0.02, cap: 4000, minAmount: 30000,
      benefitType: "할인", condition: "카카오페이 결제" },
    { merchant: "musinsa", app: "lotte", kind: "fixed", amount: 5000, minAmount: 100000,
      benefitType: "할인", condition: "롯데카드 앱 쿠폰 등록" },

    /* ── 올리브영 ─────────────────────────────────────────── */
    { merchant: "oliveyoung", app: "paybooc", kind: "rate", rate: 0.05, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "페이북 QR 결제", monthlyCap: "월 1회" },
    { merchant: "oliveyoung", app: "kakaopay", kind: "rate", rate: 0.01, cap: 2000, minAmount: 10000,
      benefitType: "할인", condition: "카카오페이 오프라인 결제" },
    { merchant: "oliveyoung", app: "payco", kind: "rate", rate: 0.02, cap: 3000, minAmount: 20000,
      benefitType: "적립", condition: "페이코 포인트 적립" },

    /* ── 배달의민족 ────────────────────────────────────────── */
    { merchant: "baemin", app: "toss", kind: "rate", rate: 0.05, cap: 2000, minAmount: 15000,
      benefitType: "할인", condition: "배민 결제수단에 토스 연결", monthlyCap: "월 2회" },
    { merchant: "baemin", app: "kbpay", kind: "fixed", amount: 2000, minAmount: 20000,
      benefitType: "할인", condition: "KB Pay 쿠폰 다운로드" },
    { merchant: "baemin", app: "woori", kind: "rate", rate: 0.1, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "우리WON카드 배달 쿠폰 (선착순)" },
    { merchant: "baemin", app: "naverpay", kind: "rate", rate: 0.01, cap: 1000,
      benefitType: "적립", condition: "네이버페이 주문" },

    /* ── 요기요 ───────────────────────────────────────────── */
    { merchant: "yogiyo", app: "kakaopay", kind: "rate", rate: 0.07, cap: 3000, minAmount: 15000,
      benefitType: "할인", condition: "카카오페이 결제", monthlyCap: "월 1회" },
    { merchant: "yogiyo", app: "payco", kind: "fixed", amount: 2000, minAmount: 17000,
      benefitType: "할인", condition: "페이코 쿠폰 적용" },
    { merchant: "yogiyo", app: "hana", kind: "rate", rate: 0.05, cap: 2000, minAmount: 20000,
      benefitType: "할인", condition: "하나카드 요기요 제휴 쿠폰" },

    /* ── 쿠팡이츠 ─────────────────────────────────────────── */
    { merchant: "coupangeats", app: "hyundai", kind: "rate", rate: 0.1, cap: 5000, minAmount: 20000,
      benefitType: "할인", condition: "현대카드 쿠팡이츠 제휴", monthlyCap: "월 2회" },
    { merchant: "coupangeats", app: "toss", kind: "fixed", amount: 1000, minAmount: 12000,
      benefitType: "할인", condition: "토스결제 선택" },

    /* ── 스타벅스 ─────────────────────────────────────────── */
    { merchant: "starbucks", app: "paybooc", kind: "rate", rate: 0.1, cap: 2000, minAmount: 10000,
      benefitType: "할인", condition: "스타벅스 카드 충전 시", monthlyCap: "월 1회" },
    { merchant: "starbucks", app: "hyundai", kind: "rate", rate: 0.05, cap: 3000, minAmount: 10000,
      benefitType: "할인", condition: "현대카드 커피 쿠폰" },
    { merchant: "starbucks", app: "kakaopay", kind: "fixed", amount: 1000, minAmount: 10000,
      benefitType: "할인", condition: "카카오페이 바코드 결제" },
    { merchant: "starbucks", app: "nhpay", kind: "rate", rate: 0.02, cap: 2000,
      benefitType: "적립", condition: "NH페이 포인트 적립" },

    /* ── 메가MGC커피 ──────────────────────────────────────── */
    { merchant: "megacoffee", app: "toss", kind: "rate", rate: 0.1, cap: 500, minAmount: 3000,
      benefitType: "할인", condition: "토스 오프라인 결제", monthlyCap: "일 1회" },
    { merchant: "megacoffee", app: "kakaopay", kind: "fixed", amount: 300, minAmount: 2000,
      benefitType: "할인", condition: "카카오페이 바코드 결제" },

    /* ── 이마트 ───────────────────────────────────────────── */
    { merchant: "emart", app: "ssgpay", kind: "rate", rate: 0.02, cap: 5000, minAmount: 30000,
      benefitType: "할인", condition: "SSG페이 결제", monthlyCap: "월 2회" },
    { merchant: "emart", app: "samsung", kind: "tiered", minAmount: 50000,
      tiers: [{ min: 50000, amount: 3000 }, { min: 100000, amount: 7000 }, { min: 200000, amount: 15000 }],
      benefitType: "할인", condition: "삼성카드 대형마트 쿠폰" },
    { merchant: "emart", app: "kbpay", kind: "rate", rate: 0.01, cap: 3000, minAmount: 30000,
      benefitType: "적립", condition: "KB Pay 포인트리 적립" },

    /* ── 홈플러스 ─────────────────────────────────────────── */
    { merchant: "homeplus", app: "payco", kind: "rate", rate: 0.03, cap: 4000, minAmount: 30000,
      benefitType: "할인", condition: "페이코 오프라인 결제" },
    { merchant: "homeplus", app: "lotte", kind: "fixed", amount: 5000, minAmount: 70000,
      benefitType: "할인", condition: "롯데카드 마트 쿠폰 (선착순)" },
    { merchant: "homeplus", app: "woori", kind: "rate", rate: 0.01, cap: 3000, minAmount: 20000,
      benefitType: "적립", condition: "우리WON카드 포인트 적립" },

    /* ── GS25 ─────────────────────────────────────────────── */
    { merchant: "gs25", app: "kakaopay", kind: "rate", rate: 0.05, cap: 1000, minAmount: 5000,
      benefitType: "할인", condition: "카카오페이 바코드 결제", monthlyCap: "월 4회" },
    { merchant: "gs25", app: "toss", kind: "fixed", amount: 500, minAmount: 5000,
      benefitType: "할인", condition: "토스 오프라인 결제" },
    { merchant: "gs25", app: "nhpay", kind: "rate", rate: 0.03, cap: 1000, minAmount: 5000,
      benefitType: "적립", condition: "NH페이 편의점 적립" },

    /* ── CU ───────────────────────────────────────────────── */
    { merchant: "cu", app: "paybooc", kind: "rate", rate: 0.05, cap: 1000, minAmount: 5000,
      benefitType: "할인", condition: "페이북 QR 결제", monthlyCap: "월 4회" },
    { merchant: "cu", app: "payco", kind: "fixed", amount: 500, minAmount: 4000,
      benefitType: "할인", condition: "페이코 바코드 결제" },
    { merchant: "cu", app: "hana", kind: "rate", rate: 0.02, cap: 1000, minAmount: 5000,
      benefitType: "적립", condition: "하나카드 편의점 적립" },

    /* ── 다이소 ───────────────────────────────────────────── */
    { merchant: "daiso", app: "toss", kind: "rate", rate: 0.03, cap: 1000, minAmount: 5000,
      benefitType: "할인", condition: "토스 오프라인 결제" },
    { merchant: "daiso", app: "kbpay", kind: "fixed", amount: 1000, minAmount: 20000,
      benefitType: "할인", condition: "KB Pay 생활업종 쿠폰" },

    /* ── 교보문고 ─────────────────────────────────────────── */
    { merchant: "kyobo", app: "kakaopay", kind: "rate", rate: 0.03, cap: 3000, minAmount: 20000,
      benefitType: "할인", condition: "카카오페이 결제" },
    { merchant: "kyobo", app: "samsung", kind: "rate", rate: 0.01, cap: 2000, minAmount: 10000,
      benefitType: "적립", condition: "삼성카드 문화업종 적립" },

    /* ── 야놀자 ───────────────────────────────────────────── */
    { merchant: "yanolja", app: "hyundai", kind: "rate", rate: 0.07, cap: 20000, minAmount: 100000,
      benefitType: "할인", condition: "현대카드 여행 쿠폰", monthlyCap: "월 1회" },
    { merchant: "yanolja", app: "toss", kind: "rate", rate: 0.02, cap: 5000, minAmount: 50000,
      benefitType: "할인", condition: "토스결제 선택" },
    { merchant: "yanolja", app: "lotte", kind: "tiered", minAmount: 50000,
      tiers: [{ min: 50000, amount: 3000 }, { min: 150000, amount: 10000 }, { min: 300000, amount: 25000 }],
      benefitType: "할인", condition: "롯데카드 숙박 쿠폰" },
    { merchant: "yanolja", app: "naverpay", kind: "rate", rate: 0.01, cap: 5000,
      benefitType: "적립", condition: "네이버페이 예약" }
  ]
};

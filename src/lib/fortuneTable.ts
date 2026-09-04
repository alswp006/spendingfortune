import type { FortuneType, FortuneTypeId } from "@/lib/types";
import type { getCharacterImageFn, getFortuneMessageFn } from "@/lib/contract";

// 12유형 캐릭터 테이블 — 전부 하드코딩(생성형 AI 미사용)
export const TYPE_TABLE: Record<FortuneTypeId, FortuneType> = {
  gourmet_saver: {
    id: "gourmet_saver",
    name: "미식 알뜰가",
    tagline: "맛있게 먹고 알뜰하게 남겨요",
    imageSrc: "/characters/gourmet_saver.png",
  },
  cafe_addict: {
    id: "cafe_addict",
    name: "카페 홀릭",
    tagline: "하루 한 잔은 포기 못 해요",
    imageSrc: "/characters/cafe_addict.png",
  },
  delivery_lord: {
    id: "delivery_lord",
    name: "배달의 제왕",
    tagline: "오늘도 문 앞에 봉투 도착해요",
    imageSrc: "/characters/delivery_lord.png",
  },
  smart_shopper: {
    id: "smart_shopper",
    name: "알뜰 쇼퍼",
    tagline: "할인가 아니면 안 사요",
    imageSrc: "/characters/smart_shopper.png",
  },
  wishlister: {
    id: "wishlister",
    name: "위시리스트 요정",
    tagline: "장바구니에 담아두기만 해요",
    imageSrc: "/characters/wishlister.png",
  },
  impulse_god: {
    id: "impulse_god",
    name: "충동구매의 신",
    tagline: "지르고 나서 생각해요",
    imageSrc: "/characters/impulse_god.png",
  },
  planner_cpa: {
    id: "planner_cpa",
    name: "가계부 회계사",
    tagline: "1원까지 맞아야 잠이 와요",
    imageSrc: "/characters/planner_cpa.png",
  },
  balance_master: {
    id: "balance_master",
    name: "밸런스 마스터",
    tagline: "쓸 땐 쓰고 모을 땐 모아요",
    imageSrc: "/characters/balance_master.png",
  },
  subscription_hell: {
    id: "subscription_hell",
    name: "구독 부자",
    tagline: "매달 나가는 돈이 셀 수 없어요",
    imageSrc: "/characters/subscription_hell.png",
  },
  zero_spender: {
    id: "zero_spender",
    name: "무지출의 신",
    tagline: "오늘 하루 지갑을 안 열었어요",
    imageSrc: "/characters/zero_spender.png",
  },
  dust_collector: {
    id: "dust_collector",
    name: "안 쓰는 수집가",
    tagline: "사놓고 한 번도 안 썼어요",
    imageSrc: "/characters/dust_collector.png",
  },
  flexer: {
    id: "flexer",
    name: "플렉스 대장",
    tagline: "보여주기 위해 소비해요",
    imageSrc: "/characters/flexer.png",
  },
};

// 카테고리 × 밴드 → 유형 매핑 — 12개 유형을 중복 없이 정확히 1회씩 사용
export const TYPE_MATRIX: Record<
  "EAT" | "SHOP" | "LIFE" | "MISC",
  Record<"high" | "mid" | "low", FortuneTypeId>
> = {
  EAT: { high: "gourmet_saver", mid: "cafe_addict", low: "delivery_lord" },
  SHOP: { high: "smart_shopper", mid: "wishlister", low: "impulse_god" },
  LIFE: { high: "balance_master", mid: "planner_cpa", low: "subscription_hell" },
  MISC: { high: "zero_spender", mid: "dust_collector", low: "flexer" },
};

type CopyEntry = { headline: string; advice: string; savingTip: string };

// 유형 × 밴드(high/mid/low) = 36조합 고정 문구 — 전부 하드코딩(생성형 AI 미사용)
export const COPY_TABLE: Record<FortuneTypeId, Record<"high" | "mid" | "low", CopyEntry>> = {
  gourmet_saver: {
    high: {
      headline: "오늘은 맛집에서 알뜰하게 즐긴 날이에요",
      advice: "좋아하는 메뉴를 골라도 지출이 자연스럽게 균형을 잡아요",
      savingTip: "점심 특선이나 세트 메뉴로 한 끼 비용을 줄여보세요",
    },
    mid: {
      headline: "맛있는 하루, 지출은 평소 수준이에요",
      advice: "식비가 크게 튀지 않았어요, 지금 습관을 유지해보세요",
      savingTip: "배달 대신 포장을 선택하면 비용을 조금 더 줄일 수 있어요",
    },
    low: {
      headline: "맛집 나들이가 이어져 식비가 늘었어요",
      advice: "최근 며칠 외식이 잦았어요, 다음 끼니는 집밥은 어때요",
      savingTip: "이번 주는 장을 봐서 직접 요리해보는 걸 추천해요",
    },
  },
  cafe_addict: {
    high: {
      headline: "오늘은 커피값도 여유 있게 즐겼어요",
      advice: "카페 지출이 있어도 전체 균형은 잘 잡혀 있어요",
      savingTip: "카페 적립 쿠폰을 챙기면 다음 잔이 더 가벼워져요",
    },
    mid: {
      headline: "오늘도 커피 한 잔은 빠지지 않았네요",
      advice: "카페 지출이 꾸준해요, 잔 수를 살짝만 줄여봐요",
      savingTip: "텀블러를 쓰면 할인 받으며 지출도 줄일 수 있어요",
    },
    low: {
      headline: "카페 지출이 며칠째 눈에 띄게 늘었어요",
      advice: "하루 두세 잔까지 늘었어요, 잔 수를 세어보면 도움돼요",
      savingTip: "이번 주는 하루 한 잔으로 정해두고 지켜보세요",
    },
  },
  delivery_lord: {
    high: {
      headline: "배달비 없이도 든든하게 챙겨 먹었어요",
      advice: "직접 만든 한 끼가 지출도 몸도 가볍게 했어요",
      savingTip: "남은 재료로 내일 한 끼를 더 해결해보세요",
    },
    mid: {
      headline: "배달 한 번으로 하루를 든든히 채웠어요",
      advice: "배달이 한 번이면 무리 없는 수준이에요",
      savingTip: "최소 주문 금액을 채우지 말고 필요한 만큼만 담아보세요",
    },
    low: {
      headline: "며칠 연속 배달로 문 앞이 바빴어요",
      advice: "배달비만 모아도 꽤 큰 금액이에요, 하루는 직접 차려봐요",
      savingTip: "냉장고 속 재료부터 확인하고 장보기 목록을 짜보세요",
    },
  },
  smart_shopper: {
    high: {
      headline: "필요한 것만 딱 골라 샀어요",
      advice: "계획한 지출 안에서 알뜰하게 잘 마무리했어요",
      savingTip: "다음 쇼핑도 할인 알림을 켜두면 더 아낄 수 있어요",
    },
    mid: {
      headline: "쇼핑은 평소랑 비슷한 수준이에요",
      advice: "큰 무리는 없었지만 장바구니를 한 번 더 점검해봐요",
      savingTip: "결제 전 24시간만 담아두면 충동 지출이 줄어요",
    },
    low: {
      headline: "오늘따라 장바구니가 두둑해졌어요",
      advice: "계획에 없던 물건이 여럿 들어갔어요, 다음엔 목록부터 적어봐요",
      savingTip: "위시리스트에 옮겨두고 일주일 뒤에 다시 살펴보세요",
    },
  },
  wishlister: {
    high: {
      headline: "담아두기만 하고 잘 참았어요",
      advice: "사고 싶은 마음을 잘 눌러낸 하루예요",
      savingTip: "위시리스트는 한 달에 한 번만 정리해서 확인해보세요",
    },
    mid: {
      headline: "장바구니가 오늘도 조금 늘었어요",
      advice: "담기만 했다면 괜찮아요, 결제 버튼은 잠시 미뤄봐요",
      savingTip: "정말 필요한지 하루만 더 생각해보고 결정해보세요",
    },
    low: {
      headline: "위시리스트가 결제로 이어지기 시작했어요",
      advice: "담아둔 것들이 하나둘 지출로 바뀌고 있어요",
      savingTip: "리스트를 절반으로 줄이고 순위를 다시 매겨보세요",
    },
  },
  impulse_god: {
    high: {
      headline: "오늘은 충동 구매를 잘 참아냈어요",
      advice: "갑자기 끌리는 소비가 없었던 안정적인 하루예요",
      savingTip: "이 기세로 내일도 결제 전 한 번 멈춰보세요",
    },
    mid: {
      headline: "갑자기 지른 소비가 하나 있었어요",
      advice: "충동 지출이 딱 한 번이면 그리 크지 않아요",
      savingTip: "다음 충동이 오면 장바구니에 담고 하루만 기다려보세요",
    },
    low: {
      headline: "오늘 지출 대부분이 충동적이었어요",
      advice: "계획 없이 나간 돈이 많아요, 원인을 하나만 찾아봐요",
      savingTip: "결제 전 반드시 필요한지 스스로에게 물어보세요",
    },
  },
  planner_cpa: {
    high: {
      headline: "1원까지 딱 맞게 관리한 완벽한 하루예요",
      advice: "계획한 예산 안에서 지출이 정확히 끝났어요",
      savingTip: "이번 달 남은 예산을 미리 확인해두면 더 든든해요",
    },
    mid: {
      headline: "가계부 기록이 평소처럼 꼼꼼했어요",
      advice: "예산과 지출 차이가 크지 않은 안정적인 흐름이에요",
      savingTip: "카테고리별 한도를 조금 더 세분화해보세요",
    },
    low: {
      headline: "계획보다 지출이 살짝 앞서갔어요",
      advice: "예산을 넘긴 항목이 있어요, 다음 며칠은 조정이 필요해요",
      savingTip: "넘친 항목의 예산을 다른 곳에서 조금 빌려와보세요",
    },
  },
  balance_master: {
    high: {
      headline: "쓸 땐 쓰고 모을 땐 모은 균형 잡힌 하루예요",
      advice: "필요한 지출과 절약이 딱 알맞게 어우러졌어요",
      savingTip: "지금의 균형 감각을 그대로 이어가면 충분해요",
    },
    mid: {
      headline: "오늘도 무난하게 균형을 지켰어요",
      advice: "크게 튀는 지출 없이 평소 흐름을 유지했어요",
      savingTip: "한 카테고리만 조금 더 신경 쓰면 완벽해져요",
    },
    low: {
      headline: "균형이 살짝 한쪽으로 기울었어요",
      advice: "특정 지출이 다른 항목보다 유독 컸어요",
      savingTip: "내일은 그 항목만 의식적으로 줄여보세요",
    },
  },
  subscription_hell: {
    high: {
      headline: "구독 서비스 정리로 지출이 가벼워졌어요",
      advice: "안 쓰는 구독을 줄인 효과가 바로 나타났어요",
      savingTip: "3개월간 안 쓴 구독이 있다면 지금 정리해보세요",
    },
    mid: {
      headline: "구독료가 매달 나가는 만큼 유지되고 있어요",
      advice: "구독 지출이 안정적이에요, 목록만 한 번 점검해봐요",
      savingTip: "겹치는 서비스가 있는지 목록을 적어 비교해보세요",
    },
    low: {
      headline: "구독료가 쌓여 부담이 커졌어요",
      advice: "매달 빠져나가는 구독이 여러 개 겹쳐 있어요",
      savingTip: "이번 주말 구독 목록을 전부 꺼내 하나씩 정리해보세요",
    },
  },
  zero_spender: {
    high: {
      headline: "오늘 하루 지갑을 열지 않았어요",
      advice: "완벽한 무지출로 하루를 마무리했어요",
      savingTip: "무지출한 날을 달력에 표시해 기록해보세요",
    },
    mid: {
      headline: "지출을 최소한으로만 줄인 하루예요",
      advice: "꼭 필요한 것만 사서 지출이 크지 않았어요",
      savingTip: "내일은 아예 지출 없는 날로 도전해보세요",
    },
    low: {
      headline: "무지출을 노렸지만 아쉽게 지출이 생겼어요",
      advice: "예상치 못한 지출이 하나 끼어들었어요",
      savingTip: "그 지출이 꼭 필요했는지 나중에 다시 돌아보세요",
    },
  },
  dust_collector: {
    high: {
      headline: "안 쓰는 물건을 정리해 지출이 줄었어요",
      advice: "새로 사기보다 있는 걸 활용한 알뜰한 하루예요",
      savingTip: "안 쓰는 물건은 중고로 팔아 용돈을 만들어보세요",
    },
    mid: {
      headline: "사놓고 안 쓴 물건이 하나 더 늘었어요",
      advice: "충동적으로 담아둔 물건이 서랍에 쌓이고 있어요",
      savingTip: "최근 산 물건 중 안 쓴 걸 하나 골라 써보세요",
    },
    low: {
      headline: "안 쓰는 물건이 계속 쌓이고 있어요",
      advice: "사놓고 방치한 물건이 지출로만 남았어요",
      savingTip: "이번 주는 새 구매 전에 서랍부터 확인해보세요",
    },
  },
  flexer: {
    high: {
      headline: "오늘은 보여주기보다 실속을 챙겼어요",
      advice: "과시성 지출 없이 알찬 하루를 보냈어요",
      savingTip: "이 기세로 다음 지출도 실속 위주로 골라보세요",
    },
    mid: {
      headline: "오늘도 조금은 보여주기식 소비가 있었어요",
      advice: "크게 무리하진 않았지만 과시성 지출이 섞여 있어요",
      savingTip: "다음 지출은 나를 위한 건지 한 번 물어보세요",
    },
    low: {
      headline: "오늘은 보여주기식 소비가 유독 컸어요",
      advice: "남에게 보이는 소비가 지출 대부분을 차지했어요",
      savingTip: "그 소비가 정말 필요했는지 하루 뒤에 다시 생각해보세요",
    },
  },
};

type ScoreBand = "high" | "mid" | "low";
type SpendGroup = "EAT" | "SHOP" | "LIFE" | "MISC";

// contract.ts의 3분류(rich/ruin/neutral) → 실제 12유형 밴드(high/mid/low) 매핑
const CONTRACT_BAND: Record<"rich" | "ruin" | "neutral", ScoreBand> = {
  rich: "high",
  neutral: "mid",
  ruin: "low",
};

// spec.md dominantGroup 규칙과 동일: food|cafe→EAT, shopping|culture→SHOP, living|transport|health→LIFE, 그 외→MISC
function categoryIdToGroup(categoryId: string): SpendGroup {
  if (categoryId === "food" || categoryId === "cafe") return "EAT";
  if (categoryId === "shopping" || categoryId === "culture") return "SHOP";
  if (categoryId === "living" || categoryId === "transport" || categoryId === "health") return "LIFE";
  return "MISC";
}

// 카테고리 정보가 없는 호출부(캐릭터 이미지)를 위한 날짜 기반 결정적 그룹 선택
function dateToGroup(date: string): SpendGroup {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  const groups: SpendGroup[] = ["EAT", "SHOP", "LIFE", "MISC"];
  return groups[hash % groups.length];
}

export const getCharacterImage: getCharacterImageFn = (fortuType, date) => {
  const band = CONTRACT_BAND[fortuType];
  const group = dateToGroup(date);
  const typeId = TYPE_MATRIX[group][band];
  const type = TYPE_TABLE[typeId];
  return { url: type.imageSrc, alt: type.name };
};

export const getFortuneMessage: getFortuneMessageFn = (fortuType, categoryId) => {
  const band = CONTRACT_BAND[fortuType];
  const group = categoryIdToGroup(categoryId);
  const typeId = TYPE_MATRIX[group][band];
  return COPY_TABLE[typeId][band].headline;
};

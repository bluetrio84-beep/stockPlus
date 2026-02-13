/**
 * UI 개발 및 테스트를 위한 목업(Mock) 데이터입니다.
 * 백엔드 API가 연결되지 않았거나 데이터를 가져오지 못했을 때 대체 데이터로 사용됩니다.
 */

// 주식 종목 더미 데이터 (주요 우량주 위주)
export const mockStocks = [
  {
    id: '005930',
    name: '삼성전자',
    code: '005930',
    price: 72500,
    change: 1200,
    changeRate: 1.68,
    volume: '12.5M',
    marketCap: '432T',
    // 50일치 랜덤 차트 데이터 생성
    chartData: Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (50 - i));
      return {
        time: date.toISOString().split('T')[0],
        value: 70000 + Math.random() * 5000 - 2500,
      };
    }),
  },
  {
    id: '000660',
    name: 'SK하이닉스',
    code: '000660',
    price: 132000,
    change: -2500,
    changeRate: -1.86,
    volume: '3.2M',
    marketCap: '96T',
    chartData: Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (50 - i));
      return {
        time: date.toISOString().split('T')[0],
        value: 130000 + Math.random() * 8000 - 4000,
      };
    }),
  },
  {
    id: '085660',
    name: '차바이오텍',
    code: '085660',
    price: 18500,
    change: 2950,
    changeRate: 18.97,
    volume: '5.8M',
    marketCap: '1.2T',
    chartData: Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (50 - i));
      return {
        time: date.toISOString().split('T')[0],
        value: 15000 + Math.random() * 5000,
      };
    }),
  },
  {
    id: '373220',
    name: 'LG에너지솔루션',
    code: '373220',
    price: 415000,
    change: -1500,
    changeRate: -0.36,
    volume: '240K',
    marketCap: '97T',
    chartData: Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (50 - i));
      return {
        time: date.toISOString().split('T')[0],
        value: 420000 + Math.random() * 10000 - 5000,
      };
    }),
  },
  {
    id: '035420',
    name: 'NAVER',
    code: '035420',
    price: 205000,
    change: 3000,
    changeRate: 1.49,
    volume: '540K',
    marketCap: '33T',
    chartData: Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (50 - i));
      return {
        time: date.toISOString().split('T')[0],
        value: 200000 + Math.random() * 6000 - 3000,
      };
    }),
  },
  {
    id: '005380',
    name: '현대차',
    code: '005380',
    price: 188700,
    change: 0,
    changeRate: 0.00,
    volume: '600K',
    marketCap: '39T',
    chartData: Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (50 - i));
      return {
        time: date.toISOString().split('T')[0],
        value: 188000 + Math.random() * 2000 - 1000,
      };
    }),
  },
];

// 뉴스 피드 더미 데이터 (시장 분위기 파악용 예시)
export const mockNews = [
  {
    id: 1,
    title: "[특징주] 반도체 관련주 일제히 급등... AI 수요 기대감",
    source: "Gemini AI Feed",
    time: "10:32",
    sentiment: "positive",
    summary: "엔비디아 호실적 전망에 따라 국내 반도체 밸류체인 기업들의 주가가 동반 상승세를 보이고 있다.",
  },
  {
    id: 2,
    title: "美 연준 의장 '금리 인상 신중론' 시사",
    source: "Global Market",
    time: "09:45",
    sentiment: "neutral",
    summary: "추가적인 경제 지표를 확인한 후 금리 방향을 결정하겠다는 신중한 입장을 표명했다.",
  },
  {
    id: 3,
    title: "전기차 수요 둔화 우려... 2차전지 섹터 조정",
    source: "Market Watch",
    time: "09:15",
    sentiment: "negative",
    summary: "유럽 및 북미 지역의 전기차 판매량 증가세가 둔화됨에 따라 배터리 셀 업체들의 목표 주가가 하향 조정되었다.",
  },
  {
    id: 4,
    title: "차바이오텍, 신약 임상 2상 성공적 결과 발표",
    source: "Bio Pharma",
    time: "11:20",
    sentiment: "positive",
    summary: "주력 파이프라인의 임상 2상에서 유의미한 데이터가 확보되어 기술 수출 기대감이 고조되고 있다.",
  },
  {
    id: 5,
    title: "코스피, 외국인 매도세에 2500선 위협",
    source: "Korea Exchange",
    time: "13:00",
    sentiment: "negative",
    summary: "환율 상승 압박으로 인한 외국인 투자자들의 순매도가 지속되며 지수 하방 압력이 커지고 있다.",
  },
];
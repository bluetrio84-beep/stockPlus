/**
 * 주식, 뉴스, 대시보드 관련 API 호출을 담당하는 모듈입니다.
 * 인증 헤더 포함 및 에러 핸들링을 위한 공통 함수(safeFetch)를 사용합니다.
 */

// 인증 헤더(Authorization) 생성 헬퍼 함수
export const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
        return { 'Authorization': `Bearer ${token}` }; // JWT 토큰을 Bearer 타입으로 전송
    }
    return {};
};

// API 요청을 안전하게 수행하는 래퍼 함수 (공통 에러 처리 및 URL 보정)
async function safeFetch(url, options = {}) {
    try {
        // 경로 보정: /stockPlus/api 로 시작하지 않으면 앞에 붙여줍니다.
        const fullUrl = url.startsWith('/') ? url : `/stockPlus/${url}`;
        
        const response = await fetch(fullUrl, {
            ...options,
            headers: { ...getAuthHeader(), ...options.headers } // 인증 헤더 자동 추가
        });

        if (!response.ok) {
            console.error(`API Error (${response.status}): ${fullUrl}`);
            return null;
        }

        // 응답 타입에 따라 JSON 또는 텍스트로 파싱
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }
        return await response.text();
    } catch (error) {
        console.error(`Fetch error: ${url}`, error);
        return null;
    }
}

// --- KIS API Proxy (주식 데이터) ---

// 종목 검색 API
export async function searchStocks(keyword) {
    const data = await safeFetch(`api/stocks/search?keyword=${encodeURIComponent(keyword)}`);
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => ({
        code: item.stockCode,
        name: item.stockName,
        market: item.marketType,
        exchangeCode: item.exchangeCode
    }));
}

// 차트 데이터 조회 API
export async function fetchStockChart(stockCode, exchangeCode = 'J', period = '1D') {
    const data = await safeFetch(`api/dashboard/stocks/${stockCode}/chart?exchangeCode=${exchangeCode}&period=${period}`);
    return Array.isArray(data) ? data : [];
}

// 현재가 조회 API
export async function fetchStockPrice(stockCode, exchangeCode = 'J') {
    const data = await safeFetch(`api/dashboard/stocks/${stockCode}/price?exchangeCode=${exchangeCode}`);
    return data || {};
}

// 투자자별 매매동향 조회 API
export async function fetchStockInvestors(stockCode, exchangeCode = 'J') {
    const data = await safeFetch(`api/dashboard/stocks/${stockCode}/investors?exchangeCode=${exchangeCode}`);
    return data || { items: [] };
}

// --- Dashboard Backend API (뉴스 및 인사이트) ---

// 최신 뉴스 조회
export async function fetchRecentNews() {
    const data = await safeFetch('api/news/recent');
    return Array.isArray(data) ? data : [];
}

// 종합 시장 인사이트(AI 요약) 조회
export async function fetchMarketInsight() {
    const data = await safeFetch('api/dashboard/market-insight');
    return data || "AI Market Insight를 가져오는데 실패했습니다.";
}

// 전담 AI 리포트(맞춤형 분석) 조회
export async function fetchSpecialReport() {
    const data = await safeFetch('api/dashboard/special-report');
    return data || "전담 AI 분석 리포트가 아직 생성되지 않았습니다.";
}

// 관심 종목 목록 조회
export async function fetchWatchlist(groupId = 1) {
    const data = await safeFetch(`api/dashboard/watchlist?groupId=${groupId}`);
    return Array.isArray(data) ? data : [];
}

// 관심 종목 추가
export async function addToWatchlist(stock) {
    const payload = {
        stockCode: stock.code || stock.stockCode,
        stockName: stock.name || stock.stockName,
        exchangeCode: stock.exchangeCode || 'J',
        groupId: stock.groupId || 1,
        isFavorite: stock.isFavorite || false
    };
    await safeFetch('api/dashboard/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

// --- AI Analysis (Streaming via SSE) ---
// 서버로부터 AI 분석 데이터를 스트리밍(SSE) 방식으로 받아옵니다.
export function fetchStockAnalysis(stockCode, onChunk) {
    const controller = new AbortController(); // 요청 취소를 위한 컨트롤러
    const signal = controller.signal;

    (async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/stockPlus/api/sse/stocks/${stockCode}/ai-analysis`, {
                method: 'GET', // SSE는 GET 방식 사용
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream', // 스트리밍 응답 요청 헤더
                },
                signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // 스트림 데이터 청크(Chunk) 단위로 읽기
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                // console.log("Stream Chunk:", chunk); // 디버깅용

                // 여러 줄로 올 수 있으므로 라인 단위로 분리 처리
                const lines = chunk.split('\n');
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    let data = trimmedLine;
                    if (trimmedLine.startsWith('data:')) {
                        data = trimmedLine.slice(5).trim(); // 'data:' 접두어 제거
                    }

                    if (data === '[DONE]') return; // 스트림 종료 시그널

                    try {
                        // JSON 형식이면 파싱하여 텍스트 추출
                        if (data.startsWith('{')) {
                            const json = JSON.parse(data);
                            if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
                                onChunk(json.candidates[0].content.parts[0].text); // 콜백 함수로 데이터 전달
                            } else {
                                onChunk(JSON.stringify(json)); 
                            }
                        } else {
                            // 일반 텍스트면 그대로 전달 (줄바꿈 복원)
                            onChunk(data + "\n");
                        }
                    } catch (e) {
                        onChunk(data + "\n");
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                console.error("Stream Error:", err);
                onChunk("\n[에러] 분석을 가져오는데 실패했습니다.\n" + err.message);
            }
        }
    })();

    return () => controller.abort(); // 정리(cleanup) 함수 반환 (컴포넌트 언마운트 시 호출)
}

// 관심 종목 삭제
export async function deleteFromWatchlist(stockCode, groupId = 1) {
    await safeFetch(`api/dashboard/watchlist/${stockCode}?groupId=${groupId}`, { method: 'DELETE' });
}

// 전체 관심 종목 삭제
export async function deleteAllFromWatchlist(groupId) {
    await safeFetch(`api/dashboard/watchlist/group/${groupId}`, { method: 'DELETE' });
}

// 즐겨찾기 설정 토글
export async function toggleFavorite(stockCode, groupId, isFavorite) {
    await safeFetch(`api/dashboard/watchlist/${stockCode}/favorite?groupId=${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
    });
}

// --- Holdings API (보유 주식 관리) ---

export async function fetchHoldings() {
    const data = await safeFetch('api/holdings');
    return Array.isArray(data) ? data : [];
}

export async function fetchTradeHistory(stockCode) {
    const data = await safeFetch(`api/holdings/${stockCode}/history`);
    return Array.isArray(data) ? data : [];
}

export async function deleteTradeHistory(id) {
    await safeFetch(`api/holdings/history/${id}`, {
        method: 'DELETE'
    });
}

export async function addTrade(tradeData) {
    // tradeData: { stockCode, stockName, quantity, price, tradeDate }
    await safeFetch('api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData),
    });
}

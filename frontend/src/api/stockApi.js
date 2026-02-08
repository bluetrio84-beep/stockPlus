export const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
};

async function safeFetch(url, options = {}) {
    try {
        // 경로 보정: /stockPlus/api 로 시작하지 않으면 붙여줌
        const fullUrl = url.startsWith('/') ? url : `/stockPlus/${url}`;
        
        const response = await fetch(fullUrl, {
            ...options,
            headers: { ...getAuthHeader(), ...options.headers }
        });

        if (!response.ok) {
            console.error(`API Error (${response.status}): ${fullUrl}`);
            return null;
        }

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

// --- KIS API Proxy ---
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

export async function fetchStockChart(stockCode, exchangeCode = 'J', period = '1D') {
    const data = await safeFetch(`api/stocks/${stockCode}/chart?exchangeCode=${exchangeCode}&period=${period}`);
    return Array.isArray(data) ? data : [];
}

export async function fetchStockPrice(stockCode, exchangeCode = 'J') {
    const data = await safeFetch(`api/stocks/${stockCode}/price?exchangeCode=${exchangeCode}`);
    return data || {};
}

// --- Dashboard Backend API ---
export async function fetchRecentNews() {
    const data = await safeFetch('api/news/recent');
    return Array.isArray(data) ? data : [];
}

export async function fetchMarketInsight() {
    const data = await safeFetch('api/market-insight');
    return data || "AI Market Insight를 가져오는데 실패했습니다.";
}

export async function fetchSpecialReport() {
    const data = await safeFetch('api/special-report');
    return data || "전담 AI 분석 리포트가 아직 생성되지 않았습니다.";
}

export async function fetchWatchlist(groupId = 1) {
    const data = await safeFetch(`api/watchlist?groupId=${groupId}`);
    return Array.isArray(data) ? data : [];
}

export async function addToWatchlist(stock) {
    const payload = {
        stockCode: stock.code || stock.stockCode,
        stockName: stock.name || stock.stockName,
        exchangeCode: stock.exchangeCode || 'J',
        groupId: stock.groupId || 1,
        isFavorite: stock.isFavorite || false
    };
    await safeFetch('api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

// --- AI Analysis (Streaming via fetch) ---
export function fetchStockAnalysis(stockCode, onChunk) {
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/stockPlus/api/sse/stocks/${stockCode}/ai-analysis`, {
                method: 'GET', // SSE는 GET
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream',
                },
                signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                // console.log("Stream Chunk:", chunk); // 디버깅용

                const lines = chunk.split('\n');
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    let data = trimmedLine;
                    if (trimmedLine.startsWith('data:')) {
                        data = trimmedLine.slice(5).trim();
                    }

                    if (data === '[DONE]') return;

                    try {
                        if (data.startsWith('{')) {
                            const json = JSON.parse(data);
                            if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
                                onChunk(json.candidates[0].content.parts[0].text);
                            } else {
                                // JSON이지만 예상 구조가 아닐 경우 통째로 출력하거나 특정 필드 확인
                                onChunk(JSON.stringify(json)); 
                            }
                        } else {
                            // JSON이 아니면 그냥 텍스트로 간주하고 출력 (줄바꿈 복원)
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

    return () => controller.abort();
}

export async function deleteFromWatchlist(stockCode, groupId = 1) {
    await safeFetch(`api/watchlist/${stockCode}?groupId=${groupId}`, { method: 'DELETE' });
}

export async function deleteAllFromWatchlist(groupId) {
    await safeFetch(`api/watchlist/group/${groupId}`, { method: 'DELETE' });
}

export async function toggleFavorite(stockCode, groupId, isFavorite) {
    await safeFetch(`api/watchlist/${stockCode}/favorite?groupId=${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
    });
}

import React, { useState, useMemo } from 'react';
import { 
    MapPin, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
    Flame, Sparkles, Filter, ChevronRight, Layers, Eye, Info, CheckCircle2
} from 'lucide-react';
import classNames from 'classnames';

// ============================================================================
// 수도권 행정구역 82개 전수 표준 메타데이터 정의
// (서울 25개 구 / 경기 47개 구·시·군 / 인천 10개 구·군)
// ============================================================================
export const METRO_DISTRICTS_DATA = [
    // ------------------------------------------------------------------------
    // [1] 서울특별시 (25개 자치구)
    // ------------------------------------------------------------------------
    // 동남권 (강남4구)
    { id: 'seoul_gangnam', name: '강남구', shortName: '강남', parent: '서울', group: 'SEOUL', subGroup: '동남권', match: ['서울 강남구', '강남구'] },
    { id: 'seoul_seocho', name: '서초구', shortName: '서초', parent: '서울', group: 'SEOUL', subGroup: '동남권', match: ['서울 서초구', '서초구'] },
    { id: 'seoul_songpa', name: '송파구', shortName: '송파', parent: '서울', group: 'SEOUL', subGroup: '동남권', match: ['서울 송파구', '송파구'] },
    { id: 'seoul_gangdong', name: '강동구', shortName: '강동', parent: '서울', group: 'SEOUL', subGroup: '동남권', match: ['서울 강동구', '강동구'] },
    // 도심권 & 마용성
    { id: 'seoul_yongsan', name: '용산구', shortName: '용산', parent: '서울', group: 'SEOUL', subGroup: '도심권', match: ['서울 용산구', '용산구'] },
    { id: 'seoul_seongdong', name: '성동구', shortName: '성동', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 성동구', '성동구'] },
    { id: 'seoul_mapo', name: '마포구', shortName: '마포', parent: '서울', group: 'SEOUL', subGroup: '서북권', match: ['서울 마포구', '마포구'] },
    { id: 'seoul_jongno', name: '종로구', shortName: '종로', parent: '서울', group: 'SEOUL', subGroup: '도심권', match: ['서울 종로구', '종로구'] },
    { id: 'seoul_jung', name: '중구', shortName: '중구', parent: '서울', group: 'SEOUL', subGroup: '도심권', match: ['서울 중구', '중구'] },
    // 서남권
    { id: 'seoul_yeongdeungpo', name: '영등포구', shortName: '영등포', parent: '서울', group: 'SEOUL', subGroup: '서남권', match: ['서울 영등포구', '영등포구'] },
    { id: 'seoul_yangcheon', name: '양천구', shortName: '양천(목동)', parent: '서울', group: 'SEOUL', subGroup: '서남권', match: ['서울 양천구', '양천구'] },
    { id: 'seoul_dongjak', name: '동작구', shortName: '동작', parent: '서울', group: 'SEOUL', subGroup: '서남권', match: ['서울 동작구', '동작구'] },
    { id: 'seoul_gangseo', name: '강서구', shortName: '강서', parent: '서울', group: 'SEOUL', subGroup: '서남권', match: ['서울 강서구', '강서구'] },
    { id: 'seoul_guro', name: '구로구', shortName: '구로', parent: '서울', group: 'SEOUL', subGroup: '서남권', match: ['서울 구로구', '구로구'] },
    { id: 'seoul_geumcheon', name: '금천구', shortName: '금천', parent: '서울', group: 'SEOUL', subGroup: '서남권', match: ['서울 금천구', '금천구'] },
    { id: 'seoul_gwanak', name: '관악구', shortName: '관악', parent: '서울', group: 'SEOUL', subGroup: '서남권', match: ['서울 관악구', '관악구'] },
    // 서북권
    { id: 'seoul_seodaemun', name: '서대문구', shortName: '서대문', parent: '서울', group: 'SEOUL', subGroup: '서북권', match: ['서울 서대문구', '서대문구'] },
    { id: 'seoul_eunpyeong', name: '은평구', shortName: '은평', parent: '서울', group: 'SEOUL', subGroup: '서북권', match: ['서울 은평구', '은평구'] },
    // 동북권
    { id: 'seoul_gwangjin', name: '광진구', shortName: '광진', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 광진구', '광진구'] },
    { id: 'seoul_dongdaemun', name: '동대문구', shortName: '동대문', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 동대문구', '동대문구'] },
    { id: 'seoul_seongbuk', name: '성북구', shortName: '성북', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 성북구', '성북구'] },
    { id: 'seoul_jungnang', name: '중랑구', shortName: '중랑', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 중랑구', '중랑구'] },
    { id: 'seoul_nowon', name: '노원구', shortName: '노원', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 노원구', '노원구'] },
    { id: 'seoul_dobong', name: '도봉구', shortName: '도봉', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 도봉구', '도봉구'] },
    { id: 'seoul_gangbuk', name: '강북구', shortName: '강북', parent: '서울', group: 'SEOUL', subGroup: '동북권', match: ['서울 강북구', '강북구'] },

    // ------------------------------------------------------------------------
    // [2] 경기도 남부 (성남/안양/수원/용인/화성 구별 + 과천/광명/하남/의왕 등 시별)
    // ------------------------------------------------------------------------
    // 화성시 (일반구)
    { id: 'gg_hwaseong_dongtan', name: '화성 동탄구', shortName: '동탄', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', match: ['화성시 동탄구', '화성 동탄'] },
    { id: 'gg_hwaseong_byeongjeom', name: '화성 병점구', shortName: '병점', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', match: ['화성시 병점구', '화성 병점'] },
    { id: 'gg_hwaseong_hyoheang', name: '화성 효행구', shortName: '효행', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', match: ['화성시 효행구', '화성 효행'] },
    { id: 'gg_hwaseong_manse', name: '화성 만세구', shortName: '만세', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', match: ['화성시 만세구', '화성 만세'] },
    // 성남시 (일반구)
    { id: 'gg_seongnam_bundang', name: '성남 분당구', shortName: '분당', parent: '성남시', group: 'GG_SOUTH', subGroup: '성남', match: ['성남시 분당구', '분당구'] },
    { id: 'gg_seongnam_sujeong', name: '성남 수정구', shortName: '수정구', parent: '성남시', group: 'GG_SOUTH', subGroup: '성남', match: ['성남시 수정구', '수정구'] },
    { id: 'gg_seongnam_jungwon', name: '성남 중원구', shortName: '중원구', parent: '성남시', group: 'GG_SOUTH', subGroup: '성남', match: ['성남시 중원구', '중원구'] },
    // 안양시 (일반구)
    { id: 'gg_anyang_dongan', name: '안양 동안구', shortName: '동안(평촌)', parent: '안양시', group: 'GG_SOUTH', subGroup: '안양', match: ['안양시 동안구', '동안구'] },
    { id: 'gg_anyang_manan', name: '안양 만안구', shortName: '만안구', parent: '안양시', group: 'GG_SOUTH', subGroup: '안양', match: ['안양시 만안구', '만안구'] },
    // 수원시 (일반구)
    { id: 'gg_suwon_yeongtong', name: '수원 영통구', shortName: '영통(광교)', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', match: ['수원시 영통구', '영통구'] },
    { id: 'gg_suwon_paldal', name: '수원 팔달구', shortName: '팔달구', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', match: ['수원시 팔달구', '팔달구'] },
    { id: 'gg_suwon_jangan', name: '수원 장안구', shortName: '장안구', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', match: ['수원시 장안구', '장안구'] },
    { id: 'gg_suwon_gwonseon', name: '수원 권선구', shortName: '권선구', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', match: ['수원시 권선구', '권선구'] },
    // 용인시 (일반구)
    { id: 'gg_yongin_suji', name: '용인 수지구', shortName: '수지구', parent: '용인시', group: 'GG_SOUTH', subGroup: '용인', match: ['용인시 수지구', '수지구'] },
    { id: 'gg_yongin_giheung', name: '용인 기흥구', shortName: '기흥구', parent: '용인시', group: 'GG_SOUTH', subGroup: '용인', match: ['용인시 기흥구', '기흥구'] },
    { id: 'gg_yongin_cheoin', name: '용인 처인구', shortName: '처인구', parent: '용인시', group: 'GG_SOUTH', subGroup: '용인', match: ['용인시 처인구', '처인구'] },
    // 부천시 (일반구)
    { id: 'gg_bucheon_wonmi', name: '부천 원미구', shortName: '원미구', parent: '부천시', group: 'GG_SOUTH', subGroup: '부천', match: ['부천시 원미구', '원미구'] },
    { id: 'gg_bucheon_sosa', name: '부천 소사구', shortName: '소사구', parent: '부천시', group: 'GG_SOUTH', subGroup: '부천', match: ['부천시 소사구', '소사구'] },
    { id: 'gg_bucheon_ojeong', name: '부천 오정구', shortName: '오정구', parent: '부천시', group: 'GG_SOUTH', subGroup: '부천', match: ['부천시 오정구', '오정구'] },
    // 안산시 (일반구)
    { id: 'gg_ansan_danwon', name: '안산 단원구', shortName: '단원구', parent: '안산시', group: 'GG_SOUTH', subGroup: '안산', match: ['안산시 단원구', '단원구'] },
    { id: 'gg_ansan_sangnok', name: '안산 상록구', shortName: '상록구', parent: '안산시', group: 'GG_SOUTH', subGroup: '안산', match: ['안산시 상록구', '상록구'] },
    // 경기 남부 핵심 단독 시
    { id: 'gg_gwacheon', name: '과천시', shortName: '과천', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', match: ['과천시'] },
    { id: 'gg_gwangmyeong', name: '광명시', shortName: '광명', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', match: ['광명시'] },
    { id: 'gg_hanam', name: '하남시', shortName: '하남(미사)', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', match: ['하남시'] },
    { id: 'gg_uiwang', name: '의왕시', shortName: '의왕', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', match: ['의왕시'] },
    { id: 'gg_gunpo', name: '군포시', shortName: '군포(산본)', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', match: ['군포시'] },
    { id: 'gg_siheung', name: '시흥시', shortName: '시흥(배곧)', parent: '경기', group: 'GG_SOUTH', subGroup: '남서부', match: ['시흥시'] },
    { id: 'gg_gwangju', name: '광주시', shortName: '경기광주', parent: '경기', group: 'GG_SOUTH', subGroup: '남동부', match: ['광주시'] },
    { id: 'gg_osan', name: '오산시', shortName: '오산', parent: '경기', group: 'GG_SOUTH', subGroup: '남부', match: ['오산시'] },
    { id: 'gg_pyeongtaek', name: '평택시', shortName: '평택(고덕)', parent: '경기', group: 'GG_SOUTH', subGroup: '남부', match: ['평택시'] },
    { id: 'gg_anseong', name: '안성시', shortName: '안성', parent: '경기', group: 'GG_SOUTH', subGroup: '남부', match: ['안성시'] },
    { id: 'gg_icheon', name: '이천시', shortName: '이천', parent: '경기', group: 'GG_SOUTH', subGroup: '남동부', match: ['이천시'] },
    { id: 'gg_yeoju', name: '여주시', shortName: '여주', parent: '경기', group: 'GG_SOUTH', subGroup: '남동부', match: ['여주시'] },
    { id: 'gg_yangpyeong', name: '양평군', shortName: '양평', parent: '경기', group: 'GG_SOUTH', subGroup: '동부', match: ['양평군'] },

    // ------------------------------------------------------------------------
    // [3] 경기도 북부 (고양 덕양/일산 구별 + 김포/구리/남양주/파주 등 시별)
    // ------------------------------------------------------------------------
    // 고양시 (일반구)
    { id: 'gg_goyang_deogyang', name: '고양 덕양구', shortName: '덕양(삼송)', parent: '고양시', group: 'GG_NORTH', subGroup: '고양', match: ['고양시 덕양구', '덕양구'] },
    { id: 'gg_goyang_ilsandong', name: '고양 일산동구', shortName: '일산동구', parent: '고양시', group: 'GG_NORTH', subGroup: '고양', match: ['고양시 일산동구', '일산동구'] },
    { id: 'gg_goyang_ilsanseo', name: '고양 일산서구', shortName: '일산서구', parent: '고양시', group: 'GG_NORTH', subGroup: '고양', match: ['고양시 일산서구', '일산서구'] },
    // 경기 북부/동북부 시·군
    { id: 'gg_guri', name: '구리시', shortName: '구리', parent: '경기', group: 'GG_NORTH', subGroup: '동북부', match: ['구리시'] },
    { id: 'gg_namyangju', name: '남양주시', shortName: '남양주(다산)', parent: '경기', group: 'GG_NORTH', subGroup: '동북부', match: ['남양주시'] },
    { id: 'gg_gimpo', name: '김포시', shortName: '김포(한강)', parent: '경기', group: 'GG_NORTH', subGroup: '서북부', match: ['김포시'] },
    { id: 'gg_paju', name: '파주시', shortName: '파주(운정)', parent: '경기', group: 'GG_NORTH', subGroup: '서북부', match: ['파주시'] },
    { id: 'gg_uijeongbu', name: '의정부시', shortName: '의정부', parent: '경기', group: 'GG_NORTH', subGroup: '북부', match: ['의정부시'] },
    { id: 'gg_yangju', name: '양주시', shortName: '양주(옥정)', parent: '경기', group: 'GG_NORTH', subGroup: '북부', match: ['양주시'] },
    { id: 'gg_pocheon', name: '포천시', shortName: '포천', parent: '경기', group: 'GG_NORTH', subGroup: '북부', match: ['포천시'] },
    { id: 'gg_dongducheon', name: '동두천시', shortName: '동두천', parent: '경기', group: 'GG_NORTH', subGroup: '북부', match: ['동두천시'] },
    { id: 'gg_gapyeong', name: '가평군', shortName: '가평', parent: '경기', group: 'GG_NORTH', subGroup: '동북부', match: ['가평군'] },
    { id: 'gg_yeoncheon', name: '연천군', shortName: '연천', parent: '경기', group: 'GG_NORTH', subGroup: '최북단', match: ['연천군'] },

    // ------------------------------------------------------------------------
    // [4] 인천광역시 (10개 구·군 전수)
    // ------------------------------------------------------------------------
    { id: 'incheon_seo', name: '인천 서구', shortName: '서구(청라/검단)', parent: '인천', group: 'INCHEON', subGroup: '서북부', match: ['인천 서구', '서구'] },
    { id: 'incheon_yeonsu', name: '인천 연수구', shortName: '연수(송도)', parent: '인천', group: 'INCHEON', subGroup: '남부', match: ['인천 연수구', '연수구'] },
    { id: 'incheon_bupyeong', name: '인천 부평구', shortName: '부평', parent: '인천', group: 'INCHEON', subGroup: '동부', match: ['인천 부평구', '부평구'] },
    { id: 'incheon_jung', name: '인천 중구', shortName: '중구(영종)', parent: '인천', group: 'INCHEON', subGroup: '도심/해양', match: ['인천 중구', '중구'] },
    { id: 'incheon_namdong', name: '인천 남동구', shortName: '남동(구월)', parent: '인천', group: 'INCHEON', subGroup: '도심', match: ['인천 남동구', '남동구'] },
    { id: 'incheon_dong', name: '인천 동구', shortName: '동구', parent: '인천', group: 'INCHEON', subGroup: '도심', match: ['인천 동구', '동구'] },
    { id: 'incheon_gyeyang', name: '인천 계양구', shortName: '계양', parent: '인천', group: 'INCHEON', subGroup: '북부', match: ['인천 계양구', '계양구'] },
    { id: 'incheon_michuhol', name: '인천 미추홀구', shortName: '미추홀', parent: '인천', group: 'INCHEON', subGroup: '도심', match: ['인천 미추홀구', '미추홀구'] },
    { id: 'incheon_ganghwa', name: '인천 강화군', shortName: '강화군', parent: '인천', group: 'INCHEON', subGroup: '도서군', match: ['인천 강화군', '강화군'] },
    { id: 'incheon_ongjin', name: '인천 옹진군', shortName: '옹진군', parent: '인천', group: 'INCHEON', subGroup: '도서군', match: ['인천 옹진군', '옹진군'] },
];

const RealEstateMapGrid = ({ data = [], sourceType = 'KB', periodType = 'WEEKLY', baseDate = '' }) => {
    // 권역 선택 필터 ('ALL' | 'SEOUL' | 'GG_SOUTH' | 'GG_NORTH' | 'INCHEON')
    const [selectedGroup, setSelectedGroup] = useState('ALL');
    // 선택된 지역 상세 팝업/인포 카드
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    // 검색 필터
    const [searchTerm, setSearchTerm] = useState('');

    // DB 데이터(data)를 각 지역 메타데이터에 매핑
    const mappedDistricts = useMemo(() => {
        const resultMap = {};

        // 1. data 항목들을 사전형태로 인덱싱
        data.forEach(item => {
            if (item && item.region_name) {
                resultMap[item.region_name.trim()] = item;
            }
        });

        // 2. 82개 표준 지역에 데이터 결합
        return METRO_DISTRICTS_DATA.map(d => {
            let matchedItem = null;
            for (const key of d.match) {
                if (resultMap[key]) {
                    matchedItem = resultMap[key];
                    break;
                }
            }

            // 부분 일치 보조 탐색
            if (!matchedItem) {
                for (const [dbName, item] of Object.entries(resultMap)) {
                    if (dbName.includes(d.name) || (d.parent !== '경기' && dbName.includes(d.parent) && dbName.includes(d.shortName))) {
                        matchedItem = item;
                        break;
                    }
                }
            }

            const rate = matchedItem ? parseFloat(matchedItem.fluctuation_rate || 0) : null;
            const rank = matchedItem ? matchedItem.rank_no : null;

            return {
                ...d,
                rate,
                rank,
                hasData: matchedItem !== null,
                rawItem: matchedItem
            };
        });
    }, [data]);

    // 필터링 적용된 목록
    const filteredDistricts = useMemo(() => {
        return mappedDistricts.filter(d => {
            if (selectedGroup !== 'ALL' && d.group !== selectedGroup) return false;
            if (searchTerm.trim()) {
                const kw = searchTerm.trim().toLowerCase();
                const matched = d.name.toLowerCase().includes(kw) || 
                                d.shortName.toLowerCase().includes(kw) || 
                                d.parent.toLowerCase().includes(kw);
                if (!matched) return false;
            }
            return true;
        });
    }, [mappedDistricts, selectedGroup, searchTerm]);

    // 전체 수도권 핵심 통계
    const stats = useMemo(() => {
        const withRates = mappedDistricts.filter(d => d.rate !== null);
        if (withRates.length === 0) return { max: null, min: null, upCnt: 0, downCnt: 0, steadyCnt: 0, avg: 0 };

        const sorted = [...withRates].sort((a, b) => (b.rate || 0) - (a.rate || 0));
        const sum = withRates.reduce((acc, cur) => acc + (cur.rate || 0), 0);
        const upCnt = withRates.filter(d => (d.rate || 0) > 0).length;
        const downCnt = withRates.filter(d => (d.rate || 0) < 0).length;
        const steadyCnt = withRates.filter(d => (d.rate || 0) === 0).length;

        return {
            max: sorted[0],
            min: sorted[sorted.length - 1],
            upCnt,
            downCnt,
            steadyCnt,
            total: withRates.length,
            avg: (sum / withRates.length).toFixed(3)
        };
    }, [mappedDistricts]);

    // 등락률에 따른 히트맵 색상 판정
    const getHeatmapColor = (rate) => {
        if (rate === null || rate === undefined) {
            return {
                bg: 'bg-slate-900/40 hover:bg-slate-800/60',
                border: 'border-slate-800/80',
                text: 'text-slate-500',
                badgeBg: 'bg-slate-800 text-slate-400',
                glow: ''
            };
        }

        if (rate >= 0.30) {
            // 🔥 최상위 초강세 (+0.3% 이상)
            return {
                bg: 'bg-rose-950/40 hover:bg-rose-900/50',
                border: 'border-rose-500/60 shadow-xs shadow-rose-950/50',
                text: 'text-rose-400 font-black',
                badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
                glow: 'ring-1 ring-rose-500/30'
            };
        } else if (rate >= 0.10) {
            // 📈 견조한 상승 (+0.1% ~ +0.3%)
            return {
                bg: 'bg-amber-950/30 hover:bg-amber-900/40',
                border: 'border-amber-500/50 shadow-xs shadow-amber-950/40',
                text: 'text-amber-300 font-bold',
                badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                glow: ''
            };
        } else if (rate > 0) {
            // 🌿 완만한 미세상승 (0.01% ~ 0.09%)
            return {
                bg: 'bg-emerald-950/25 hover:bg-emerald-900/35',
                border: 'border-emerald-500/40',
                text: 'text-emerald-300 font-semibold',
                badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                glow: ''
            };
        } else if (rate === 0) {
            // ➖ 보합
            return {
                bg: 'bg-slate-900/50 hover:bg-slate-800/70',
                border: 'border-slate-700/60',
                text: 'text-slate-300',
                badgeBg: 'bg-slate-800 text-slate-300 border border-slate-700',
                glow: ''
            };
        } else {
            // 📉 하락
            return {
                bg: 'bg-blue-950/30 hover:bg-blue-900/40',
                border: 'border-blue-500/50 shadow-xs shadow-blue-950/40',
                text: 'text-blue-400 font-bold',
                badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
                glow: ''
            };
        }
    };

    const groupTabs = [
        { id: 'ALL', label: '수도권 전체', count: 82, icon: '🌟' },
        { id: 'SEOUL', label: '서울 (25개 구)', count: 25, icon: '🏙️' },
        { id: 'GG_SOUTH', label: '경기 남부 (34개)', count: 34, icon: '🏢' },
        { id: 'GG_NORTH', label: '경기 북부 (13개)', count: 13, icon: '🌲' },
        { id: 'INCHEON', label: '인천 (10개 구·군)', count: 10, icon: '🌊' }
    ];

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] text-[var(--theme-text)] overflow-hidden">
            {/* 1. 상단 통계 카드 & 서브 필터 바 */}
            <div className="bg-[var(--theme-header)] border-b border-[var(--theme-border)] px-4 sm:px-6 py-3 shrink-0 shadow-sm">
                {/* 핵심 지표 KPI 요약 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 block">수도권 평균 변동</span>
                            <span className={classNames(
                                "text-sm sm:text-base font-black font-mono mt-0.5 block",
                                stats.avg > 0 ? "text-rose-400" : stats.avg < 0 ? "text-blue-400" : "text-slate-300"
                            )}>
                                {stats.avg > 0 ? `+${stats.avg}%` : `${stats.avg}%`}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Layers size={16} />
                        </div>
                    </div>

                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 block">최고 상승 지역 🔥</span>
                            <span className="text-xs sm:text-sm font-black text-rose-400 truncate max-w-[120px] block mt-0.5">
                                {stats.max ? `${stats.max.name} (+${stats.max.rate}%)` : '-'}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ArrowUpRight size={16} />
                        </div>
                    </div>

                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 block">상승 vs 하락 비율</span>
                            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-xs font-bold">
                                <span className="text-rose-400 font-black">상승 {stats.upCnt}</span>
                                <span className="text-slate-500">/</span>
                                <span className="text-blue-400 font-black">하락 {stats.downCnt}</span>
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <TrendingUp size={16} />
                        </div>
                    </div>

                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 block">최저/조정 지역 ❄️</span>
                            <span className="text-xs sm:text-sm font-black text-blue-400 truncate max-w-[120px] block mt-0.5">
                                {stats.min ? `${stats.min.name} (${stats.min.rate > 0 ? '+' : ''}${stats.min.rate}%)` : '-'}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <ArrowDownRight size={16} />
                        </div>
                    </div>
                </div>

                {/* 2. 권역별 탭 & 범례 & 검색 */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* 권역 탭 버튼 */}
                    <div className="flex items-center bg-[var(--theme-bg)] p-0.5 rounded-xl border border-[var(--theme-border)] overflow-x-auto max-w-full">
                        {groupTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedGroup(tab.id)}
                                className={classNames(
                                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all",
                                    selectedGroup === tab.id
                                        ? "bg-rose-500 text-white shadow-xs"
                                        : "text-slate-400 hover:text-[var(--theme-text)]"
                                )}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 히트맵 범례 및 검색창 */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* 범례 */}
                        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-[var(--theme-bg)] px-2.5 py-1 rounded-lg border border-[var(--theme-border)]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> +0.3%↑ 급등</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> +0.1%↑ 상승</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 보합세</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 마이너스</span>
                        </div>

                        {/* 구/시 검색 */}
                        <div className="w-40 sm:w-48">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="구/시 검색 (분당, 강남 등)..."
                                className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--theme-border)] focus:outline-none focus:border-rose-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. 메인 타일 그리드 영역 */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
                <div className="max-w-7xl mx-auto space-y-5">
                    {/* 권역별 섹션 렌더링 */}
                    {['SEOUL', 'GG_SOUTH', 'GG_NORTH', 'INCHEON'].map(groupKey => {
                        if (selectedGroup !== 'ALL' && selectedGroup !== groupKey) return null;

                        const itemsInGroup = filteredDistricts.filter(d => d.group === groupKey);
                        if (itemsInGroup.length === 0) return null;

                        const groupTitle = groupKey === 'SEOUL' ? '서울특별시 (25개 자치구)' :
                                           groupKey === 'GG_SOUTH' ? '경기도 남부 (핵심 구·시별 34개)' :
                                           groupKey === 'GG_NORTH' ? '경기도 북부 (13개 시·군)' : '인천광역시 (10개 구·군)';

                        const groupIcon = groupKey === 'SEOUL' ? '🏙️' :
                                          groupKey === 'GG_SOUTH' ? '🏢' :
                                          groupKey === 'GG_NORTH' ? '🌲' : '🌊';

                        return (
                            <div key={groupKey} className="bg-[var(--theme-header)]/60 rounded-2xl border border-[var(--theme-border)] p-3.5 sm:p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{groupIcon}</span>
                                        <h3 className="text-xs sm:text-sm font-black text-[var(--theme-text)] tracking-tight">
                                            {groupTitle}
                                        </h3>
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
                                            {itemsInGroup.length}개 지역
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {sourceType} {periodType} 기준
                                    </span>
                                </div>

                                {/* 타일 카드 그리드 */}
                                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                                    {itemsInGroup.map(district => {
                                        const theme = getHeatmapColor(district.rate);
                                        const isSelected = selectedDistrict?.id === district.id;

                                        return (
                                            <div
                                                key={district.id}
                                                onClick={() => setSelectedDistrict(district)}
                                                className={classNames(
                                                    "cursor-pointer rounded-xl p-2.5 border transition-all duration-200 relative group flex flex-col justify-between min-h-[78px]",
                                                    theme.bg,
                                                    theme.border,
                                                    theme.glow,
                                                    isSelected ? "ring-2 ring-rose-500 scale-[1.02] shadow-md z-10" : "hover:scale-[1.01]"
                                                )}
                                            >
                                                {/* 상단: 상위지역 태그 및 소속 */}
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span className="text-[9px] font-bold text-slate-400 truncate max-w-[60px]">
                                                        {district.parent}
                                                    </span>
                                                    {district.rank && (
                                                        <span className="text-[9px] font-mono font-black text-slate-400">
                                                            #{district.rank}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 중단: 지역명 */}
                                                <div className="font-black text-xs sm:text-sm text-[var(--theme-text)] tracking-tight truncate my-0.5">
                                                    {district.shortName}
                                                </div>

                                                {/* 하단: 변동률 (%) 뱃지 */}
                                                <div className="mt-1 flex items-center justify-between">
                                                    <span className={classNames(
                                                        "text-xs sm:text-sm font-black font-mono",
                                                        theme.text
                                                    )}>
                                                        {district.rate !== null 
                                                            ? (district.rate > 0 ? `+${district.rate}%` : `${district.rate}%`)
                                                            : '-'
                                                        }
                                                    </span>
                                                    {district.rate !== null && district.rate !== 0 && (
                                                        district.rate > 0 
                                                            ? <ArrowUpRight size={13} className="text-rose-400 shrink-0" />
                                                            : <ArrowDownRight size={13} className="text-blue-400 shrink-0" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* 선택된 지역 상세 팝업 모달 or 하단 배너 */}
                    {selectedDistrict && (
                        <div className="fixed inset-x-4 bottom-4 md:static md:mt-4 bg-slate-900 text-white rounded-2xl border border-rose-500/40 p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-base font-black tracking-tight text-white">
                                                {selectedDistrict.name} ({selectedDistrict.shortName})
                                            </h4>
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500 text-white">
                                                {selectedDistrict.parent}
                                            </span>
                                            {selectedDistrict.rank && (
                                                <span className="text-[10px] font-mono font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                                    수도권 #{selectedDistrict.rank}위
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {sourceType} 공표 {periodType} 기준 | 기준일: {baseDate || '최신'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-slate-400 block">변동률</span>
                                        <span className={classNames(
                                            "text-lg sm:text-xl font-black font-mono block",
                                            selectedDistrict.rate > 0 ? "text-rose-400" : selectedDistrict.rate < 0 ? "text-blue-400" : "text-slate-300"
                                        )}>
                                            {selectedDistrict.rate !== null 
                                                ? (selectedDistrict.rate > 0 ? `+${selectedDistrict.rate}%` : `${selectedDistrict.rate}%`)
                                                : '데이터 없음'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedDistrict(null)}
                                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RealEstateMapGrid;

import React, { useState, useMemo } from 'react';
import { 
    MapPin, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
    Flame, Sparkles, Filter, ChevronRight, Layers, Eye, Info, CheckCircle2,
    Map, LayoutGrid, ZoomIn, ZoomOut, Compass, Navigation
} from 'lucide-react';
import classNames from 'classnames';

// ============================================================================
// 수도권 행정구역 82개 전수 실측 위·경도(Lat, Lng) 및 표준 메타데이터 정의
// (서울 25개 구 / 경기 47개 구·시·군 / 인천 10개 구·군)
// ============================================================================
export const METRO_DISTRICTS_DATA = [
    // ------------------------------------------------------------------------
    // [1] 서울특별시 (25개 자치구)
    // ------------------------------------------------------------------------
    // 동남권 (강남4구)
    { id: 'seoul_gangnam', name: '강남구', shortName: '강남', parent: '서울', group: 'SEOUL', subGroup: '동남권', lat: 37.4959, lng: 127.0664, match: ['서울 강남구', '강남구'] },
    { id: 'seoul_seocho', name: '서초구', shortName: '서초', parent: '서울', group: 'SEOUL', subGroup: '동남권', lat: 37.4769, lng: 127.0378, match: ['서울 서초구', '서초구'] },
    { id: 'seoul_songpa', name: '송파구', shortName: '송파', parent: '서울', group: 'SEOUL', subGroup: '동남권', lat: 37.5048, lng: 127.1145, match: ['서울 송파구', '송파구'] },
    { id: 'seoul_gangdong', name: '강동구', shortName: '강동', parent: '서울', group: 'SEOUL', subGroup: '동남권', lat: 37.5492, lng: 127.1464, match: ['서울 강동구', '강동구'] },
    // 도심권 & 마용성
    { id: 'seoul_yongsan', name: '용산구', shortName: '용산', parent: '서울', group: 'SEOUL', subGroup: '도심권', lat: 37.5311, lng: 126.9810, match: ['서울 용산구', '용산구'] },
    { id: 'seoul_seongdong', name: '성동구', shortName: '성동', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.5506, lng: 127.0409, match: ['서울 성동구', '성동구'] },
    { id: 'seoul_mapo', name: '마포구', shortName: '마포', parent: '서울', group: 'SEOUL', subGroup: '서북권', lat: 37.5538, lng: 126.9084, match: ['서울 마포구', '마포구'] },
    { id: 'seoul_jongno', name: '종로구', shortName: '종로', parent: '서울', group: 'SEOUL', subGroup: '도심권', lat: 37.5991, lng: 126.9861, match: ['서울 종로구', '종로구'] },
    { id: 'seoul_jung', name: '중구', shortName: '중구', parent: '서울', group: 'SEOUL', subGroup: '도심권', lat: 37.5579, lng: 126.9941, match: ['서울 중구', '중구'] },
    // 서남권
    { id: 'seoul_yeongdeungpo', name: '영등포구', shortName: '영등포', parent: '서울', group: 'SEOUL', subGroup: '서남권', lat: 37.5206, lng: 126.9139, match: ['서울 영등포구', '영등포구'] },
    { id: 'seoul_yangcheon', name: '양천구', shortName: '양천(목동)', parent: '서울', group: 'SEOUL', subGroup: '서남권', lat: 37.5270, lng: 126.8561, match: ['서울 양천구', '양천구'] },
    { id: 'seoul_dongjak', name: '동작구', shortName: '동작', parent: '서울', group: 'SEOUL', subGroup: '서남권', lat: 37.4971, lng: 126.9443, match: ['서울 동작구', '동작구'] },
    { id: 'seoul_gangseo', name: '강서구', shortName: '강서', parent: '서울', group: 'SEOUL', subGroup: '서남권', lat: 37.5657, lng: 126.8226, match: ['서울 강서구', '강서구'] },
    { id: 'seoul_guro', name: '구로구', shortName: '구로', parent: '서울', group: 'SEOUL', subGroup: '서남권', lat: 37.4954, lng: 126.8581, match: ['서울 구로구', '구로구'] },
    { id: 'seoul_geumcheon', name: '금천구', shortName: '금천', parent: '서울', group: 'SEOUL', subGroup: '서남권', lat: 37.4600, lng: 126.9001, match: ['서울 금천구', '금천구'] },
    { id: 'seoul_gwanak', name: '관악구', shortName: '관악', parent: '서울', group: 'SEOUL', subGroup: '서남권', lat: 37.4653, lng: 126.9438, match: ['서울 관악구', '관악구'] },
    // 서북권
    { id: 'seoul_seodaemun', name: '서대문구', shortName: '서대문', parent: '서울', group: 'SEOUL', subGroup: '서북권', lat: 37.5791, lng: 126.9430, match: ['서울 서대문구', '서대문구'] },
    { id: 'seoul_eunpyeong', name: '은평구', shortName: '은평', parent: '서울', group: 'SEOUL', subGroup: '서북권', lat: 37.6176, lng: 126.9227, match: ['서울 은평구', '은평구'] },
    // 동북권
    { id: 'seoul_gwangjin', name: '광진구', shortName: '광진', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.5481, lng: 127.0857, match: ['서울 광진구', '광진구'] },
    { id: 'seoul_dongdaemun', name: '동대문구', shortName: '동대문', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.5838, lng: 127.0507, match: ['서울 동대문구', '동대문구'] },
    { id: 'seoul_seongbuk', name: '성북구', shortName: '성북', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.6069, lng: 127.0232, match: ['서울 성북구', '성북구'] },
    { id: 'seoul_jungnang', name: '중랑구', shortName: '중랑', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.5953, lng: 127.0939, match: ['서울 중랑구', '중랑구'] },
    { id: 'seoul_nowon', name: '노원구', shortName: '노원', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.6552, lng: 127.0771, match: ['서울 노원구', '노원구'] },
    { id: 'seoul_dobong', name: '도봉구', shortName: '도봉', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.6658, lng: 127.0317, match: ['서울 도봉구', '도봉구'] },
    { id: 'seoul_gangbuk', name: '강북구', shortName: '강북', parent: '서울', group: 'SEOUL', subGroup: '동북권', lat: 37.6469, lng: 127.0147, match: ['서울 강북구', '강북구'] },

    // ------------------------------------------------------------------------
    // [2] 경기도 남부 (성남/안양/수원/용인/화성 구별 + 과천/광명/하남/의왕 등 시별)
    // ------------------------------------------------------------------------
    // 화성시 (일반구)
    { id: 'gg_hwaseong_dongtan', name: '화성 동탄구', shortName: '동탄', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', lat: 37.2065, lng: 127.0988, match: ['화성시 동탄구', '화성 동탄'] },
    { id: 'gg_hwaseong_byeongjeom', name: '화성 병점구', shortName: '병점', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', lat: 37.2070, lng: 127.0330, match: ['화성시 병점구', '화성 병점'] },
    { id: 'gg_hwaseong_hyoheang', name: '화성 효행구', shortName: '효행', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', lat: 37.2150, lng: 126.9700, match: ['화성시 효행구', '화성 효행'] },
    { id: 'gg_hwaseong_manse', name: '화성 만세구', shortName: '만세', parent: '화성시', group: 'GG_SOUTH', subGroup: '화성', lat: 37.1950, lng: 126.8300, match: ['화성시 만세구', '화성 만세'] },
    // 성남시 (일반구)
    { id: 'gg_seongnam_bundang', name: '성남 분당구', shortName: '분당', parent: '성남시', group: 'GG_SOUTH', subGroup: '성남', lat: 37.3827, lng: 127.1189, match: ['성남시 분당구', '분당구'] },
    { id: 'gg_seongnam_sujeong', name: '성남 수정구', shortName: '수정구', parent: '성남시', group: 'GG_SOUTH', subGroup: '성남', lat: 37.4475, lng: 127.1472, match: ['성남시 수정구', '수정구'] },
    { id: 'gg_seongnam_jungwon', name: '성남 중원구', shortName: '중원구', parent: '성남시', group: 'GG_SOUTH', subGroup: '성남', lat: 37.4385, lng: 127.1664, match: ['성남시 중원구', '중원구'] },
    // 안양시 (일반구)
    { id: 'gg_anyang_dongan', name: '안양 동안구', shortName: '동안(평촌)', parent: '안양시', group: 'GG_SOUTH', subGroup: '안양', lat: 37.3916, lng: 126.9634, match: ['안양시 동안구', '동안구'] },
    { id: 'gg_anyang_manan', name: '안양 만안구', shortName: '만안구', parent: '안양시', group: 'GG_SOUTH', subGroup: '안양', lat: 37.4005, lng: 126.9161, match: ['안양시 만안구', '만안구'] },
    // 수원시 (일반구)
    { id: 'gg_suwon_yeongtong', name: '수원 영통구', shortName: '영통(광교)', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', lat: 37.2636, lng: 127.0494, match: ['수원시 영통구', '영통구'] },
    { id: 'gg_suwon_paldal', name: '수원 팔달구', shortName: '팔달구', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', lat: 37.2825, lng: 127.0170, match: ['수원시 팔달구', '팔달구'] },
    { id: 'gg_suwon_jangan', name: '수원 장안구', shortName: '장안구', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', lat: 37.3039, lng: 127.0102, match: ['수원시 장안구', '장안구'] },
    { id: 'gg_suwon_gwonseon', name: '수원 권선구', shortName: '권선구', parent: '수원시', group: 'GG_SOUTH', subGroup: '수원', lat: 37.2576, lng: 126.9723, match: ['수원시 권선구', '권선구'] },
    // 용인시 (일반구)
    { id: 'gg_yongin_suji', name: '용인 수지구', shortName: '수지구', parent: '용인시', group: 'GG_SOUTH', subGroup: '용인', lat: 37.3220, lng: 127.0975, match: ['용인시 수지구', '수지구'] },
    { id: 'gg_yongin_giheung', name: '용인 기흥구', shortName: '기흥구', parent: '용인시', group: 'GG_SOUTH', subGroup: '용인', lat: 37.2804, lng: 127.1147, match: ['용인시 기흥구', '기흥구'] },
    { id: 'gg_yongin_cheoin', name: '용인 처인구', shortName: '처인구', parent: '용인시', group: 'GG_SOUTH', subGroup: '용인', lat: 37.2343, lng: 127.2013, match: ['용인시 처인구', '처인구'] },
    // 부천시 (일반구)
    { id: 'gg_bucheon_wonmi', name: '부천 원미구', shortName: '원미구', parent: '부천시', group: 'GG_SOUTH', subGroup: '부천', lat: 37.4988, lng: 126.7831, match: ['부천시 원미구', '원미구'] },
    { id: 'gg_bucheon_sosa', name: '부천 소사구', shortName: '소사구', parent: '부천시', group: 'GG_SOUTH', subGroup: '부천', lat: 37.4831, lng: 126.7951, match: ['부천시 소사구', '소사구'] },
    { id: 'gg_bucheon_ojeong', name: '부천 오정구', shortName: '오정구', parent: '부천시', group: 'GG_SOUTH', subGroup: '부천', lat: 37.5255, lng: 126.7909, match: ['부천시 오정구', '오정구'] },
    // 안산시 (일반구)
    { id: 'gg_ansan_danwon', name: '안산 단원구', shortName: '단원구', parent: '안산시', group: 'GG_SOUTH', subGroup: '안산', lat: 37.3204, lng: 126.8122, match: ['안산시 단원구', '단원구'] },
    { id: 'gg_ansan_sangnok', name: '안산 상록구', shortName: '상록구', parent: '안산시', group: 'GG_SOUTH', subGroup: '안산', lat: 37.3008, lng: 126.8466, match: ['안산시 상록구', '상록구'] },
    // 경기 남부 핵심 단독 시
    { id: 'gg_gwacheon', name: '과천시', shortName: '과천', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', lat: 37.4292, lng: 126.9876, match: ['과천시'] },
    { id: 'gg_gwangmyeong', name: '광명시', shortName: '광명', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', lat: 37.4786, lng: 126.8646, match: ['광명시'] },
    { id: 'gg_hanam', name: '하남시', shortName: '하남(미사)', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', lat: 37.5392, lng: 127.2148, match: ['하남시'] },
    { id: 'gg_uiwang', name: '의왕시', shortName: '의왕', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', lat: 37.3447, lng: 126.9682, match: ['의왕시'] },
    { id: 'gg_gunpo', name: '군포시', shortName: '군포(산본)', parent: '경기', group: 'GG_SOUTH', subGroup: '핵심시', lat: 37.3616, lng: 126.9352, match: ['군포시'] },
    { id: 'gg_siheung', name: '시흥시', shortName: '시흥(배곧)', parent: '경기', group: 'GG_SOUTH', subGroup: '남서부', lat: 37.3802, lng: 126.8029, match: ['시흥시'] },
    { id: 'gg_gwangju', name: '광주시', shortName: '경기광주', parent: '경기', group: 'GG_SOUTH', subGroup: '남동부', lat: 37.4294, lng: 127.2551, match: ['광주시'] },
    { id: 'gg_osan', name: '오산시', shortName: '오산', parent: '경기', group: 'GG_SOUTH', subGroup: '남부', lat: 37.1498, lng: 127.0772, match: ['오산시'] },
    { id: 'gg_pyeongtaek', name: '평택시', shortName: '평택(고덕)', parent: '경기', group: 'GG_SOUTH', subGroup: '남부', lat: 36.9921, lng: 127.1129, match: ['평택시'] },
    { id: 'gg_anseong', name: '안성시', shortName: '안성', parent: '경기', group: 'GG_SOUTH', subGroup: '남부', lat: 37.0080, lng: 127.2797, match: ['안성시'] },
    { id: 'gg_icheon', name: '이천시', shortName: '이천', parent: '경기', group: 'GG_SOUTH', subGroup: '남동부', lat: 37.2723, lng: 127.4350, match: ['이천시'] },
    { id: 'gg_yeoju', name: '여주시', shortName: '여주', parent: '경기', group: 'GG_SOUTH', subGroup: '남동부', lat: 37.2984, lng: 127.6370, match: ['여주시'] },
    { id: 'gg_yangpyeong', name: '양평군', shortName: '양평', parent: '경기', group: 'GG_SOUTH', subGroup: '동부', lat: 37.4917, lng: 127.4875, match: ['양평군'] },

    // ------------------------------------------------------------------------
    // [3] 경기도 북부 (고양 덕양/일산 구별 + 김포/구리/남양주/파주 등 시별)
    // ------------------------------------------------------------------------
    // 고양시 (일반구)
    { id: 'gg_goyang_deogyang', name: '고양 덕양구', shortName: '덕양(삼송)', parent: '고양시', group: 'GG_NORTH', subGroup: '고양', lat: 37.6373, lng: 126.8327, match: ['고양시 덕양구', '덕양구'] },
    { id: 'gg_goyang_ilsandong', name: '고양 일산동구', shortName: '일산동구', parent: '고양시', group: 'GG_NORTH', subGroup: '고양', lat: 37.6583, lng: 126.7725, match: ['고양시 일산동구', '일산동구'] },
    { id: 'gg_goyang_ilsanseo', name: '고양 일산서구', shortName: '일산서구', parent: '고양시', group: 'GG_NORTH', subGroup: '고양', lat: 37.6788, lng: 126.7490, match: ['고양시 일산서구', '일산서구'] },
    // 경기 북부/동북부 시·군
    { id: 'gg_guri', name: '구리시', shortName: '구리', parent: '경기', group: 'GG_NORTH', subGroup: '동북부', lat: 37.5943, lng: 127.1295, match: ['구리시'] },
    { id: 'gg_namyangju', name: '남양주시', shortName: '남양주(다산)', parent: '경기', group: 'GG_NORTH', subGroup: '동북부', lat: 37.6360, lng: 127.2165, match: ['남양주시'] },
    { id: 'gg_gimpo', name: '김포시', shortName: '김포(한강)', parent: '경기', group: 'GG_NORTH', subGroup: '서북부', lat: 37.6152, lng: 126.7157, match: ['김포시'] },
    { id: 'gg_paju', name: '파주시', shortName: '파주(운정)', parent: '경기', group: 'GG_NORTH', subGroup: '서북부', lat: 37.7600, lng: 126.7799, match: ['파주시'] },
    { id: 'gg_uijeongbu', name: '의정부시', shortName: '의정부', parent: '경기', group: 'GG_NORTH', subGroup: '북부', lat: 37.7381, lng: 127.0337, match: ['의정부시'] },
    { id: 'gg_yangju', name: '양주시', shortName: '양주(옥정)', parent: '경기', group: 'GG_NORTH', subGroup: '북부', lat: 37.8249, lng: 127.0458, match: ['양주시'] },
    { id: 'gg_pocheon', name: '포천시', shortName: '포천', parent: '경기', group: 'GG_NORTH', subGroup: '북부', lat: 37.8949, lng: 127.2003, match: ['포천시'] },
    { id: 'gg_dongducheon', name: '동두천시', shortName: '동두천', parent: '경기', group: 'GG_NORTH', subGroup: '북부', lat: 37.9036, lng: 127.0607, match: ['동두천시'] },
    { id: 'gg_gapyeong', name: '가평군', shortName: '가평', parent: '경기', group: 'GG_NORTH', subGroup: '동북부', lat: 37.8315, lng: 127.5097, match: ['가평군'] },
    { id: 'gg_yeoncheon', name: '연천군', shortName: '연천', parent: '경기', group: 'GG_NORTH', subGroup: '최북단', lat: 38.0964, lng: 127.0747, match: ['연천군'] },

    // ------------------------------------------------------------------------
    // [4] 인천광역시 (10개 구·군 전수)
    // ------------------------------------------------------------------------
    { id: 'incheon_seo', name: '인천 서구', shortName: '서구(청라/검단)', parent: '인천', group: 'INCHEON', subGroup: '서북부', lat: 37.5454, lng: 126.6760, match: ['인천 서구', '서구'] },
    { id: 'incheon_yeonsu', name: '인천 연수구', shortName: '연수(송도)', parent: '인천', group: 'INCHEON', subGroup: '남부', lat: 37.4098, lng: 126.6783, match: ['인천 연수구', '연수구'] },
    { id: 'incheon_bupyeong', name: '인천 부평구', shortName: '부평', parent: '인천', group: 'INCHEON', subGroup: '동부', lat: 37.5074, lng: 126.7219, match: ['인천 부평구', '부평구'] },
    { id: 'incheon_jung', name: '인천 중구', shortName: '중구(영종)', parent: '인천', group: 'INCHEON', subGroup: '도심/해양', lat: 37.4738, lng: 126.6215, match: ['인천 중구', '중구'] },
    { id: 'incheon_namdong', name: '인천 남동구', shortName: '남동(구월)', parent: '인천', group: 'INCHEON', subGroup: '도심', lat: 37.4470, lng: 126.7315, match: ['인천 남동구', '남동구'] },
    { id: 'incheon_dong', name: '인천 동구', shortName: '동구', parent: '인천', group: 'INCHEON', subGroup: '도심', lat: 37.4739, lng: 126.6432, match: ['인천 동구', '동구'] },
    { id: 'incheon_gyeyang', name: '인천 계양구', shortName: '계양', parent: '인천', group: 'INCHEON', subGroup: '북부', lat: 37.5374, lng: 126.7378, match: ['인천 계양구', '계양구'] },
    { id: 'incheon_michuhol', name: '인천 미추홀구', shortName: '미추홀', parent: '인천', group: 'INCHEON', subGroup: '도심', lat: 37.4636, lng: 126.6506, match: ['인천 미추홀구', '미추홀구'] },
    { id: 'incheon_ganghwa', name: '인천 강화군', shortName: '강화군', parent: '인천', group: 'INCHEON', subGroup: '도서군', lat: 37.7464, lng: 126.4880, match: ['인천 강화군', '강화군'] },
    { id: 'incheon_ongjin', name: '인천 옹진군', shortName: '옹진군', parent: '인천', group: 'INCHEON', subGroup: '도서군', lat: 37.4468, lng: 126.3312, match: ['인천 옹진군', '옹진군'] },
];

const RealEstateMapGrid = ({ data = [], sourceType = 'KB', periodType = 'WEEKLY', baseDate = '' }) => {
    // 뷰 모드: 'map' (실제 지리 지도 뷰) | 'grid' (타일 블록 뷰)
    const [viewMode, setViewMode] = useState('map');
    // 권역 선택 필터 ('ALL' | 'SEOUL' | 'GG_SOUTH' | 'GG_NORTH' | 'INCHEON')
    const [selectedGroup, setSelectedGroup] = useState('ALL');
    // 선택된 지역 상세 팝업/인포 카드
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    // 검색 필터
    const [searchTerm, setSearchTerm] = useState('');

    // DB 데이터(data)를 각 지역 메타데이터에 매핑
    const mappedDistricts = useMemo(() => {
        const resultMap = {};

        data.forEach(item => {
            if (item && item.region_name) {
                resultMap[item.region_name.trim()] = item;
            }
        });

        return METRO_DISTRICTS_DATA.map(d => {
            let matchedItem = null;
            for (const key of d.match) {
                if (resultMap[key]) {
                    matchedItem = resultMap[key];
                    break;
                }
            }

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
                fill: '#1e293b',
                stroke: '#334155',
                dot: 'bg-slate-500',
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
                fill: '#4c0519',
                stroke: '#f43f5e',
                dot: 'bg-rose-500',
                glow: 'ring-1 ring-rose-500/30'
            };
        } else if (rate >= 0.10) {
            // 📈 견조한 상승 (+0.1% ~ +0.3%)
            return {
                bg: 'bg-amber-950/30 hover:bg-amber-900/40',
                border: 'border-amber-500/50 shadow-xs shadow-amber-950/40',
                text: 'text-amber-300 font-bold',
                badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                fill: '#451a03',
                stroke: '#f59e0b',
                dot: 'bg-amber-500',
                glow: ''
            };
        } else if (rate > 0) {
            // 🌿 완만한 미세상승 (0.01% ~ 0.09%)
            return {
                bg: 'bg-emerald-950/25 hover:bg-emerald-900/35',
                border: 'border-emerald-500/40',
                text: 'text-emerald-300 font-semibold',
                badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                fill: '#064e3b',
                stroke: '#10b981',
                dot: 'bg-emerald-500',
                glow: ''
            };
        } else if (rate === 0) {
            // ➖ 보합
            return {
                bg: 'bg-slate-900/50 hover:bg-slate-800/70',
                border: 'border-slate-700/60',
                text: 'text-slate-300',
                badgeBg: 'bg-slate-800 text-slate-300 border border-slate-700',
                fill: '#0f172a',
                stroke: '#475569',
                dot: 'bg-slate-400',
                glow: ''
            };
        } else {
            // 📉 하락
            return {
                bg: 'bg-blue-950/30 hover:bg-blue-900/40',
                border: 'border-blue-500/50 shadow-xs shadow-blue-950/40',
                text: 'text-blue-400 font-bold',
                badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
                fill: '#172554',
                stroke: '#3b82f6',
                dot: 'bg-blue-500',
                glow: ''
            };
        }
    };

    // 지리 맵 좌표 투영 파라미터 (권역에 따라 동적 계산)
    const mapBounds = useMemo(() => {
        if (selectedGroup === 'SEOUL') {
            // 서울 중심 확대: 남쪽 관악/서초/금천/강남까지 완벽 포용
            return { minLat: 37.40, maxLat: 37.71, minLng: 126.78, maxLng: 127.20 };
        } else if (selectedGroup === 'GG_SOUTH') {
            // 경기 남부 확대: 평택/안성부터 과천/성남/하남까지
            return { minLat: 36.88, maxLat: 37.60, minLng: 126.65, maxLng: 127.70 };
        } else if (selectedGroup === 'GG_NORTH') {
            // 경기 북부 확대: 고양/파주부터 연천/포천/가평까지
            return { minLat: 37.50, maxLat: 38.20, minLng: 126.50, maxLng: 127.65 };
        } else if (selectedGroup === 'INCHEON') {
            // 인천 확대: 강화/옹진부터 송도/청라/부평까지
            return { minLat: 37.35, maxLat: 37.85, minLng: 126.25, maxLng: 126.85 };
        } else {
            // 수도권 전체 (여백 최적화)
            return { minLat: 36.85, maxLat: 38.25, minLng: 126.20, maxLng: 127.80 };
        }
    }, [selectedGroup]);

    // 위경도 -> SVG 캔버스 (1000 x 750) 좌표 변환 (스마트 겹침 방지 알고리즘 탑재)
    const projectCoords = (district) => {
        let lat = district.lat;
        let lng = district.lng;

        // 수도권 전체 뷰일 때 서울 25개 구가 한곳에 뭉쳐 겹치는 현상을 방지하는 방사형 분산
        if (selectedGroup === 'ALL' && district.group === 'SEOUL') {
            const centerLat = 37.55;
            const centerLng = 126.98;
            lat = centerLat + (lat - centerLat) * 1.35;
            lng = centerLng + (lng - centerLng) * 1.35;
        }

        const { minLat, maxLat, minLng, maxLng } = mapBounds;
        const x = ((lng - minLng) / (maxLng - minLng)) * 940 + 30;
        const y = ((maxLat - lat) / (maxLat - minLat)) * 690 + 30;
        return { x: Math.max(25, Math.min(975, x)), y: Math.max(25, Math.min(725, y)) };
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

                {/* 2. 뷰 모드 전환 [🗺️ 실제 지리 지도] vs [▦ 타일 블록] & 권역 탭 & 검색 */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                        {/* [핵심] 지도 뷰 vs 타일 블록 뷰 전환 토글 버튼 */}
                        <div className="flex items-center bg-[var(--theme-bg)] p-1 rounded-xl border border-rose-500/40 shadow-xs">
                            <button
                                onClick={() => setViewMode('map')}
                                className={classNames(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                    viewMode === 'map'
                                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                                        : "text-slate-400 hover:text-[var(--theme-text)]"
                                )}
                            >
                                <Compass size={14} />
                                <span>🗺️ 실제 지리 지도</span>
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={classNames(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                    viewMode === 'grid'
                                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                                        : "text-slate-400 hover:text-[var(--theme-text)]"
                                )}
                            >
                                <LayoutGrid size={14} />
                                <span>▦ 타일 블록 그리드</span>
                            </button>
                        </div>

                        {/* 권역 탭 버튼 */}
                        <div className="flex items-center bg-[var(--theme-bg)] p-0.5 rounded-xl border border-[var(--theme-border)] overflow-x-auto max-w-full">
                            {groupTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedGroup(tab.id)}
                                    className={classNames(
                                        "flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all",
                                        selectedGroup === tab.id
                                            ? "bg-slate-800 text-rose-400 border border-rose-500/40 shadow-xs"
                                            : "text-slate-400 hover:text-[var(--theme-text)]"
                                    )}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
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

            {/* 3. 메인 콘텐츠 영역: [실제 지리 지도 뷰] OR [타일 블록 뷰] */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 relative">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* ======================================================== */}
                    {/* [A] 실제 지리 지도 (Real Geo-SVG Map) 뷰 */}
                    {/* ======================================================== */}
                    {viewMode === 'map' && (
                        <div className="bg-slate-950/90 rounded-2xl border border-rose-500/30 p-3 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
                            {/* 지도 상단 툴바 */}
                            <div className="flex items-center justify-between mb-3 px-1 border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-rose-500 font-black text-sm">📍 수도권 실제 지리 시세 지도</span>
                                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                        실측 위경도 정밀 투영 (Lat/Lng)
                                    </span>
                                </div>
                                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-3">
                                    <span className="hidden sm:inline">🌊 한강 라인 및 실제 지형 배치</span>
                                    <span className="text-rose-400">{sourceType} {periodType} 기준 ({baseDate || '최신'})</span>
                                </div>
                            </div>

                            {/* 실제 SVG 지도 캔버스 컨테이너 */}
                            <div className="w-full relative bg-radial from-slate-900/60 to-slate-950 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner flex items-center justify-center min-h-[580px] lg:min-h-[660px]">
                                <svg
                                    viewBox="0 0 1000 750"
                                    className="w-full h-full max-h-[720px] select-none"
                                >
                                    <defs>
                                        {/* 한강 글로우 필터 */}
                                        <filter id="riverGlow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feGaussianBlur stdDeviation="3" result="glow" />
                                            <feComposite in="SourceGraphic" in2="glow" operator="over" />
                                        </filter>
                                        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.08" />
                                            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                                        </radialGradient>
                                    </defs>

                                    {/* 지도 배경 그리드 레이더 선 */}
                                    <circle cx="500" cy="375" r="300" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
                                    <circle cx="500" cy="375" r="180" fill="url(#centerGlow)" stroke="#334155" strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
                                    <line x1="500" y1="20" x2="500" y2="730" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
                                    <line x1="20" y1="375" x2="980" y2="375" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />

                                    {/* 수도권 및 서울 외곽 실루엣 가이드 라인 */}
                                    {selectedGroup !== 'SEOUL' && (
                                        <path
                                            d="M 160 120 C 350 40, 680 50, 880 180 C 950 360, 910 580, 820 680 C 650 740, 380 720, 220 640 C 120 540, 110 320, 160 120 Z"
                                            fill="#0b0f19"
                                            stroke="#1e293b"
                                            strokeWidth="2"
                                            opacity="0.6"
                                        />
                                    )}

                                    {/* 서울특별시 특별 경계 원형 실루엣 */}
                                    <ellipse
                                        cx="490"
                                        cy="350"
                                        rx="160"
                                        ry="110"
                                        fill="#0f172a"
                                        stroke="#f43f5e"
                                        strokeWidth="1.5"
                                        strokeDasharray="4 4"
                                        opacity="0.35"
                                    />
                                    {/* 한강 (Han River) 실제 물줄기 흐름 벡터 */}
                                    <path
                                        d={selectedGroup === 'SEOUL'
                                            ? "M 60 410 C 220 380, 360 440, 480 420 C 600 400, 720 460, 840 420 C 910 390, 950 360, 980 340"
                                            : "M 320 370 C 380 360, 430 400, 490 395 C 550 390, 600 355, 650 375 C 700 390, 750 380, 810 360"
                                        }
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth={selectedGroup === 'SEOUL' ? "5.5" : "4"}
                                        strokeLinecap="round"
                                        opacity="0.75"
                                        filter="url(#riverGlow)"
                                    />
                                    <text 
                                        x={selectedGroup === 'SEOUL' ? "520" : "590"} 
                                        y={selectedGroup === 'SEOUL' ? "405" : "385"} 
                                        fill="#38bdf8" 
                                        fontSize="11" 
                                        fontWeight="bold" 
                                        opacity="0.85" 
                                        letterSpacing="1"
                                    >
                                        한강 (Han River)
                                    </text>

                                    {/* 82개 행정구역 실측 위경도 노드 및 % 뱃지 핀 렌더링 */}
                                    {filteredDistricts.map(district => {
                                        const coords = projectCoords(district);
                                        const theme = getHeatmapColor(district.rate);
                                        const isSelected = selectedDistrict?.id === district.id;

                                        return (
                                            <g
                                                key={district.id}
                                                transform={`translate(${coords.x}, ${coords.y})`}
                                                onClick={() => setSelectedDistrict(district)}
                                                className="cursor-pointer group"
                                            >
                                                {/* 1. 히트맵 파동 펄스 효과 (급등 지역) */}
                                                {district.rate >= 0.30 && (
                                                    <circle
                                                        cx="0"
                                                        cy="0"
                                                        r="18"
                                                        fill="none"
                                                        stroke={theme.stroke}
                                                        strokeWidth="1.5"
                                                        opacity="0.5"
                                                        className="animate-ping"
                                                    />
                                                )}

                                                {/* 2. 중심 앵커 도트 */}
                                                <circle
                                                    cx="0"
                                                    cy="0"
                                                    r={isSelected ? "7" : "4.5"}
                                                    fill={theme.stroke}
                                                    stroke="#0f172a"
                                                    strokeWidth="2"
                                                    className="transition-all duration-200"
                                                />

                                                {/* 3. 지도 위에 얹히는 실제 핀 뱃지 카드 */}
                                                <g transform={`translate(-34, -28)`} className="transition-transform duration-200 group-hover:scale-110">
                                                    {/* 카드 배경 */}
                                                    <rect
                                                        x="0"
                                                        y="0"
                                                        width="68"
                                                        height="24"
                                                        rx="6"
                                                        fill={isSelected ? '#1e1b4b' : theme.fill}
                                                        stroke={isSelected ? '#f43f5e' : theme.stroke}
                                                        strokeWidth={isSelected ? '2' : '1.2'}
                                                        className="shadow-md"
                                                    />
                                                    {/* 지역명 텍스트 */}
                                                    <text
                                                        x="6"
                                                        y="16"
                                                        fill="#ffffff"
                                                        fontSize="10"
                                                        fontWeight="900"
                                                        letterSpacing="-0.3"
                                                    >
                                                        {district.shortName.length > 4 ? district.shortName.slice(0, 4) : district.shortName}
                                                    </text>
                                                    {/* % 변동률 텍스트 */}
                                                    <text
                                                        x="62"
                                                        y="16"
                                                        fill={district.rate > 0 ? '#fda4af' : district.rate < 0 ? '#93c5fd' : '#cbd5e1'}
                                                        fontSize="9.5"
                                                        fontWeight="900"
                                                        textAnchor="end"
                                                        fontFamily="monospace"
                                                    >
                                                        {district.rate !== null
                                                            ? (district.rate > 0 ? `+${district.rate}%` : `${district.rate}%`)
                                                            : '-'}
                                                    </text>
                                                </g>
                                            </g>
                                        );
                                    })}
                                </svg>

                                {/* 지도 내부 우측 하단 미니 방위계 */}
                                <div className="absolute right-4 bottom-4 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 backdrop-blur-xs flex items-center gap-2 pointer-events-none">
                                    <Navigation size={16} className="text-rose-500 animate-pulse" />
                                    <div className="text-[10px] font-black text-slate-400">
                                        <span>N 북쪽 (서울 중심 수도권)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======================================================== */}
                    {/* [B] 타일 블록 그리드 (Tile Block Grid) 뷰 */}
                    {/* ======================================================== */}
                    {viewMode === 'grid' && (
                        <div className="space-y-4">
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
                        </div>
                    )}

                    {/* 선택된 지역 상세 팝업 모달 */}
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
                                            {sourceType} 공표 {periodType} 기준 | 기준일: {baseDate || '최신'} | 위경도: {selectedDistrict.lat}, {selectedDistrict.lng}
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

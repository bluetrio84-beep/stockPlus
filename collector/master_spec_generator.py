import os
import re
import json
import sys
import argparse
import shutil
import uuid
import traceback

class StockPlusPerfectScanner:
    def __init__(self, root_dir, git_url=None):
        self.root_dir = root_dir
        self.git_url = git_url
        self.target_dir = root_dir
        self.db_schema = []
        self.dto_map = {}
        self.mapper_map = {}
        self.api_specs = []
        self.source_cache = {}

    def clone_repo(self):
        if self.git_url and "github.com" in self.git_url:
            tmp = f"/tmp/git_final_perfect_{uuid.uuid4().hex[:6]}"
            os.system(f"git clone --depth 1 {self.git_url} {tmp} > /dev/null 2>&1")
            self.target_dir = tmp

    def load_all_sources(self):
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith((".java", ".xml", ".py", ".sql")):
                    full_path = os.path.join(r, f)
                    try:
                        with open(full_path, 'r', encoding='utf-8') as src:
                            self.source_cache[full_path] = src.read()
                    except: pass

    def scan_mybatis(self):
        for path, content in self.source_cache.items():
            if path.endswith(".xml"):
                for m in re.finditer(r"<result\s+property=\"(\w+)\"\s+column=\"(\w+)\"", content):
                    self.mapper_map[m.group(1).lower()] = m.group(2).upper()

    def scan_java_models(self):
        temp_dto = {}
        for path, content in self.source_cache.items():
            if path.endswith(".java") and ("/domain" in path or "/dto" in path or "@Data" in content or "@Getter" in content):
                cname = os.path.basename(path).replace(".java", "")
                fields = []
                for m in re.finditer(r"private\s+([\w<>\[\]\?]+)\s+(\w+);(?:\s*//\s*(.*))?", content):
                    f_type, f_name, f_comment = m.groups()
                    desc = f_comment.strip() if f_comment else self.infer_purpose(f_name)
                    snake = re.sub(r'([A-Z])', r'_\1', f_name).upper()
                    fields.append({
                        "key": f_name, "type": f_type, "desc": desc,
                        "db": self.mapper_map.get(f_name.lower(), snake)
                    })
                if fields: temp_dto[cname] = fields
        self.dto_map = temp_dto

    def infer_purpose(self, key):
        dic = {
            "usrid": "사용자 계정 ID", "usrname": "사용자 성명", "stockcode": "종목코드 (6자리)",
            "stockname": "종목명", "avgprice": "매수 평균단가", "quantity": "보유/거래 수량",
            "currentprice": "현재가", "changerate": "등락률 (%)", "yield": "수익률 (%)",
            "aiscore": "AI 예측 점수", "aisummary": "뉴스 핵심 요약", "content": "상세 내용",
            "markettype": "시장 구분 (KOSPI/KOSDAQ)", "exchangecode": "거래소 코드", "createdat": "생성 일시",
            "password": "비밀번호 (암호화)", "email": "이메일 주소", "role": "사용자 권한 (ADMIN/USER)",
            "token": "JWT 인증 토큰", "revenue": "매출액", "op_profit": "영업이익", "net_income": "당기순이익",
            "roe": "ROE (%)", "insight_text": "AI 시장 통찰 정보", "special_report": "AI 특별 분석 보고서",
            "report_date": "보고서 작성일", "indices": "시장 지수 정보", "heatmap": "업종 등락 히트맵",
            "keyword": "검색/관심 키워드", "tradeDate": "매매 일자", "price": "매매 가격", "historyId": "매매 내역 고유 ID"
        }
        return dic.get(key.lower(), "상세 데이터")

    def generate_json_sample(self, mapping):
        sample = {}
        if not mapping: return "{ \"message\": \"Action Executed Successfully\" }"
        for item in mapping:
            key = item['key']
            t = item['type'].lower()
            val = "string"
            if any(x in t for x in ["int", "long", "bigint"]): val = 0
            elif any(x in t for x in ["double", "float", "decimal"]): val = 0.0
            elif "boolean" in t: val = False
            elif "list" in t or "[]" in t: val = []
            elif "map" in t: val = {}
            sample[key] = val
        return json.dumps(sample, indent=2, ensure_ascii=False)

    def scan_apis(self):
        # [v30.90] Master Hunter - Method별 독립 분리 및 파라미터 완벽 수집
        for path, content in self.source_cache.items():
            if path.endswith("Controller.java"):
                base_url = ""
                bm = re.search(r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?\"(.*?)\"", content)
                if bm: base_url = bm.group(1).replace("\"", "")
                
                # 정규표현식 보강: 어노테이션 종류에 상관없이 전수 조사
                for mm in re.finditer(r"@(Get|Post|Put|Delete)Mapping(?:\s*\((.*?)\))?", content, re.DOTALL):
                    m_type = mm.group(1).upper()
                    url_part = mm.group(2) if mm.group(2) else ""
                    u_match = re.search(r"\"(.*?)\"", url_part)
                    full_url = (base_url + (u_match.group(1) if u_match else "")).replace("//", "/")
                    
                    start_pos = mm.end()
                    # 본문 시작점 찾기 ({)
                    bracket_pos = content.find("{", start_pos)
                    # 메서드 시그니처 캡처 (리턴 타입, 이름, 파라미터 포함)
                    method_chunk = content[start_pos:bracket_pos] if bracket_pos > 0 else ""
                    
                    # 시그니처 정밀 파싱 (비탐욕적 매칭 강화)
                    m_info = re.search(r"([\w<>\s,\?\.]+?)\s+(\w+)\s*\((.*?)\)", method_chunk, re.DOTALL)
                    if m_info:
                        ret_type, m_name, params = m_info.groups()
                        mapping = []
                        
                        # 1. Request 분석 (쉼표 단위 분할 및 어노테이션 무시)
                        param_list = params.split(",")
                        for p in param_list:
                            p = p.strip()
                            if not p: continue
                            # 어노테이션 제거 및 타입/변수명 추출
                            p_clean = re.sub(r"@[\w]+(?:\(.*?\))?", "", p).strip()
                            pts = p_clean.split()
                            if len(pts) >= 2:
                                p_type, p_name = pts[-2], pts[-1]
                                mapping.append({"key": p_name, "type": p_type, "desc": f"[Param] {self.infer_purpose(p_name)}", "db": p_name.upper()})
                            
                            # [추가] DTO 타입인 경우 DTO 내부 필드 전개
                            for cname, fds in self.dto_map.items():
                                if cname in p:
                                    for fd in fds: 
                                        if not any(x['key'] == fd['key'] for x in mapping):
                                            mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[DTO] {fd['desc']}", "db": fd['db']})

                        # [추가] 본문 내 Map.get() 또는 payload.get() 추적
                        body_chunk = content[bracket_pos:bracket_pos+2000]
                        for gk in re.finditer(r"(\w+)\.get\(\"(\w+)\"\)", body_chunk):
                            key = gk.group(2)
                            if not any(x['key'] == key for x in mapping):
                                mapping.append({"key": key, "type": "String", "desc": f"[Req] {self.infer_purpose(key)}", "db": key.upper()})

                        # 2. Response 분석
                        if "String" in ret_type:
                            mapping.append({"key": "result", "type": "String", "desc": "[Res] Plain Text Result", "db": "TEXT"})

                        for cname, fds in self.dto_map.items():
                            if cname in ret_type or (("Sse" in full_url or "Sink" in content) and "StockPrice" in cname):
                                for fd in fds: 
                                    if not any(x['key'] == fd['key'] for x in mapping):
                                        mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[Res] {fd['desc']}", "db": fd['db']})
                        
                        # Map/Mono 내부 키값 추적
                        if any(x in ret_type for x in ["Map", "ResponseEntity", "Mono", "Flux"]):
                            for pk in re.finditer(r"(?:\.put|Map\.of|result\.put|res\.put|data\.put)\s*\(\s*\"(\w+)\"", body_chunk, re.DOTALL):
                                key = pk.group(1)
                                if not any(x['key'] == key for x in mapping):
                                    mapping.append({"key": key, "type": "Mixed", "desc": f"[Res] {self.infer_purpose(key)}", "db": key.upper()})

                        final_m = []
                        seen = set()
                        for item in mapping:
                            if item['key'] not in seen:
                                final_m.append(item); seen.add(item['key'])

                        # Method별 독립 등록 (중복 URL 허용)
                        self.api_specs.append({
                            "method": m_type, "url": full_url, "function": m_name.strip(), 
                            "mapping": final_m, "sample": self.generate_json_sample(final_m)
                        })

    def scan_db(self):
        found_t = set()
        for path, content in self.source_cache.items():
            if path.endswith(".sql"):
                for t in re.finditer(r"CREATE TABLE\s+(\w+)\s*\((.*?)\)\s*;", content, re.DOTALL | re.I):
                    tname = t.group(1).lower()
                    if tname in found_t: continue
                    found_t.add(tname); cols = []
                    for line in t.group(2).split(",\n"):
                        pts = line.strip().split()
                        if len(pts) >= 2:
                            cname = pts[0].replace("`","")
                            cols.append({"name": cname, "type": pts[1].upper(), "desc": self.infer_purpose(cname)})
                    self.db_schema.append({"table": tname, "usage": f"DB Table ({tname})", "columns": cols})
        
        for path, content in self.source_cache.items():
            if path.endswith((".xml", ".py")):
                for m in re.finditer(r"(?i)(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM)\s+([a-zA-Z0-9_]{4,})", content):
                    tname = m.group(1).lower()
                    if tname in found_t or tname in ["select", "where", "values", "true", "none", "join", "into", "from", "update", "limit", "offset", "order", "group", "desc", "asc"]: continue
                    found_t.add(tname)
                    self.db_schema.append({"table": tname, "usage": "Persistence Table", "columns": [{"name": "Dynamic", "type": "Mixed", "desc": "Reference Data"}]})

    def run(self):
        try:
            self.clone_repo()
            self.load_all_sources()
            self.scan_mybatis()
            self.scan_java_models()
            self.scan_db()
            self.scan_apis()
            # 최종 결과 출력
            print(json.dumps({"status": "SUCCESS", "total_apis": len(self.api_specs), "total_tables": len(self.db_schema), "apis": self.api_specs, "tables": self.db_schema}, ensure_ascii=False, indent=2))
        except Exception as e:
            print(json.dumps({"status": "ERROR", "message": str(e), "traceback": traceback.format_exc()}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Git URL")
    args = parser.parse_args()
    scanner = StockPlusPerfectScanner(".", git_url=args.url)
    scanner.run()

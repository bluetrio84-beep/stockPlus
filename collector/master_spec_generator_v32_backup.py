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
        # [v32.00] Encoding-Safe Multi-Loader
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith((".java", ".xml", ".py", ".sql")):
                    full_path = os.path.join(r, f)
                    try:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as src:
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
                    fields.append({
                        "key": f_name, "type": f_type, "desc": desc,
                        "db": self.mapper_map.get(f_name.lower(), re.sub(r'([A-Z])', r'_\1', f_name).upper())
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
        return dic.get(key.lower(), key)

    def generate_json_sample(self, mapping):
        sample = {}
        if not mapping: return "{ \"message\": \"Action Executed Successfully\" }"
        for item in mapping:
            key = item['key']; t = item['type'].lower()
            val = "string"
            if any(x in t for x in ["int", "long", "bigint"]): val = 0
            elif any(x in t for x in ["double", "float", "decimal"]): val = 0.0
            elif "boolean" in t: val = False
            elif "list" in t or "[]" in t: val = []
            elif "map" in t: val = {}
            sample[key] = val
        return json.dumps(sample, indent=2, ensure_ascii=False)

    def scan_db(self):
        # [v32.00] Final Pure SQL Engine (Synced with v31.80)
        found_t = set()
        for path, content in self.source_cache.items():
            if not path.endswith(".sql"): continue
            clean_content = re.sub(r"--.*?\n", "\n", content)
            blocks = clean_content.split(";")
            for block in blocks:
                block = block.strip()
                if "CREATE" not in block.upper() or "TABLE" not in block.upper(): continue
                t_match = re.search(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", block, re.I)
                if not t_match: continue
                tname = t_match.group(1).lower()
                if tname in found_t: continue
                found_t.add(tname)
                u_match = re.search(r"COMMENT\s*=\s*'(.*?)'", block, re.I)
                usage = u_match.group(1) if u_match else f"Data Store ({tname})"
                cols = []
                body_match = re.search(r"\((.*)\)", block, re.DOTALL)
                if body_match:
                    body = body_match.group(1)
                    for line in body.split("\n"):
                        line = line.strip()
                        if not line or any(line.upper().startswith(x) for x in ["PRIMARY", "FOREIGN", "UNIQUE", "KEY", "CONSTRAINT"]): continue
                        pts = line.replace(","," ").split()
                        if len(pts) >= 2:
                            cname = pts[0].replace("`",""); full_type = pts[1].upper()
                            size = "-"; sz_m = re.search(r"\((\d+.*?)\)", full_type)
                            if sz_m: size = sz_m.group(1); full_type = re.sub(r"\(.*?\)", "", full_type)
                            is_pk = "Y" if "PRIMARY KEY" in line.upper() else "N"
                            is_null = "N" if "NOT NULL" in line.upper() else "Y"
                            cmt_m = re.search(r"COMMENT\s+'(.*?)'", line, re.I)
                            cols.append({"name": cname, "type": full_type, "size": size, "pk": is_pk, "null": is_null, "desc": cmt_m.group(1) if cmt_m else self.infer_purpose(cname)})
                pk_line = re.search(r"PRIMARY\s+KEY\s*\((.*?)\)", block, re.I)
                if pk_line:
                    pk_cols = [x.strip().replace("`","").upper() for x in pk_line.group(1).split(",")]
                    for c in cols:
                        if c['name'].upper() in pk_cols: c['pk'] = "Y"; c['null'] = "N"
                self.db_schema.append({"table": tname, "usage": usage, "columns": cols})

    def scan_apis(self):
        # [v32.00] Gold API Hunter (Restored from v30.90)
        for path, content in self.source_cache.items():
            if not path.endswith("Controller.java"): continue
            base_url = ""
            bm = re.search(r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?\"(.*?)\"", content)
            if bm: base_url = bm.group(1).replace("\"", "")
            
            for mm in re.finditer(r"@(Get|Post|Put|Delete)Mapping(?:\s*\((.*?)\))?", content, re.DOTALL):
                m_type = mm.group(1).upper()
                u_m = re.search(r"\"(.*?)\"", mm.group(2) if mm.group(2) else "")
                full_url = (base_url + (u_m.group(1) if u_m else "")).replace("//", "/")
                
                start = mm.end(); bracket = content.find("{", start)
                if bracket == -1: continue
                method_chunk = content[start:bracket]
                
                m_info = re.search(r"([\w<>\s,\?\.]+?)\s+(\w+)\s*\((.*?)\)", method_chunk, re.DOTALL)
                if m_info:
                    ret_type, m_name, params = m_info.groups()
                    mapping = []
                    
                    # 1. Request 분석 (Master v30.90 로직)
                    for p in params.split(","):
                        p = p.strip()
                        p_clean = re.sub(r"@[\w]+(?:\(.*?\))?", "", p).strip()
                        pts = p_clean.split()
                        if len(pts) >= 2:
                            p_type, p_name = pts[-2], pts[-1]
                            mapping.append({"key": p_name, "type": p_type, "desc": f"[Param] {self.infer_purpose(p_name)}", "db": p_name.upper()})
                        for cname, fds in self.dto_map.items():
                            if cname in p:
                                for fd in fds:
                                    if not any(x['key'] == fd['key'] for x in mapping):
                                        mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[DTO] {fd['desc']}", "db": fd['db']})

                    # 2. Response & Service Deep Trace
                    body_chunk = content[bracket:bracket+4000]
                    for gk in re.finditer(r"(?:\.get|\.put|Map\.of|res\.put|data\.put|result\.put)\s*\(\s*\"(\w+)\"", body_chunk):
                        key = gk.group(1)
                        if not any(x['key'] == key for x in mapping):
                            mapping.append({"key": key, "type": "Mixed", "desc": f"[Data] {self.infer_purpose(key)}", "db": key.upper()})
                    
                    svc_match = re.search(r"(\w+)Service\.(\w+)\(", body_chunk)
                    if svc_match:
                        s_name = svc_match.group(1)[0].upper() + svc_match.group(1)[1:] + "Service.java"
                        for s_path, s_code in self.source_cache.items():
                            if s_path.endswith(s_name):
                                for sk in re.finditer(r"(?:\.put|Map\.of|result\.put|res\.put|data\.put)\s*\(\s*\"(\w+)\"", s_code, re.DOTALL):
                                    key = sk.group(1)
                                    if not any(x['key'] == key for x in mapping):
                                        mapping.append({"key": key, "type": "Mixed", "desc": f"[Res] {self.infer_purpose(key)}", "db": key.upper()})

                    final_m = []
                    seen = set(); [final_m.append(item) or seen.add(item['key']) for item in mapping if item['key'] not in seen]
                    
                    self.api_specs.append({
                        "method": m_type, "url": full_url, "function": m_name.strip(), 
                        "mapping": final_m, "sample": self.generate_json_sample(final_m)
                    })

    def run(self):
        try:
            self.clone_repo(); self.load_all_sources(); self.scan_mybatis(); self.scan_java_models(); self.scan_db(); self.scan_apis()
            print(json.dumps({"status": "SUCCESS", "total_apis": len(self.api_specs), "total_tables": len(self.db_schema), "apis": self.api_specs, "tables": self.db_schema}, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"status": "ERROR", "message": str(e), "traceback": traceback.format_exc()}, ensure_ascii=False))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--url", help="Git URL"); args = parser.parse_args()
    scanner = StockPlusPerfectScanner(".", git_url=args.url); scanner.run()

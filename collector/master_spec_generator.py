import os
import re
import json
import sys
import argparse
import shutil
import uuid

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
                for m in re.finditer(r"private\s+([\w<>]+)\s+(\w+);(?:\\s*//\\s*(.*))?", content):
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
            "aiscore": "AI 예측 점수", "aisummary": "뉴스 핵심 요약", "content": "상세 내용"
        }
        return dic.get(key.lower(), "상세 데이터")

    def scan_apis(self):
        for path, content in self.source_cache.items():
            if path.endswith("Controller.java"):
                base_url = ""
                bm = re.search(r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?\"(.*?)\"", content)
                if bm: base_url = bm.group(1).replace("\"", "")
                
                for mm in re.finditer(r"@(Get|Post|Put|Delete)Mapping(?:\s*\((.*?)\))?", content, re.DOTALL):
                    m_type = mm.group(1).upper()
                    url_part = mm.group(2) if mm.group(2) else ""
                    u_match = re.search(r"\"(.*?)\"", url_part)
                    full_url = (base_url + (u_match.group(1) if u_match else "")).replace("//", "/")
                    
                    start_pos = mm.end()
                    bracket_pos = content.find("{", start_pos)
                    method_chunk = content[start_pos:bracket_pos] if bracket_pos > 0 else ""
                    
                    m_info = re.search(r"([\w<>,\?\s\.]+)\s+(\w+)\s*\((.*?)\)", method_chunk, re.DOTALL)
                    if m_info:
                        ret_type, m_name, params = m_info.groups()
                        mapping = []
                        for cname, fds in self.dto_map.items():
                            if cname in params:
                                for fd in fds: mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[Req] {fd['desc']}", "db": fd['db']})
                        
                        pm = re.findall(r"(@RequestParam|@PathVariable|@RequestBody).*?\s+([\w<>]+)\s+(\w+)", params, re.DOTALL)
                        for ptype, p_type, p_name in pm:
                            if not any(x['key'] == p_name for x in mapping):
                                mapping.append({"key": p_name, "type": p_type, "desc": f"[{ptype.replace('@','')}] {self.infer_purpose(p_name)}", "db": p_name.upper()})

                        for cname, fds in self.dto_map.items():
                            if cname in ret_type or (("Sse" in full_url or "Sink" in content) and "StockPrice" in cname):
                                for fd in fds: mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[Res] {fd['desc']}", "db": fd['db']})
                        
                        if "Map" in ret_type:
                            for pk in re.finditer(r"(?:\.put|Map\.of)\s*\(\s*\"(\w+)\"", content[bracket_pos:bracket_pos+1000], re.DOTALL):
                                key = pk.group(1)
                                if not any(x['key'] == key for x in mapping):
                                    mapping.append({"key": key, "type": "Mixed", "desc": f"[Res] {self.infer_purpose(key)}", "db": key.upper()})
                            
                            svc_match = re.search(r"(\w+)Service\.(\w+)\(", content[bracket_pos:bracket_pos+500])
                            if svc_match:
                                s_name = svc_match.group(1)[0].upper() + svc_match.group(1)[1:] + "Service.java"
                                for s_path, s_code in self.source_cache.items():
                                    if s_path.endswith(s_name):
                                        for sk in re.finditer(r"(?:\.put|Map\.of)\s*\(\s*\"(\w+)\"", s_code, re.DOTALL):
                                            key = sk.group(1)
                                            if not any(x['key'] == key for x in mapping):
                                                mapping.append({"key": key, "type": "Mixed", "desc": f"[Res] {self.infer_purpose(key)}", "db": key.upper()})

                        final_m = []
                        seen = set()
                        for item in mapping:
                            if item['key'] not in seen:
                                final_m.append(item); seen.add(item['key'])

                        self.api_specs.append({"method": m_type, "url": full_url, "function": m_name.strip(), "mapping": final_m})

    def scan_db(self):
        # [v30.69] 테이블 사냥 로직 완전 탐색 모드로 전환
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
                            cmt = re.search(r"COMMENT\s+'(.*?)'", line, re.I)
                            cols.append({"name": cname, "type": pts[1].upper(), "desc": cmt.group(1) if cmt else self.infer_purpose(cname)})
                    self.db_schema.append({"table": tname, "usage": f"데이터 저장소 ({tname})", "columns": cols})
            elif path.endswith(".py"):
                # 파이썬 내 모든 쿼리 키워드 기반 테이블 사냥 (공백/괄호 무시)
                for m in re.finditer(r"(?i)(?:INSERT\s+INTO|UPDATE|FROM|JOIN)\s+([a-zA-Z0-9_]{4,})", content):
                    tname = m.group(1).lower()
                    if tname in found_t or tname in ["select", "where", "values", "true", "none", "join", "into", "from", "update", "limit", "offset", "order", "group"]: continue
                    found_t.add(tname)
                    self.db_schema.append({"table": tname, "usage": "파이썬 지능형 수집 데이터", "columns": [{"name": "Dynamic", "type": "Mixed", "desc": "로직 분석 데이터"}]})

    def run(self):
        self.clone_repo()
        self.load_all_sources()
        self.scan_mybatis()
        self.scan_java_models()
        self.scan_db()
        self.scan_apis()
        print(json.dumps({"status": "SUCCESS", "total_apis": len(self.api_specs), "total_tables": len(self.db_schema), "apis": self.api_specs, "tables": self.db_schema}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Git URL")
    args = parser.parse_args()
    scanner = StockPlusPerfectScanner(".", git_url=args.url)
    scanner.run()

import os
import re
import json
import sys
import argparse
import shutil
import uuid

class StockPlusFinalSpecScanner:
    def __init__(self, root_dir, git_url=None):
        self.root_dir = root_dir
        self.git_url = git_url
        self.target_dir = root_dir
        self.db_schema = []
        self.dto_map = {}
        self.mapper_map = {}
        self.api_specs = []
        
        self.intel_dic = {
            "usrid": "사용자 유니크 ID", "usrname": "사용자 이름", "password": "암호화된 비밀번호",
            "email": "이메일 주소", "phonenumber": "연락처", "role": "사용자 권한",
            "useyn": "활성 여부 (Y/N)", "createdat": "데이터 생성일", "updatedat": "최종 수정일",
            "stockcode": "6자리 종목 코드", "stockname": "종목 명칭", "exchangecode": "거래소 코드",
            "markettype": "시장 (KOSPI/KOSDAQ)", "quantity": "보유 수량", "avgprice": "평균 매수가",
            "currentprice": "현재가", "changerate": "등락률 (%)", "aiinsight": "AI 분석 인사이트",
            "holdings": "보유 자산 목록", "profit": "평가 손익", "yield": "수익률 (%)",
            "aiscore": "AI 예측 점수", "aisummary": "뉴스 핵심 요약"
        }

    def clone_repo(self):
        if self.git_url and "github.com" in self.git_url:
            tmp = f"/tmp/git_final_master_{uuid.uuid4().hex[:6]}"
            os.system(f"git clone --depth 1 {self.git_url} {tmp} > /dev/null 2>&1")
            self.target_dir = tmp

    def scan_mybatis_mappers(self):
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith(".xml"):
                    try:
                        with open(os.path.join(r, f), 'r') as xml_file:
                            content = xml_file.read()
                            for m in re.finditer(r"<result\s+property=\"(\w+)\"\s+column=\"(\w+)\"", content):
                                self.mapper_map[m.group(1).lower()] = m.group(2).upper()
                    except: pass

    def scan_java_models(self):
        temp_dto = {}
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith(".java") and ("/domain" in r or "/dto" in r or "/com/stockPlus" in r):
                    cname = f.replace(".java", "")
                    with open(os.path.join(r, f), 'r') as src:
                        content = src.read()
                        parent = re.search(r"class\s+\w+\s+extends\s+(\w+)", content)
                        fields = []
                        for m in re.finditer(r"private\s+([\w<>]+)\s+(\w+);(?:\\s*//\\s*(.*))?", content):
                            fname = m.group(2)
                            snake = re.sub(r'([A-Z])', r'_\1', fname).upper()
                            fields.append({
                                "key": fname, "type": m.group(1), 
                                "desc": m.group(3).strip() if m.group(3) else self.intel_dic.get(fname.lower(), "상세 필드"),
                                "db": self.mapper_map.get(fname.lower(), snake)
                            })
                        temp_dto[cname] = {"fields": fields, "parent": parent.group(1) if parent else None}
        for cname in temp_dto:
            final_fields = temp_dto[cname]["fields"][:]
            curr_parent = temp_dto[cname]["parent"]
            visited = {cname}
            while curr_parent and curr_parent in temp_dto and curr_parent not in visited:
                final_fields.extend(temp_dto[curr_parent]["fields"])
                visited.add(curr_parent); curr_parent = temp_dto[curr_parent]["parent"]
            self.dto_map[cname] = final_fields

    def scan_db(self):
        found_t = set()
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith(".sql") or (f.endswith(".py") and "collector" in r):
                    with open(os.path.join(r, f), 'r') as src:
                        content = src.read()
                        for t in re.finditer(r"CREATE TABLE\s+(\w+)\s*\((.*?)\)\s*;", content, re.DOTALL | re.I):
                            tname = t.group(1).lower()
                            if tname in found_t: continue
                            found_t.add(tname)
                            cols = []
                            for line in t.group(2).split(",\n"):
                                pts = line.strip().split()
                                if len(pts) >= 2:
                                    cname = pts[0].replace("`","")
                                    cmt = re.search(r"COMMENT\s+'(.*?)'", line, re.I)
                                    cols.append({"name": cname, "type": pts[1].upper(), "desc": cmt.group(1) if cmt else self.intel_dic.get(cname.lower(), "-")})
                            self.db_schema.append({"table": tname, "usage": f"StockPlus 핵심 데이터 ({tname})", "columns": cols})
                        for m in re.finditer(r"(?i)(?:INSERT INTO|UPDATE|FROM|JOIN)\s+([a-zA-Z0-9_]{4,})", content):
                            tname = m.group(1).lower()
                            if tname in found_t or tname in ["select", "where", "values", "true", "none", "limit", "offset", "order", "group"]: continue
                            found_t.add(tname)
                            self.db_schema.append({"table": tname, "usage": "수집기 동적 테이블", "columns": [{"name": "Dynamic", "type": "Mixed", "desc": "파이썬 동적 처리"}]})

    def scan_apis(self):
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith("Controller.java"):
                    with open(os.path.join(r, f), 'r') as src:
                        content = src.read()
                        base_url = ""
                        bm = re.search(r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?\"(.*?)\"", content)
                        if bm: base_url = bm.group(1).replace("\"", "")
                        
                        # [v30.62] 초정밀 전수 포획 파서 (ResponseEntity<?>, Mono 등 모든 타입 대응)
                        for mm in re.finditer(r"@(Get|Post|Put|Delete)Mapping(?:\s*\((.*?)\))?", content, re.DOTALL):
                            m_type = mm.group(1).upper()
                            raw_url = mm.group(2) if mm.group(2) else ""
                            u_match = re.search(r"(?:value\s*=\s*)?\"(.*?)\"", raw_url)
                            sub_url = u_match.group(1) if u_match else ""
                            full_url = (base_url + sub_url).replace("//", "/")
                            
                            start_pos = mm.end()
                            method_chunk = content[start_pos:content.find("{", start_pos)]
                            
                            # [v30.62 FIX] 모든 리턴 타입 및 공백 무력화Regex
                            m_info = re.search(r"([\w<>,\?\s\.]+)\s+(\w+)\s*\((.*?)\)", method_chunk, re.DOTALL)
                            if m_info:
                                ret_type, m_name, params = m_info.groups()
                                mapping = []
                                for cname, fds in self.dto_map.items():
                                    if cname in params:
                                        for fd in fds: mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[Req] {fd['desc']}", "db": fd.get('db')})
                                pm = re.findall(r"(@RequestParam|@PathVariable|@RequestBody).*?\s+([\w<>]+)\s+(\w+)", params, re.DOTALL)
                                for ptype, p_t, p_n in pm:
                                    if not any(x['key'] == p_n for x in mapping):
                                        mapping.append({"key": p_n, "type": p_t, "desc": f"[{ptype.replace('@','')}] {self.intel_dic.get(p_n.lower(), '데이터')}", "db": self.mapper_map.get(p_n.lower())})
                                
                                for cname, fds in self.dto_map.items():
                                    if cname in ret_type or (("Sse" in full_url or "Sink" in content) and "StockPrice" in cname):
                                        for fd in fds: mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[Res] {fd['desc']}", "db": fd.get('db')})
                                
                                if "Map" in ret_type:
                                    b_start = content.find("{", start_pos)
                                    b_end = content.find("@", b_start + 1)
                                    m_body = content[b_start:b_end if b_end > 0 else len(content)]
                                    for put_m in re.finditer(r"(?:response|result|res|h)\.put\(\"(.*?)\",", m_body):
                                        k = put_m.group(1)
                                        if not any(x['key'] == k for x in mapping):
                                            mapping.append({"key": k, "type": "Mixed", "desc": f"[Res] {self.intel_dic.get(k.lower(), '데이터')}"})
                                    # [v30.62] 특수 매핑 강제 보정
                                    if "intelligence" in full_url.lower():
                                        mapping.extend([{"key": "holdings", "type": "List", "desc": "[Res] 보유 종목 실시간 수익률 리스트"}, {"key": "aiInsight", "type": "String", "desc": "[Res] AI 시장 분석 리포트"}])

                                final_m = []
                                seen = set()
                                for item in mapping:
                                    if item['key'] not in seen:
                                        final_m.append(item); seen.add(item['key'])
                                self.api_specs.append({"method": m_type, "url": full_url, "function": m_name.strip(), "mapping": final_m})

    def run(self):
        self.clone_repo()
        self.scan_mybatis_mappers()
        self.scan_java_models()
        self.scan_db()
        self.scan_apis()
        print(json.dumps({"status": "SUCCESS", "total_apis": len(self.api_specs), "total_tables": len(self.db_schema), "apis": self.api_specs, "tables": self.db_schema}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Git URL")
    args = parser.parse_args()
    scanner = StockPlusFinalSpecScanner(".", git_url=args.url)
    scanner.run()

import os
import re
import json
import sys
import argparse
import shutil
import uuid

class StockPlusTotalScanner:
    def __init__(self, root_dir, git_url=None):
        self.root_dir = root_dir
        self.git_url = git_url
        self.target_dir = root_dir
        self.db_schema = []
        self.dto_map = {}
        self.api_specs = []
        
        self.intel_dic = {
            "usrid": "사용자 유니크 ID", "usrname": "사용자 이름", "password": "암호화된 비밀번호",
            "email": "사용자 이메일 주소", "phonenumber": "사용자 연락처", "role": "사용자 권한",
            "useyn": "계정 활성 여부", "createdat": "데이터 생성 일시", "updatedat": "최종 수정 일시",
            "stockcode": "6자리 표준 종목 코드", "stockname": "종목 명칭 (국문)", "exchangecode": "거래소 코드 (J:한국)",
            "markettype": "시장 구분 (KOSPI/KOSDAQ)", "quantity": "보유/매매 수량", "avgprice": "평균 매수 단가",
            "currentprice": "실시간 현재가", "changerate": "전일 대비 변동률 (%)", "aiinsight": "AI 기반 시장 인사이트",
            "holdings": "보유 종목 리스트 데이터", "profit": "평가 손익 (원)", "yield": "수익률 (%)",
            "aiscore": "AI 모델 예측 점수", "aisummary": "뉴스 3줄 핵심 요약", "content": "메모/일지 상세 내용"
        }

    def clone_repo(self):
        if self.git_url and "github.com" in self.git_url:
            tmp = f"/tmp/git_last_{uuid.uuid4().hex[:6]}"
            os.system(f"git clone --depth 1 {self.git_url} {tmp} > /dev/null 2>&1")
            self.target_dir = tmp

    def scan_db(self):
        candidates = [os.path.join(self.target_dir, "backend/src/main/resources/schema.sql"), "/app/src/main/resources/schema.sql"]
        sql_path = next((c for c in candidates if os.path.exists(c)), None)
        if sql_path:
            with open(sql_path, 'r') as f:
                content = f.read()
                for t in re.finditer(r"CREATE TABLE\s+(\w+)\s*\((.*?)\)\s*;", content, re.DOTALL | re.IGNORECASE):
                    tname, body = t.groups()
                    cols = []
                    for line in body.split(",\n"):
                        line = line.strip()
                        if not line or any(k in line.upper() for k in ["KEY", "CONSTRAINT"]): continue
                        pts = line.split()
                        if len(pts) >= 2:
                            cname = pts[0].replace("`", "")
                            usage = self.intel_dic.get(cname.lower(), "시스템 필드")
                            cmt = re.search(r"COMMENT\s+'(.*?)'", line, re.I)
                            if cmt: usage = cmt.group(1)
                            cols.append({"name": cname, "type": pts[1].upper(), "desc": usage})
                    self.db_schema.append({"table": tname, "usage": f"DB 테이블 ({tname})", "columns": cols})

        collector_path = os.path.join(self.target_dir, "collector")
        if os.path.exists(collector_path):
            for r, _, files in os.walk(collector_path):
                for f in files:
                    if f.endswith(".py") and f != "master_spec_generator.py":
                        try:
                            with open(os.path.join(r, f), 'r') as src:
                                content = src.read()
                                for m in re.finditer(r"(?i)INSERT INTO\s+([a-zA-Z0-9_]+)\s*\((.*?)\)", content):
                                    tname, col_str = m.groups()
                                    tname = tname.lower()
                                    if tname in ["select", "values"]: continue
                                    cols = [{"name": c.strip().replace("`",""), "type": "Mixed", "desc": self.intel_dic.get(c.strip().lower().replace("`",""), "수집 필드")} for c in col_str.split(",")]
                                    if not any(d['table'].lower() == tname for d in self.db_schema):
                                        self.db_schema.append({"table": tname, "usage": "파이썬 수집 테이블", "columns": cols})
                        except: pass

    def scan_java_models(self):
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith(".java") and ("/domain" in r or "/dto" in r):
                    cname = f.replace(".java", "")
                    fields = []
                    with open(os.path.join(r, f), 'r') as src:
                        content = src.read()
                        for m in re.finditer(r"private\s+([\w<>]+)\s+(\w+);(?:\\s*//\\s*(.*))?", content):
                            fields.append({"key": m.group(2), "type": m.group(1), "desc": m.group(3).strip() if m.group(3) else self.intel_dic.get(m.group(2).lower(), "상세 필드")})
                    self.dto_map[cname] = fields

    def scan_apis(self):
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith("Controller.java"):
                    with open(os.path.join(r, f), 'r') as src:
                        content = src.read()
                        base_url = ""
                        bm = re.search(r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?\"(.*?)\"", content)
                        if bm: base_url = bm.group(1).replace("\"", "")
                        
                        # [v30.52] 초유연 멀티라인 메서드 파서 (API 누락 박멸)
                        # 1. 매핑 어노테이션 위치 파악
                        mapping_matches = re.finditer(r"@(Get|Post|Put|Delete)Mapping\s*\((.*?)\)", content, re.DOTALL)
                        for mm in mapping_matches:
                            m_type = mm.group(1).upper()
                            raw_url = mm.group(2)
                            url_match = re.search(r"\"(.*?)\"", raw_url)
                            full_url = (base_url + (url_match.group(1) if url_match else "")).replace("//", "/")
                            
                            # 2. 해당 어노테이션 이후의 메서드 시그니처 낚아채기
                            start_pos = mm.end()
                            # 다음 '{' 가 나올 때까지의 텍스트 추출
                            method_chunk = content[start_pos:content.find("{", start_pos)]
                            
                            # 메서드명과 파라미터 추출
                            # 괄호 안의 내용을 비욕심적으로 매칭
                            method_info = re.search(r"([\w<>,\?\s\.]+)\s+(\w+)\s*\((.*?)\)", method_chunk, re.DOTALL)
                            if method_info:
                                ret_type, m_name, params = method_info.groups()
                                ret_type = ret_type.strip().split(".")[-1] # 패키지명 제거
                                
                                mapping = []
                                # Request Mapping
                                for cname, fds in self.dto_map.items():
                                    if cname in params:
                                        for fd in fds: mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[Req] {fd['desc']}"})
                                
                                pm = re.findall(r"(@RequestParam|@PathVariable|@RequestBody).*?\s+([\w<>]+)\s+(\w+)", params, re.DOTALL)
                                for ptype, p_java_type, p_name in pm:
                                    if not any(x['key'] == p_name for x in mapping):
                                        mapping.append({"key": p_name, "type": p_java_type, "desc": f"[{ptype.replace('@','')}] {self.intel_dic.get(p_name.lower(), '데이터')}"})
                                
                                # Response Mapping
                                for cname, fds in self.dto_map.items():
                                    if cname in ret_type:
                                        for fd in fds: mapping.append({"key": fd['key'], "type": fd['type'], "desc": f"[Res] {fd['desc']}"})
                                
                                if "Map" in ret_type and "intelligence" in full_url.lower():
                                    mapping.append({"key": "holdings", "type": "List", "desc": "[Res] 보유 종목 실시간 수익률 리스트"})
                                    mapping.append({"key": "aiInsight", "type": "String", "desc": "[Res] 지능형 시장 대응 가이드"})

                                final_m = []
                                seen = set()
                                for item in mapping:
                                    if item['key'] not in seen:
                                        final_m.append(item)
                                        seen.add(item['key'])

                                self.api_specs.append({
                                    "method": m_type, "url": full_url, "function": m_name.strip(), 
                                    "mapping": final_m, "sample": json.dumps({x['key']: "..." for x in final_m if "[Req]" in x['desc'] or "@" in x['desc']}, indent=2)
                                })

    def run(self):
        self.clone_repo()
        self.scan_java_models()
        self.scan_db()
        self.scan_apis()
        
        output = {
            "status": "SUCCESS",
            "total_apis": len(self.api_specs),
            "total_tables": len(self.db_schema),
            "apis": self.api_specs,
            "tables": self.db_schema
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
        if "/tmp/git_last_" in self.target_dir: shutil.rmtree(self.target_dir)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Git URL")
    args = parser.parse_args()
    scanner = StockPlusTotalScanner(".", git_url=args.url)
    scanner.run()

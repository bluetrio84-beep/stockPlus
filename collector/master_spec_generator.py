import os
import re
import json
import sys
import argparse
import uuid
import traceback

class StockPlusPerfectScanner:
    def __init__(self, root_dir, git_url=None):
        self.root_dir = root_dir
        self.target_dir = root_dir
        self.db_schema = []
        self.dto_map = {}
        self.mapper_map = {}
        self.api_specs = []
        self.source_cache = {}

    def load_all_sources(self):
        # [v31.30] Encoding-Safe Loader
        for r, _, files in os.walk(self.target_dir):
            for f in files:
                if f.endswith((".java", ".xml", ".sql")):
                    full_path = os.path.join(r, f)
                    try:
                        # 한글 주석 대비 UTF-8 강제 및 에러 무시
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
                # 한 줄 주석 포함 정밀 파싱
                for m in re.finditer(r"private\s+([\w<>\[\]\?]+)\s+(\w+);(?:\s*//\s*(.*))?", content):
                    f_type, f_name, f_comment = m.groups()
                    desc = f_comment.strip() if f_comment else f_name
                    fields.append({"key": f_name, "type": f_type, "desc": desc, "db": self.mapper_map.get(f_name.lower(), f_name.upper())})
                if fields: temp_dto[cname] = fields
        self.dto_map = temp_dto

    def scan_db(self):
        # [v31.30] Final Bulletproof SQL Parser
        found_t = set()
        for path, content in self.source_cache.items():
            if not path.endswith(".sql"): continue
            
            # 주석 완전 제거 후 블록 분리
            clean_content = re.sub(r"--.*?\n", "\n", content)
            blocks = clean_content.split(";")
            
            for block in blocks:
                block = block.strip()
                if "CREATE" not in block.upper() or "TABLE" not in block.upper(): continue
                
                # 테이블명 추출 (IF NOT EXISTS 대응)
                t_match = re.search(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)", block, re.I)
                if not t_match: continue
                tname = t_match.group(1).lower()
                if tname in found_t: continue
                found_t.add(tname)
                
                # 용도 추출
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
                            cname = pts[0].replace("`","")
                            full_type = pts[1].upper()
                            size = "-"; sz_m = re.search(r"\((\d+.*?)\)", full_type)
                            if sz_m: size = sz_m.group(1); full_type = re.sub(r"\(.*?\)", "", full_type)
                            
                            is_pk = "Y" if "PRIMARY KEY" in line.upper() else "N"
                            is_null = "N" if "NOT NULL" in line.upper() else "Y"
                            if is_pk == "Y": is_null = "N"
                            
                            cmt_m = re.search(r"COMMENT\s+'(.*?)'", line, re.I)
                            desc = cmt_m.group(1) if cmt_m else cname
                            cols.append({"name": cname, "type": full_type, "size": size, "pk": is_pk, "null": is_null, "desc": desc})
                
                # PK 보정
                pk_line = re.search(r"PRIMARY\s+KEY\s*\((.*?)\)", block, re.I)
                if pk_line:
                    pk_cols = [x.strip().replace("`","").upper() for x in pk_line.group(1).split(",")]
                    for c in cols:
                        if c['name'].upper() in pk_cols: c['pk'] = "Y"; c['null'] = "N"
                
                self.db_schema.append({"table": tname, "usage": usage, "columns": cols})

    def scan_apis(self):
        for path, content in self.source_cache.items():
            if not path.endswith("Controller.java"): continue
            base_url = ""
            bm = re.search(r"@RequestMapping\s*\(\s*(?:value\s*=\s*)?\"(.*?)\"", content)
            if bm: base_url = bm.group(1).replace("\"", "")
            
            for mm in re.finditer(r"@(Get|Post|Put|Delete)Mapping(?:\s*\((.*?)\))?", content, re.DOTALL):
                m_type = mm.group(1).upper()
                u_m = re.search(r"\"(.*?)\"", mm.group(2) if mm.group(2) else "")
                full_url = (base_url + (u_m.group(1) if u_m else "")).replace("//", "/")
                
                start = mm.end()
                bracket = content.find("{", start)
                if bracket == -1: continue
                
                m_info = re.search(r"([\w<>\s,\?\.]+?)\s+(\w+)\s*\((.*?)\)", content[start:bracket], re.DOTALL)
                if m_info:
                    ret_type, m_name, params = m_info.groups()
                    mapping = []
                    # 파라미터 낚시
                    for p in params.split(","):
                        p = p.strip()
                        pts = re.sub(r"@[\w]+(?:\(.*?\))?", "", p).strip().split()
                        if len(pts) >= 2:
                            mapping.append({"key": pts[-1], "type": pts[-2], "desc": pts[-1], "db": pts[-1].upper()})
                    
                    self.api_specs.append({"method": m_type, "url": full_url, "function": m_name.strip(), "mapping": mapping, "sample": "{}"})

    def run(self):
        try:
            self.load_all_sources(); self.scan_mybatis(); self.scan_java_models(); self.scan_db(); self.scan_apis()
            print(json.dumps({"status": "SUCCESS", "total_apis": len(self.api_specs), "total_tables": len(self.db_schema), "apis": self.api_specs, "tables": self.db_schema}, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"status": "ERROR", "message": str(e), "traceback": traceback.format_exc()}, ensure_ascii=False))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--url", help="Git URL"); args = parser.parse_args()
    # /app 경로에서 실행되므로 상대 경로 유지
    scanner = StockPlusPerfectScanner(".", git_url=args.url); scanner.run()

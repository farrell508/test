# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime, timezone
from pathlib import Path
import csv

# test 폴더 자체를 정적/템플릿 루트로 사용
BASE_DIR = Path(__file__).resolve().parent

# static_url_path='' 로 두면 /js/... /main.css 같은 경로가 그대로 동작
app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")

# ====== 데이터(로그) 저장 경로 ======
DATA_DIR = BASE_DIR / "_data"
DATA_DIR.mkdir(exist_ok=True)
EVENTS_CSV = DATA_DIR / "events.csv"
CSV_FIELDS = [
    "ts","grade","klass","user","type","studentNo","from","to",
    "reason","clientTime","ip","ua"
]

def append_event(row: dict):
    """이벤트를 CSV에 한 줄씩 저장"""
    file_exists = EVENTS_CSV.exists()
    with EVENTS_CSV.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        if not file_exists:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in CSV_FIELDS})

# ====== 페이지 라우트 (HTML 파일 그대로 사용) ======
@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

# ====== API ======
@app.get("/api/classes/<int:grade>/<int:klass>/config")
def class_config(grade, klass):
    """
    반별 인원/제외 번호/출결 제외 카테고리 (초기엔 하드코딩, 나중에 DB/시트로 대체)
    """
    configs = {
        (1, 3): {"classSize": 31, "skipNumbers": [12],
                 "exclusionCategories": ["toilet", "hallway"]}
    }
    return jsonify(configs.get(
        (grade, klass),
        {"classSize": 31, "skipNumbers": [], "exclusionCategories": ["toilet", "hallway"]}
    ))

@app.post("/api/events")
def events():
    """
    프론트에서 자석 이동/사유 저장 때마다 호출:
    {
      "type": "move"|"reason"|...,
      "grade": 1, "klass": 3, "user": "teacher",
      "studentNo": 7, "from": "grid", "to": "etc",
      "reason": "병원", "clientTime": "2025-08-18T12:34:56+09:00"
    }
    """
    data = request.get_json(silent=True) or {}
    if "type" not in data:
        return jsonify({"ok": False, "error": "missing type"}), 400

    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "grade": data.get("grade"),
        "klass": data.get("klass"),
        "user": data.get("user"),
        "type": data.get("type"),
        "studentNo": data.get("studentNo"),
        "from": data.get("from"),
        "to": data.get("to"),
        "reason": data.get("reason"),
        "clientTime": data.get("clientTime"),
        "ip": request.headers.get("X-Forwarded-For", request.remote_addr),
        "ua": request.headers.get("User-Agent", ""),
    }
    append_event(row)
    return jsonify({"ok": True})

@app.get("/api/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    # debug=True: 코드 저장 시 자동 리로드
    app.run(debug=True)

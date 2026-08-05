import math
import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, redirect, render_template, request, session, url_for
from flask_cors import CORS

from config import ADMIN_PASSWORD, ADMIN_USERNAME, DATABASE_PATH, SECRET_KEY


app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
app.json.ensure_ascii = False
CORS(app)

REQUIRED_FIELDS = ["name", "district", "category", "description"]
SORT_COLUMNS = {
    "id": "a.id",
    "name": "a.name",
    "district": "a.district",
    "category": "a.category",
    "created_at": "a.created_at",
}


@app.context_processor
def inject_login_state():
    return {"is_admin": is_admin_logged_in()}


def is_admin_logged_in():
    return session.get("is_admin") is True


def require_admin_for_api():
    if not is_admin_logged_in():
        return json_response(False, "請先登入管理員帳號", None, 401)

    return None


def json_response(success, message, data=None, status_code=200, **extra):
    payload = {
        "success": success,
        "message": message,
        "data": data,
    }
    payload.update(extra)
    return jsonify(payload), status_code


def get_database():
    if "database" not in g:
        if not Path(DATABASE_PATH).exists():
            raise FileNotFoundError("SQLite 資料庫不存在，請先執行 python scripts/import_dataset.py")

        connection = sqlite3.connect(DATABASE_PATH)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        g.database = connection

    return g.database


@app.teardown_appcontext
def close_database(error=None):
    connection = g.pop("database", None)
    if connection is not None:
        connection.close()


def attraction_from_row(row):
    return dict(row)


def fetch_options():
    database = get_database()
    districts = [
        row["district"]
        for row in database.execute(
            "SELECT DISTINCT district FROM attractions ORDER BY district"
        ).fetchall()
    ]
    categories = [
        row["category"]
        for row in database.execute(
            "SELECT DISTINCT category FROM attractions ORDER BY category"
        ).fetchall()
    ]
    return districts, categories


def validate_payload(payload, partial=False):
    if not isinstance(payload, dict):
        return None, "JSON 格式錯誤，請傳入物件資料"

    cleaned = {}
    fields = [
        "name",
        "district",
        "category",
        "image",
        "description",
        "intro",
        "address",
        "suitable",
        "recommend_time",
        "tips",
        "notice",
        "transportation",
        "opening_hours",
        "best_season",
        "travel_plan",
        "highlights",
        "nearby_suggestions",
    ]

    for field in fields:
        if field in payload:
            value = payload.get(field)
            cleaned[field] = value.strip() if isinstance(value, str) else value

    missing = [
        field
        for field in REQUIRED_FIELDS
        if (not partial or field in payload) and not str(cleaned.get(field, "")).strip()
    ]

    if not partial:
        missing = [
            field
            for field in REQUIRED_FIELDS
            if not str(cleaned.get(field, "")).strip()
        ]

    if missing:
        return None, f"必要欄位不可空白：{'、'.join(missing)}"

    return cleaned, None


def get_or_create_category_id(database, category_name):
    database.execute(
        "INSERT OR IGNORE INTO categories (name) VALUES (?)",
        (category_name,),
    )
    row = database.execute(
        "SELECT id FROM categories WHERE name = ?",
        (category_name,),
    ).fetchone()
    return row["id"]


def find_attraction(attraction_id):
    return get_database().execute(
        "SELECT * FROM attractions WHERE id = ?",
        (attraction_id,),
    ).fetchone()


@app.route("/")
def index_page():
    return render_template("index.html", page="home")


@app.route("/attractions")
def list_page():
    districts, categories = fetch_options()
    return render_template(
        "list.html",
        page="list",
        districts=districts,
        categories=categories,
    )


@app.route("/attractions/<int:attraction_id>")
def detail_page(attraction_id):
    return render_template("detail.html", page="", attraction_id=attraction_id)


@app.route("/login", methods=["GET", "POST"])
def login_page():
    if is_admin_logged_in():
        return redirect(url_for("admin_page"))

    error = ""

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session["is_admin"] = True
            return redirect(url_for("admin_page"))

        error = "帳號或密碼錯誤，請重新輸入。"

    return render_template("login.html", page="login", error=error)


@app.route("/logout", methods=["POST"])
def logout_page():
    session.clear()
    return redirect(url_for("index_page"))


@app.route("/admin")
def admin_page():
    if not is_admin_logged_in():
        return redirect(url_for("login_page"))

    districts, categories = fetch_options()
    return render_template(
        "admin.html",
        page="admin",
        districts=districts,
        categories=categories,
    )


@app.route("/api/attractions", methods=["GET"])
def api_attractions():
    database = get_database()
    keyword = request.args.get("keyword", "").strip()
    district = request.args.get("district", "").strip()
    category = request.args.get("category", "").strip()
    sort = request.args.get("sort", "id").strip()
    order = request.args.get("order", "asc").lower()

    if "-" in sort:
        sort, order = sort.split("-", 1)

    sort_column = SORT_COLUMNS.get(sort, "a.id")
    order_sql = "DESC" if order == "desc" else "ASC"

    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = max(1, min(50, int(request.args.get("per_page", 100))))
    except ValueError:
        return json_response(False, "page 與 per_page 必須是數字", None, 400)

    where_clauses = []
    values = []

    if keyword:
        where_clauses.append(
            "(a.name LIKE ? OR a.description LIKE ? OR a.district LIKE ? OR a.category LIKE ?)"
        )
        like_keyword = f"%{keyword}%"
        values.extend([like_keyword, like_keyword, like_keyword, like_keyword])

    if district:
        where_clauses.append("a.district = ?")
        values.append(district)

    if category:
        where_clauses.append("a.category = ?")
        values.append(category)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    total = database.execute(
        f"SELECT COUNT(*) AS total FROM attractions a {where_sql}",
        values,
    ).fetchone()["total"]
    total_pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page

    rows = database.execute(
        f"""
        SELECT a.*
        FROM attractions a
        {where_sql}
        ORDER BY {sort_column} {order_sql}
        LIMIT ? OFFSET ?
        """,
        values + [per_page, offset],
    ).fetchall()

    return json_response(
        True,
        "取得景點資料成功",
        [attraction_from_row(row) for row in rows],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
    )


@app.route("/api/attractions/<int:attraction_id>", methods=["GET"])
def api_attraction_detail(attraction_id):
    row = find_attraction(attraction_id)

    if row is None:
        return json_response(False, "找不到指定景點", None, 404)

    return json_response(True, "取得景點資料成功", attraction_from_row(row))


@app.route("/api/attractions", methods=["POST"])
def api_create_attraction():
    auth_error = require_admin_for_api()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)
    data, error = validate_payload(payload)

    if error:
        return json_response(False, error, None, 400)

    database = get_database()
    category_id = get_or_create_category_id(database, data["category"])
    data.setdefault("image", "images/Taichung-city.jpg")
    data.setdefault("intro", data["description"])

    cursor = database.execute(
        """
        INSERT INTO attractions (
            name, district, category_id, category, image, description,
            intro, address, suitable, recommend_time, tips, notice,
            transportation, opening_hours, best_season, travel_plan,
            highlights, nearby_suggestions
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data["name"],
            data["district"],
            category_id,
            data["category"],
            data.get("image") or "images/Taichung-city.jpg",
            data["description"],
            data.get("intro") or data["description"],
            data.get("address", ""),
            data.get("suitable", "一般旅客"),
            data.get("recommend_time", "依景點開放時間"),
            data.get("tips", ""),
            data.get("notice", ""),
            data.get("transportation", ""),
            data.get("opening_hours", ""),
            data.get("best_season", ""),
            data.get("travel_plan", ""),
            data.get("highlights", ""),
            data.get("nearby_suggestions", ""),
        ),
    )
    database.commit()
    row = find_attraction(cursor.lastrowid)

    return json_response(True, "景點新增成功", attraction_from_row(row), 201)


@app.route("/api/attractions/<int:attraction_id>", methods=["PATCH", "PUT"])
def api_update_attraction(attraction_id):
    auth_error = require_admin_for_api()
    if auth_error:
        return auth_error

    if find_attraction(attraction_id) is None:
        return json_response(False, "找不到指定景點，無法修改", None, 404)

    payload = request.get_json(silent=True)
    data, error = validate_payload(payload, partial=request.method == "PATCH")

    if error:
        return json_response(False, error, None, 400)

    if not data:
        return json_response(False, "沒有提供可更新的欄位", None, 400)

    database = get_database()

    if "category" in data:
        data["category_id"] = get_or_create_category_id(database, data["category"])

    assignments = [f"{field} = ?" for field in data]
    values = list(data.values()) + [attraction_id]
    database.execute(
        f"""
        UPDATE attractions
        SET {', '.join(assignments)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        values,
    )
    database.commit()
    row = find_attraction(attraction_id)

    return json_response(True, "景點資料更新成功", attraction_from_row(row))


@app.route("/api/attractions/<int:attraction_id>", methods=["DELETE"])
def api_delete_attraction(attraction_id):
    auth_error = require_admin_for_api()
    if auth_error:
        return auth_error

    if find_attraction(attraction_id) is None:
        return json_response(False, "找不到指定景點，無法刪除", None, 404)

    database = get_database()
    database.execute("DELETE FROM attractions WHERE id = ?", (attraction_id,))
    database.execute(
        """
        DELETE FROM categories
        WHERE id NOT IN (
            SELECT DISTINCT category_id
            FROM attractions
            WHERE category_id IS NOT NULL
        )
        """
    )
    database.commit()

    return json_response(True, "景點刪除成功", None)


@app.route("/api/statistics")
def api_statistics():
    database = get_database()
    total = database.execute("SELECT COUNT(*) AS total FROM attractions").fetchone()["total"]
    categories = database.execute(
        """
        SELECT category, COUNT(*) AS total
        FROM attractions
        GROUP BY category
        ORDER BY category
        """
    ).fetchall()
    districts = database.execute(
        """
        SELECT district, COUNT(*) AS total
        FROM attractions
        GROUP BY district
        ORDER BY district
        """
    ).fetchall()
    latest = database.execute(
        """
        SELECT *
        FROM attractions
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT 5
        """
    ).fetchall()

    return json_response(
        True,
        "取得統計資料成功",
        {
            "total": total,
            "categories": [dict(row) for row in categories],
            "districts": [dict(row) for row in districts],
            "latest": [attraction_from_row(row) for row in latest],
        },
    )


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return json_response(False, "找不到指定 API 或資料", None, 404)

    return render_template("404.html", page=""), 404


@app.errorhandler(500)
def server_error(error):
    return json_response(False, "伺服器發生錯誤，請稍後再試", None, 500)


@app.errorhandler(FileNotFoundError)
def database_missing(error):
    return json_response(False, str(error), None, 500)


if __name__ == "__main__":
    print("Taichung Go Flask server running at http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)

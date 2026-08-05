import csv
import sqlite3
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATABASE_PATH = BASE_DIR / "database" / "taichung_go.db"
DATASET_PATH = BASE_DIR / "dataset" / "attractions.csv"

REQUIRED_COLUMNS = {
    "id",
    "name",
    "district",
    "category",
    "image",
    "description",
    "intro",
    "address",
    "suitable",
    "recommend_time",
}


def connect_database():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def create_tables(connection):
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS attractions (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            district TEXT NOT NULL,
            category_id INTEGER,
            category TEXT NOT NULL,
            image TEXT,
            description TEXT NOT NULL,
            intro TEXT,
            address TEXT,
            suitable TEXT,
            recommend_time TEXT,
            tips TEXT,
            notice TEXT,
            transportation TEXT,
            opening_hours TEXT,
            best_season TEXT,
            travel_plan TEXT,
            highlights TEXT,
            nearby_suggestions TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
        """
    )


def read_dataset():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"找不到資料集：{DATASET_PATH}")

    with DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        fieldnames = set(reader.fieldnames or [])
        missing_columns = REQUIRED_COLUMNS - fieldnames

        if missing_columns:
            missing = "、".join(sorted(missing_columns))
            raise ValueError(f"CSV 欄位不足，缺少：{missing}")

        return list(reader)


def get_category_id(connection, category_name):
    connection.execute(
        "INSERT OR IGNORE INTO categories (name) VALUES (?)",
        (category_name,),
    )

    row = connection.execute(
        "SELECT id FROM categories WHERE name = ?",
        (category_name,),
    ).fetchone()

    return row[0]


def clean_text(row, column, default=""):
    value = row.get(column, default)
    return value.strip() if value else default


def import_rows(connection, rows):
    imported_count = 0

    for row in rows:
        try:
            attraction_id = int(row["id"])
        except (TypeError, ValueError) as error:
            raise ValueError(f"景點 id 格式錯誤：{row.get('id')}") from error

        name = clean_text(row, "name")
        district = clean_text(row, "district")
        category = clean_text(row, "category")
        description = clean_text(row, "description")

        if not name or not district or not category or not description:
            raise ValueError(f"id={attraction_id} 的必要欄位不可空白")

        category_id = get_category_id(connection, category)

        connection.execute(
            """
            INSERT INTO attractions (
                id, name, district, category_id, category, image,
                description, intro, address, suitable, recommend_time,
                tips, notice, transportation, opening_hours, best_season,
                travel_plan, highlights, nearby_suggestions,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                district = excluded.district,
                category_id = excluded.category_id,
                category = excluded.category,
                image = excluded.image,
                description = excluded.description,
                intro = excluded.intro,
                address = excluded.address,
                suitable = excluded.suitable,
                recommend_time = excluded.recommend_time,
                tips = excluded.tips,
                notice = excluded.notice,
                transportation = excluded.transportation,
                opening_hours = excluded.opening_hours,
                best_season = excluded.best_season,
                travel_plan = excluded.travel_plan,
                highlights = excluded.highlights,
                nearby_suggestions = excluded.nearby_suggestions,
                created_at = excluded.created_at,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                attraction_id,
                name,
                district,
                category_id,
                category,
                clean_text(row, "image", "images/Taichung-city.jpg"),
                description,
                clean_text(row, "intro", description),
                clean_text(row, "address"),
                clean_text(row, "suitable", "一般旅客"),
                clean_text(row, "recommend_time", "依景點開放時間"),
                clean_text(row, "tips"),
                clean_text(row, "notice"),
                clean_text(row, "transportation"),
                clean_text(row, "opening_hours"),
                clean_text(row, "best_season"),
                clean_text(row, "travel_plan"),
                clean_text(row, "highlights"),
                clean_text(row, "nearby_suggestions"),
                clean_text(row, "created_at"),
                clean_text(row, "updated_at"),
            ),
        )
        imported_count += 1

    return imported_count


def main():
    try:
        rows = read_dataset()
        with connect_database() as connection:
            create_tables(connection)
            imported_count = import_rows(connection, rows)
            connection.commit()

        print(f"匯入完成：共處理 {imported_count} 筆景點資料。")
        print(f"SQLite 資料庫位置：{DATABASE_PATH}")
    except (FileNotFoundError, ValueError, sqlite3.Error) as error:
        print(f"匯入失敗：{error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

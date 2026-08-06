from pathlib import Path


# 以專案根目錄為基準組合路徑，從任何工作目錄啟動都能找到資料檔。
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "database" / "taichung_go.db"
DATASET_PATH = BASE_DIR / "dataset" / "attractions.csv"

# Demo 用設定；正式部署應改用環境變數，且不要把帳密明碼寫進版本庫。
SECRET_KEY = "taichung-go-demo"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

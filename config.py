from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "database" / "taichung_go.db"
DATASET_PATH = BASE_DIR / "dataset" / "attractions.csv"

SECRET_KEY = "taichung-go-demo"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Taichung Go 台中旅遊景點推薦平台

## 專案介紹

Taichung Go 是一個旅遊景點推薦網站，架構為 Flask + SQLite + 本地 CSV 資料集。網站包含首頁、景點列表、景點詳細頁、管理頁、Bootstrap 版型、圖片、Modal、SweetAlert 與 Chart.js 圖表。

## 專案功能

- 首頁：Hero、分類導覽、活動快訊、天氣區塊、本週推薦景點、AI 旅遊小幫手。
- 景點列表：關鍵字搜尋、行政區篩選、分類篩選、排序、分頁與景點卡片。
- 景點詳細頁：依網址 id 呼叫 API 顯示圖片、介紹、旅遊資訊、小知識、注意事項與交通資訊。
- 管理員登入：使用 Flask session 保護管理頁與會修改資料的 API。
- 管理頁：登入後使用 Modal 新增/修改景點，使用 SweetAlert 確認刪除，CRUD 後寫入 SQLite。
- 統計圖表：Chart.js 顯示各分類景點比例與各行政區景點數量。
- AI 規則式推薦：依分類與同行對象篩選 SQLite/API 景點資料。

## 使用技術

- 前端：HTML、CSS、JavaScript、Bootstrap、Chart.js、SweetAlert
- 後端：Python、Flask、Flask-CORS
- 資料庫：SQLite
- 資料集：UTF-8 CSV

## 系統架構

```text
本地景點資料集 dataset/attractions.csv
    ↓
scripts/import_dataset.py
    ↓
SQLite database/taichung_go.db
    ↓
Flask RESTful API app.py
    ↓
前端 JavaScript fetch()
    ↓
首頁、景點列表、景點詳細頁、管理頁與統計圖表
```

## 安裝方式

Windows：

```bash
python -m venv venv

(如無法順利進入venv，則先輸入)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

venv\Scripts\activate
pip install -r requirements.txt
```

## 資料集匯入方式

```bash
python scripts/import_dataset.py
```

匯入程式會自動建立資料庫與資料表，並使用 id 避免重複新增相同景點。可重複執行。

## 啟動方式

```bash
python app.py
```

啟動後開啟：

```text
http://127.0.0.1:5000
```

## API 說明

| 方法 | 路徑 | 功能 |
|---|---|---|
| GET | `/api/attractions` | 取得景點列表，支援 keyword、district、category、page、per_page、sort、order |
| GET | `/api/attractions/<id>` | 取得單一景點 |
| POST | `/api/attractions` | 新增景點，需管理員登入 |
| PATCH/PUT | `/api/attractions/<id>` | 修改景點，需管理員登入 |
| DELETE | `/api/attractions/<id>` | 刪除景點，需管理員登入 |
| GET | `/api/statistics` | 取得總數、分類統計、行政區統計、最新資料 |

統一回傳格式：

```json
{
    "success": true,
    "message": "取得景點資料成功",
    "data": []
}
```

## CRUD 操作說明

管理頁位於 `/admin`，需要先登入。

Demo 帳密：

```text
帳號：admin
密碼：admin123
```

登入後每頁預設 10 筆資料，可以搜尋、篩選、開啟 Modal 新增或修改景點。刪除前會顯示 SweetAlert 確認視窗，完成後重新呼叫 API 載入最新 SQLite 資料。

## Chart.js 統計圖表說明

管理頁會呼叫 `/api/statistics`，以資料庫內容產生：

- 景點分類分布 doughnut chart
- 行政區景點數量 bar chart

新增、修改或刪除景點後重新載入統計資料，圖表會更新。

## AI 規則式推薦說明

此功能為規則式推薦，用於模擬 AI 旅遊推薦流程。它會從 Flask API 取得景點資料，再依「喜歡類型」與「同行對象」篩選前 3 筆符合條件的景點；沒有使用付費 AI API，也沒有宣稱使用機器學習模型。

生成式 AI 使用說明：本專案的旅遊標語、景點介紹文字、行程建議、小知識與推薦提示文字，可作為 ChatGPT 輔助產出的網站內容展示。

## SQLite 資料表欄位

`categories`

| 欄位 | 說明 |
|---|---|
| id | 分類主鍵 |
| name | 分類名稱 |
| created_at | 建立時間 |

`attractions`

| 欄位 | 說明 |
|---|---|
| id | 景點主鍵 |
| name | 景點名稱 |
| district | 行政區 |
| category_id | 對應 categories.id |
| category | 分類名稱，方便初學者查看 |
| image | 本地圖片相對路徑 |
| description | 列表簡介 |
| intro | 詳細介紹 |
| address | 地址 |
| suitable | 適合族群 |
| recommend_time | 建議時段 |
| tips | 景點小知識 |
| notice | 注意事項 |
| transportation | 交通資訊 |
| opening_hours | 開放時間 |
| best_season | 最佳季節 |
| travel_plan | 行程建議 |
| highlights | 景點特色 |
| nearby_suggestions | 周邊提案 |
| created_at | 建立時間 |
| updated_at | 更新時間 |

## 常見問題

- 找不到資料庫：請先執行 `python scripts/import_dataset.py`。
- 中文亂碼：請確認 CSV 使用 UTF-8 或 UTF-8 with BOM 儲存。
- 圖片破圖：請確認圖片在 `static/images/` 中，資料庫 image 欄位使用 `images/檔名`。
- Chart.js 或 SweetAlert 無法顯示：請確認瀏覽器可載入對應前端套件；主要 CRUD API 不受影響。

## 作者可自行修改的資料區塊

- 景點資料：`dataset/attractions.csv`
- 圖片：`static/images/`
- 前端樣式：`static/css/style.css`
- API 與資料庫邏輯：`app.py`
- 匯入流程：`scripts/import_dataset.py`

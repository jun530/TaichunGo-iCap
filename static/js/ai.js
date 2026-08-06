document.addEventListener("DOMContentLoaded", async () => {
    // 此功能為透明的規則式推薦：先取得景點，再在瀏覽器端篩選。
    const button = document.getElementById("aiRecommendBtn");
    const resultBox = document.getElementById("aiResult");
    const categorySelect = document.getElementById("travelCategory");

    if (!button || !resultBox || !categorySelect) {
        return;
    }

    let attractions = [];

    try {
        const result = await apiFetch("/api/attractions?sort=id&order=asc&per_page=100");
        attractions = result.data;
        // 從實際資料整理不重複分類，填入推薦條件下拉選單。
        const categories = [...new Set(attractions.map((item) => item.category))];

        categories.forEach((category) => {
            categorySelect.insertAdjacentHTML(
                "beforeend",
                `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
            );
        });
    } catch (error) {
        resultBox.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    AI 規則式推薦資料載入失敗：${escapeHtml(error.message)}
                </div>
            </div>
        `;
    }

    button.addEventListener("click", () => {
        // 分類完全相符、同行對象包含於 suitable 欄位，即視為推薦候選。
        const category = categorySelect.value;
        const people = document.getElementById("travelPeople").value;
        const matches = attractions
            .filter((item) => {
                const matchCategory = !category || item.category === category;
                const matchPeople = !people || String(item.suitable || "").includes(people);
                return matchCategory && matchPeople;
            })
            .slice(0, 3);
        // 沒有符合條件時仍提供前三筆景點，避免推薦區塊留白。
        const selected = matches.length ? matches : attractions.slice(0, 3);

        resultBox.innerHTML = `
            <div class="col-12">
                <div class="alert alert-success">
                    此功能為規則式推薦，用於模擬 AI 旅遊推薦流程。以下依「${escapeHtml(category || "不限定類型")}」與「${escapeHtml(people)}」條件產生建議。
                </div>
            </div>
            ${selected.map(createAttractionCard).join("")}
        `;
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // 列表頁狀態集中管理，篩選、分頁與取消舊請求都共用這份狀態。
    const perPage = 6;
    const state = {
        page: 1,
        totalPages: 1,
        debounceId: null,
        controller: null
    };

    const $ = (id) => document.getElementById(id);
    const form = $("attractionFilter");

    if (!form) {
        return;
    }

    function readInitialQuery() {
        // 讓網址列的查詢參數回填到表單，重新整理或分享連結仍保留篩選條件。
        const params = new URLSearchParams(location.search);
        ["keyword", "district", "category", "sort"].forEach((name) => {
            if (params.has(name) && form.elements[name]) {
                form.elements[name].value = params.get(name);
            }
        });
    }

    function currentParams() {
        // 將目前表單值轉成 API 可使用的 query string。
        const params = new URLSearchParams();

        ["keyword", "district", "category", "sort"].forEach((name) => {
            const value = form.elements[name].value.trim();

            if (value) {
                params.set(name, value);
            }
        });

        params.set("page", state.page);
        params.set("per_page", perPage);
        return params;
    }

    function renderPagination() {
        // 依 API 回傳的總頁數建立頁碼按鈕。
        const pagination = $("pagination");
        pagination.innerHTML = "";

        if (state.totalPages <= 1) {
            return;
        }

        for (let page = 1; page <= state.totalPages; page += 1) {
            const item = document.createElement("li");
            item.className = `page-item ${page === state.page ? "active" : ""}`;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "page-link";
            button.textContent = page;
            button.addEventListener("click", () => {
                state.page = page;
                fetchAttractions();
                $("listResult").scrollIntoView({ behavior: "smooth", block: "start" });
            });
            item.appendChild(button);
            pagination.appendChild(item);
        }
    }

    function render(result) {
        // 將 API 景點陣列轉為卡片，同時更新筆數與空資料提示。
        state.totalPages = result.total_pages;
        $("resultInfo").textContent =
            `共找到 ${result.total} 筆景點（第 ${result.page} / ${result.total_pages} 頁）`;
        $("listResult").innerHTML = result.data.map(createAttractionCard).join("");
        $("emptyState").classList.toggle("d-none", result.total !== 0);
        renderPagination();
    }

    async function fetchAttractions() {
        // 新請求前取消前一個尚未完成的請求，避免快速輸入時舊結果覆蓋新結果。
        state.controller?.abort();
        state.controller = new AbortController();
        const params = currentParams();

        try {
            $("ajaxStatus").textContent = "正在更新景點列表";
            const response = await fetch(`/api/attractions?${params.toString()}`, {
                headers: { Accept: "application/json" },
                signal: state.controller.signal
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "景點資料讀取失敗");
            }

            // 同步更新網址，不重新載入整個頁面。
            history.replaceState(null, "", `/attractions?${params.toString()}`);
            render(result);
        } catch (error) {
            if (error.name === "AbortError") {
                return;
            }

            $("listResult").innerHTML = "";
            $("emptyState").textContent = `景點資料讀取失敗：${error.message}`;
            $("emptyState").classList.remove("d-none");
        }
    }

    function queueFetch() {
        // 關鍵字輸入採 250ms 防抖，避免每打一個字就大量呼叫 API。
        clearTimeout(state.debounceId);
        state.debounceId = setTimeout(() => {
            state.page = 1;
            fetchAttractions();
        }, 250);
    }

    // 表單送出、下拉選擇與清除按鈕都會重新載入第一頁資料。
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        state.page = 1;
        fetchAttractions();
    });

    $("keyword").addEventListener("input", queueFetch);
    ["district", "category", "sort"].forEach((id) => {
        $(id).addEventListener("change", () => {
            state.page = 1;
            fetchAttractions();
        });
    });

    $("clearFilters").addEventListener("click", () => {
        form.reset();
        state.page = 1;
        fetchAttractions();
    });

    readInitialQuery();
    fetchAttractions();
});

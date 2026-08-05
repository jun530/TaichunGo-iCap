document.addEventListener("DOMContentLoaded", () => {
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
        const params = new URLSearchParams(location.search);
        ["keyword", "district", "category", "sort"].forEach((name) => {
            if (params.has(name) && form.elements[name]) {
                form.elements[name].value = params.get(name);
            }
        });
    }

    function currentParams() {
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
        state.totalPages = result.total_pages;
        $("resultInfo").textContent =
            `共找到 ${result.total} 筆景點（第 ${result.page} / ${result.total_pages} 頁）`;
        $("listResult").innerHTML = result.data.map(createAttractionCard).join("");
        $("emptyState").classList.toggle("d-none", result.total !== 0);
        renderPagination();
    }

    async function fetchAttractions() {
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
        clearTimeout(state.debounceId);
        state.debounceId = setTimeout(() => {
            state.page = 1;
            fetchAttractions();
        }, 250);
    }

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

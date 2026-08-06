document.addEventListener("DOMContentLoaded", () => {
    // 管理頁集中維護目前頁碼、資料列與圖表實例。
    const form = document.getElementById("attractionForm");
    const modalElement = document.getElementById("attractionModal");
    const modal = new bootstrap.Modal(modalElement);
    const pageSize = 10;
    const state = {
        page: 1,
        totalPages: 1,
        items: []
    };
    let categoryChart;
    let districtChart;

    // 表單欄位清單用於重設驗證狀態與輸入提示。
    const fieldIds = [
        "name",
        "formDistrict",
        "formCategory",
        "image",
        "description",
        "intro",
        "address",
        "suitable",
        "recommendTime"
    ];

    const $ = (id) => document.getElementById(id);
    const getValue = (id) => $(id).value.trim();

    function showAlert(message, type = "warning") {
        // 頁面上方的 Bootstrap 提示區，適合顯示載入等非確認式訊息。
        const alert = $("adminAlert");
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.classList.remove("d-none");
    }

    function hideAlert() {
        $("adminAlert").classList.add("d-none");
    }

    function notify(options) {
        // 優先使用 SweetAlert；套件未載入時仍可退回瀏覽器原生提示。
        if (window.Swal) {
            return Swal.fire(options);
        }

        window.alert(options.text || options.title || "操作完成");
        return Promise.resolve({ isConfirmed: true });
    }

    function currentParams() {
        // 將後台篩選條件與目前頁碼轉成景點列表 API 的參數。
        const params = new URLSearchParams();
        const filters = {
            keyword: getValue("adminKeyword"),
            district: getValue("adminDistrict"),
            category: getValue("adminCategory")
        };

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });

        params.set("sort", "id");
        params.set("order", "asc");
        params.set("page", state.page);
        params.set("per_page", pageSize);
        return params;
    }

    async function loadData() {
        // 重新載入表格、總筆數與圖表；CRUD 成功後也會呼叫這裡同步畫面。
        try {
            hideAlert();
            const result = await apiFetch(`/api/attractions?${currentParams().toString()}`);
            state.items = result.data;
            state.page = result.page;
            state.totalPages = result.total_pages;
            $("totalAttractions").textContent = result.total;
            renderTable(result.total);
            renderPagination(result.total);
            await loadStatistics();
        } catch (error) {
            showAlert(`資料載入失敗：${error.message}`, "danger");
        }
    }

    function renderTable(total) {
        // 將目前頁面的景點資料轉成表格列，並綁定查看、修改、刪除按鈕。
        if (!state.items.length) {
            $("adminRows").innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-secondary">查無景點資料。</td>
                </tr>
            `;
            return;
        }

        $("adminRows").innerHTML = state.items.map((item) => `
            <tr>
                <td>
                    <img
                        src="${imageSource(item.image)}"
                        alt="${escapeHtml(item.name)}"
                        onerror="this.src='/static/images/Taichung-city.jpg'"
                    >
                </td>
                <td>
                    <strong class="d-block mb-1">${escapeHtml(item.name)}</strong>
                    <span class="admin-badge">${escapeHtml(item.district)}</span>
                    <span class="admin-badge">${escapeHtml(item.category)}</span>
                </td>
                <td class="text-secondary">${formatDate(item.created_at)}</td>
                <td class="text-end text-nowrap">
                    <a class="btn btn-sm btn-light border" href="/attractions/${item.id}">查看</a>
                    <button class="btn btn-sm btn-light border edit" data-id="${item.id}" type="button">修改</button>
                    <button class="btn btn-sm btn-outline-danger delete" data-id="${item.id}" type="button">刪除</button>
                </td>
            </tr>
        `).join("");

        document.querySelectorAll(".edit").forEach((button) => {
            button.addEventListener("click", () => editAttraction(Number(button.dataset.id)));
        });

        document.querySelectorAll(".delete").forEach((button) => {
            button.addEventListener("click", () => deleteAttraction(Number(button.dataset.id)));
        });

        // 顯示目前頁範圍，例如「第 11～20 筆，共 36 筆」。
        const startItem = (state.page - 1) * pageSize + 1;
        const endItem = Math.min(state.page * pageSize, total);
        $("pageInfo").textContent = `顯示第 ${startItem}～${endItem} 筆，共 ${total} 筆`;
    }

    function renderPagination(total) {
        // 依 API 回傳的 total_pages 建立後台分頁控制項。
        const pagination = $("pagination");
        pagination.innerHTML = "";

        if (!total) {
            $("pageInfo").textContent = "目前沒有景點資料";
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
                loadData();
            });
            item.appendChild(button);
            pagination.appendChild(item);
        }
    }

    // 圖表
    async function loadStatistics() {
        // 統計與列表資料分開取得，避免篩選中的列表影響全資料庫統計。
        const result = await apiFetch("/api/statistics");
        const colors = [
            "#087f78",
            "#20c997",
            "#0dcaf0",
            "#0d6efd",
            "#fd7e14",
            "#6f42c1",
            "#d63384",
            "#ffc107"
        ];

        if (!window.Chart) {
            showAlert("Chart.js 尚未載入，統計資料已由 API 取得，但圖表無法顯示。", "warning");
            return;
        }

        // Chart.js 重畫前必須先銷毀舊實例，否則 canvas 會重複疊圖。
        if (categoryChart) {
            categoryChart.destroy();
        }

        if (districtChart) {
            districtChart.destroy();
        }

        categoryChart = new Chart($("categoryChart"), {
            type: "doughnut",
            data: {
                labels: result.data.categories.map((item) => item.category),
                datasets: [{
                    data: result.data.categories.map((item) => item.total),
                    backgroundColor: colors,
                    borderColor: "#ffffff",
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        });

        districtChart = new Chart($("districtChart"), {
            type: "bar",
            data: {
                labels: result.data.districts.map((item) => item.district),
                datasets: [{
                    label: "景點數量",
                    data: result.data.districts.map((item) => item.total),
                    backgroundColor: "rgba(8, 127, 120, 0.7)",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    async function editAttraction(id) {
        // 先讀取最新單筆資料，再把值帶入同一個 Modal 供編輯。
        try {
            const result = await apiFetch(`/api/attractions/${id}`);
            const item = result.data;
            $("id").value = item.id;
            $("name").value = item.name || "";
            $("formDistrict").value = item.district || "";
            $("formCategory").value = item.category || "";
            $("image").value = item.image || "";
            $("description").value = item.description || "";
            $("intro").value = item.intro || "";
            $("address").value = item.address || "";
            $("suitable").value = item.suitable || "";
            $("recommendTime").value = item.recommend_time || "";
            $("formTitle").textContent = "修改景點";
            modal.show();
        } catch (error) {
            notify({
                icon: "warning",
                title: "查無資料",
                text: error.message,
                confirmButtonText: "確定"
            });
        }
    }

    function resetForm() {
        // 新增前或 Modal 關閉後清空表單，避免上一次編輯內容殘留。
        form.reset();
        form.classList.remove("was-validated");
        $("id").value = "";
        $("formTitle").textContent = "新增景點";

        fieldIds.forEach((id) => {
            $(id).classList.remove("is-invalid");
        });
    }

    function validateForm() {
        // 前端先提示必要欄位；後端仍會再驗證，避免繞過瀏覽器直接呼叫 API。
        const requiredFields = ["name", "formDistrict", "formCategory", "description"];
        let valid = true;

        requiredFields.forEach((id) => {
            const missing = !getValue(id);
            $(id).classList.toggle("is-invalid", missing);

            if (missing) {
                valid = false;
            }
        });

        if (!valid) {
            notify({
                icon: "error",
                title: "資料填寫不完整",
                text: "請完成景點名稱、地區、分類及簡短介紹。",
                confirmButtonText: "返回填寫"
            });
        }

        return valid;
    }

    function formPayload() {
        // 將表單欄位轉成後端 API 要求的 JSON 欄位名稱與預設值。
        return {
            name: getValue("name"),
            district: getValue("formDistrict"),
            category: getValue("formCategory"),
            image: getValue("image") || "images/Taichung-city.jpg",
            description: getValue("description"),
            intro: getValue("intro") || getValue("description"),
            address: getValue("address"),
            suitable: getValue("suitable") || "一般旅客",
            recommend_time: getValue("recommendTime") || "依景點開放時間"
        };
    }

    async function deleteAttraction(id) {
        // 刪除不可直接復原，因此先要求使用者在 SweetAlert 確認。
        const item = state.items.find((attraction) => attraction.id === id);
        const confirmResult = await notify({
            title: "確定要刪除嗎？",
            html: `即將刪除景點：<strong>${escapeHtml(item?.name || `#${id}`)}</strong><br>刪除後將無法直接復原。`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "確定刪除",
            cancelButtonText: "取消",
            reverseButtons: true
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        try {
            const result = await apiFetch(`/api/attractions/${id}`, { method: "DELETE" });
            // 成功後重新取得資料，讓表格、筆數與兩張圖表立即一致。
            await loadData();
            notify({
                icon: "success",
                title: "刪除成功",
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            notify({
                icon: "error",
                title: "刪除失敗",
                text: error.message,
                confirmButtonText: "確定"
            });
        }
    }

    form.addEventListener("submit", async (event) => {
        // 同一張表單同時處理新增與修改：有 id 用 PATCH，沒有 id 用 POST。
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const id = Number(getValue("id"));
        const method = id ? "PATCH" : "POST";
        const url = id ? `/api/attractions/${id}` : "/api/attractions";

        try {
            const result = await apiFetch(url, {
                method,
                body: JSON.stringify(formPayload())
            });
            modal.hide();
            resetForm();
            await loadData();
            notify({
                icon: "success",
                title: id ? "修改成功" : "新增成功",
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            notify({
                icon: "error",
                title: id ? "修改失敗" : "新增失敗",
                text: error.message,
                confirmButtonText: "確定"
            });
        }
    });

    $("adminFilter").addEventListener("submit", (event) => {
        // 搜尋條件改變時一律回到第一頁，避免落在不存在的頁碼。
        event.preventDefault();
        state.page = 1;
        loadData();
    });

    // 關鍵字即時搜尋；下拉選單變更後立即重新查詢。
    ["adminKeyword", "adminDistrict", "adminCategory"].forEach((id) => {
        const eventName = id === "adminKeyword" ? "input" : "change";
        $(id).addEventListener(eventName, () => {
            state.page = 1;
            loadData();
        });
    });

    // 按新增時開啟已重設的 Modal。
    $("addAttraction").addEventListener("click", () => {
        resetForm();
        modal.show();
    });

    modalElement.addEventListener("hidden.bs.modal", resetForm);

    fieldIds.forEach((id) => {
        $(id).addEventListener("input", () => {
            $(id).classList.remove("is-invalid");
        });
    });

    // 管理頁初始化：先取得第一頁資料與統計圖表。
    loadData();
});

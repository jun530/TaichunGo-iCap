function imageSource(image) {
    if (!image) {
        return "/static/images/Taichung-city.jpg";
    }

    if (/^(https?:)?\/\//.test(image)) {
        return image;
    }

    return `/static/${image.replace(/^\//, "")}`;
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function formatDate(value) {
    return value ? String(value).slice(0, 10) : "未提供";
}

function renderNav() {
    const page = document.body.dataset.page;
    const links = [
        ["/", "首頁", "home"],
        ["/attractions", "景點列表", "list"],
        ["/#trip-assistant", "AI 幫手", "ai"]
    ];
    const isAdminLoggedIn = window.isAdminLoggedIn === true;

    document.querySelectorAll("[data-navbar]").forEach((element) => {
        element.innerHTML = `
            <nav class="navbar navbar-expand-lg bg-white shadow-sm sticky-top">
                <div class="container">
                    <a class="navbar-brand text-success" href="/">Taichung Go</a>
                    <button
                        class="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#nav"
                        aria-label="切換導覽列"
                    >
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div id="nav" class="collapse navbar-collapse">
                        <ul class="navbar-nav ms-auto">
                            ${links.map(([url, label, key]) => `
                                <li class="nav-item">
                                    <a class="nav-link ${page === key ? "active" : ""}" href="${url}">
                                        ${label}
                                    </a>
                                </li>
                            `).join("")}
                            ${isAdminLoggedIn ? `
                                <li class="nav-item">
                                    <a class="nav-link ${page === "admin" ? "active" : ""}" href="/admin">
                                        管理頁
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <form method="POST" action="/logout">
                                        <button class="nav-link border-0 bg-transparent" type="submit">
                                            登出
                                        </button>
                                    </form>
                                </li>
                            ` : `
                                <li class="nav-item">
                                    <a class="nav-link ${page === "login" ? "active" : ""}" href="/login">
                                        管理員登入
                                    </a>
                                </li>
                            `}
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    });
}

function renderFooter() {
    document.querySelectorAll("[data-footer]").forEach((element) => {
        element.innerHTML = `
            <footer class="footer mt-5 py-4">
                <div class="container d-flex flex-column flex-md-row justify-content-between gap-2">
                    <span>© 2026 Taichung Go｜AI 輔助旅遊景點推薦平台</span>
                    <span>用旅行認識台中，從一個景點開始。</span>
                </div>
            </footer>
        `;
    });
}

function createAttractionCard(item) {
    return `
        <div class="col">
            <article class="card attraction-card h-100">
                <img
                    src="${imageSource(item.image)}"
                    alt="${escapeHtml(item.name)} 的照片"
                    onerror="this.src='/static/images/Taichung-city.jpg'"
                >
                <div class="card-body d-flex flex-column">
                    <span class="badge badge-category align-self-start">
                        ${escapeHtml(item.category)}
                    </span>
                    <h3 class="h5 mt-2">${escapeHtml(item.name)}</h3>
                    <p class="small text-secondary mb-2">${escapeHtml(item.district)}</p>
                    <p class="card-text clamp-2">${escapeHtml(item.description)}</p>
                    <a class="btn btn-outline-success mt-auto" href="/attractions/${item.id}">
                        查看詳細介紹
                    </a>
                </div>
            </article>
        </div>
    `;
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const result = await response.json().catch(() => ({
        success: false,
        message: "API 回傳格式錯誤",
        data: null
    }));

    if (!response.ok || !result.success) {
        throw new Error(result.message || "API 請求失敗");
    }

    return result;
}

document.addEventListener("DOMContentLoaded", () => {
    renderNav();
    renderFooter();
});

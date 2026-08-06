document.addEventListener("DOMContentLoaded", async () => {
    // 首頁精選區只取得前三筆景點，不必一次載入全部資料。
    const featured = document.getElementById("featuredList");
    const alert = document.getElementById("homeAlert");

    if (!featured) {
        return;
    }

    try {
        const result = await apiFetch("/api/attractions?sort=id&order=asc&per_page=3");
        featured.innerHTML = result.data.map(createAttractionCard).join("");
    } catch (error) {
        alert.textContent = `精選景點載入失敗：${error.message}`;
        alert.classList.remove("d-none");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // 活動資料目前是 index.html 的靜態內容，此處只控制輪播行為。
    const carousel = document.querySelector("[data-event-carousel]");

    if (!carousel) {
        return;
    }

    const track = carousel.querySelector(".event-track");
    const cards = carousel.querySelectorAll(".event-card");
    const dotsBox = carousel.querySelector(".event-dots");
    let index = 0;
    let timer;

    const visibleCards = () => {
        // 依螢幕寬度決定一次顯示 1、2 或 3 張卡片。
        if (window.innerWidth < 576) {
            return 1;
        }

        return window.innerWidth < 992 ? 2 : 3;
    };

    const maxIndex = () => Math.max(0, cards.length - visibleCards());

    function renderDots() {
        // 根據可移動頁數建立輪播圓點。
        dotsBox.innerHTML = "";

        for (let i = 0; i <= maxIndex(); i += 1) {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.setAttribute("aria-label", `第 ${i + 1} 組活動`);
            dot.classList.toggle("is-active", i === index);
            dot.addEventListener("click", () => {
                index = i;
                update();
                restart();
            });
            dotsBox.appendChild(dot);
        }
    }

    function update() {
        // 以 CSS transform 推動卡片軌道，切換目前輪播位置。
        const cardWidth = cards[0].offsetWidth;
        track.style.transform = `translateX(-${index * (cardWidth + 20)}px)`;

        dotsBox.querySelectorAll("button").forEach((dot, dotIndex) => {
            dot.classList.toggle("is-active", dotIndex === index);
        });
    }

    function next() {
        index = index >= maxIndex() ? 0 : index + 1;
        update();
    }

    function previous() {
        index = index <= 0 ? maxIndex() : index - 1;
        update();
    }

    function restart() {
        // 手動點擊後重新計時，避免剛操作完立刻又被自動輪播切走。
        clearInterval(timer);
        timer = setInterval(next, 5000);
    }

    carousel.querySelector("[data-event-next]").addEventListener("click", () => {
        next();
        restart();
    });

    carousel.querySelector("[data-event-prev]").addEventListener("click", () => {
        previous();
        restart();
    });

    window.addEventListener("resize", () => {
        index = 0;
        renderDots();
        update();
    });

    renderDots();
    update();
    restart();
});

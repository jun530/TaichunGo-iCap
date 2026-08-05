document.addEventListener("DOMContentLoaded", async () => {
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
        if (window.innerWidth < 576) {
            return 1;
        }

        return window.innerWidth < 992 ? 2 : 3;
    };

    const maxIndex = () => Math.max(0, cards.length - visibleCards());

    function renderDots() {
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

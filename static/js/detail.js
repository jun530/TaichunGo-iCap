document.addEventListener("DOMContentLoaded", async () => {
    // 詳細頁只由樣板提供 id，完整內容一律透過 API 取得。
    const detail = document.getElementById("detailContent");

    if (!detail) {
        return;
    }

    const attractionId = Number(detail.dataset.attractionId);

    if (!Number.isInteger(attractionId) || attractionId <= 0) {
        // 將完整景點欄位分區渲染；缺少的選填資料會以友善預設文字代替。
        detail.innerHTML = `
            <div class="alert alert-warning">
                景點 id 格式錯誤，請回到列表重新選擇。
            </div>
        `;
        return;
    }

    try {
        const result = await apiFetch(`/api/attractions/${attractionId}`);
        const item = result.data;

        detail.innerHTML = `
            <section class="detail-hero">
                <img
                    src="${imageSource(item.image)}"
                    alt="${escapeHtml(item.name)}"
                    onerror="this.src='/static/images/Taichung-city.jpg'"
                >
                <div class="detail-hero-overlay">
                    <p class="mb-2 small">TAICHUNG GO · ${escapeHtml(item.district)}</p>
                    <span class="detail-category">${escapeHtml(item.category)}</span>
                    <h1>${escapeHtml(item.name)}</h1>
                    <p>${escapeHtml(item.description)}</p>
                </div>
            </section>

            <section class="detail-summary row g-3">
                <div class="col-md-4">
                    <div class="detail-summary-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <div><span>所在區域</span><strong>${escapeHtml(item.district)}</strong></div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-summary-item">
                        <i class="fa-solid fa-users"></i>
                        <div><span>適合對象</span><strong>${escapeHtml(item.suitable || "所有旅客")}</strong></div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-summary-item">
                        <i class="fa-regular fa-clock"></i>
                        <div><span>建議時段</span><strong>${escapeHtml(item.recommend_time || "依現場公告")}</strong></div>
                    </div>
                </div>
            </section>

            <div class="row g-4 detail-section">
                <div class="col-lg-8">
                    <article class="detail-content-card">
                        <div class="detail-section-heading">
                            <span>ABOUT THE PLACE</span>
                            <h2>景點介紹</h2>
                        </div>
                        <p class="detail-intro">${escapeHtml(item.intro || item.description)}</p>
                        <div class="detail-rich-copy">
                            <h3>值得慢慢體驗的景點特色</h3>
                            <p>${escapeHtml(item.highlights || item.description)}</p>
                            <h3>周邊探索提案</h3>
                            <p>${escapeHtml(item.nearby_suggestions || "建議保留一些彈性時間，從景點周邊的街區、綠地或特色店家延伸你的台中旅程。")}</p>
                        </div>
                        <div class="detail-highlights">
                            <div>
                                <i class="fa-solid fa-camera"></i>
                                <strong>最佳旅遊季節</strong>
                                <p>${escapeHtml(item.best_season || "依天候與現場活動安排參觀時間。")}</p>
                            </div>
                            <div>
                                <i class="fa-solid fa-route"></i>
                                <strong>行程建議</strong>
                                <p>${escapeHtml(item.travel_plan || "可與周邊景點搭配，規劃一趟輕鬆的半日旅行。")}</p>
                            </div>
                        </div>
                    </article>
                </div>
                <aside class="col-lg-4">
                    <div class="detail-info-card">
                        <div class="detail-info-title">
                            <span>VISIT INFORMATION</span>
                            <h2>旅遊資訊</h2>
                        </div>
                        <div class="detail-info-item"><span>地址</span><strong>${escapeHtml(item.address || "請依地圖資訊前往")}</strong></div>
                        <div class="detail-info-item"><span>景點分類</span><strong>${escapeHtml(item.category)}</strong></div>
                        <div class="detail-info-item"><span>開放時間</span><strong>${escapeHtml(item.opening_hours || "請依現場公告為準")}</strong></div>
                        <div class="detail-info-item"><span>資料建立</span><strong>${formatDate(item.created_at)}</strong></div>
                    </div>
                </aside>
            </div>

            <section class="detail-transport-card mt-4">
                <div class="detail-note-icon"><i class="fa-solid fa-bus-simple"></i></div>
                <div>
                    <span class="detail-note-label">GETTING THERE</span>
                    <h2>交通與行前準備</h2>
                    <p>${escapeHtml(item.transportation || "建議出發前確認大眾運輸班次、停車資訊及路線。")}</p>
                </div>
            </section>

            <section class="row g-4 mt-1">
                <div class="col-md-6">
                    <article class="detail-note-card knowledge-card">
                        <div class="detail-note-icon"><i class="fa-solid fa-lightbulb"></i></div>
                        <div>
                            <span class="detail-note-label">LOCAL KNOWLEDGE</span>
                            <h2>景點小知識</h2>
                            <p>${escapeHtml(item.tips || "每個景點都有自己的在地故事，放慢腳步感受周邊環境與文化脈絡。")}</p>
                        </div>
                    </article>
                </div>
                <div class="col-md-6">
                    <article class="detail-note-card tips-card">
                        <div class="detail-note-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
                        <div>
                            <span class="detail-note-label">TRAVEL REMINDER</span>
                            <h2>旅遊注意事項</h2>
                            <p>${escapeHtml(item.notice || "請遵守現場公告，留意天候、交通與開放時間，共同維護景點環境。")}</p>
                        </div>
                    </article>
                </div>
            </section>
        `;
    } catch (error) {
        // id 不存在或 API 失敗時，保留可返回列表的錯誤畫面。
        detail.innerHTML = `
            <div class="detail-error">
                <h1 class="section-title">找不到此景點資料</h1>
                <p class="text-secondary">${escapeHtml(error.message)}</p>
                <a class="btn btn-teal" href="/attractions">回景點列表</a>
            </div>
        `;
    }
});

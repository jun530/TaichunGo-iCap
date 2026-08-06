document.addEventListener("DOMContentLoaded", async () => {
    // 首頁才有 weatherUpdate 元素；其他頁面載入此檔時可直接結束。
    const update = document.getElementById("weatherUpdate");

    if (!update) {
        return;
    }

    // 將 Open-Meteo 的數字天氣代碼轉成網站顯示用圖示與繁中文字。
    const weatherCodes = {
        0: ["☀️", "晴朗"],
        1: ["🌤️", "晴時多雲"],
        2: ["⛅", "局部多雲"],
        3: ["☁️", "陰天"],
        45: ["🌫️", "有霧"],
        51: ["🌦️", "毛毛雨"],
        61: ["🌧️", "小雨"],
        63: ["🌧️", "中雨"],
        65: ["🌧️", "大雨"],
        80: ["🌦️", "陣雨"],
        95: ["⛈️", "雷雨"]
    };

    try {
        // 直接向 Open-Meteo 請求台中座標的即時與當日資料，最多等待 3 秒。
        const response = await fetch(
            "https://api.open-meteo.com/v1/forecast?latitude=24.1477&longitude=120.6736&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=precipitation_probability_max&timezone=Asia%2FTaipei",
            { signal: AbortSignal.timeout(3000) }
        );

        if (!response.ok) {
            throw new Error("Weather request failed");
        }

        const data = await response.json();
        const current = data.current;
        const [icon, description] = weatherCodes[current.weather_code] || ["🌤️", "天氣資訊"];

        document.getElementById("weatherIcon").textContent = icon;
        document.getElementById("weatherText").textContent = description;
        document.getElementById("weatherTemperature").innerHTML =
            `${Math.round(current.temperature_2m)}<span>°C</span>`;
        document.getElementById("weatherFeel").textContent =
            `體感溫度 ${Math.round(current.apparent_temperature)}°C`;
        document.getElementById("weatherRain").textContent =
            `${data.daily.precipitation_probability_max[0] ?? "--"}%`;
        document.getElementById("weatherWind").textContent =
            `${Math.round(current.wind_speed_10m)} km/h`;
        update.textContent = `資料更新：${current.time.replace("T", " ")}`;
    } catch (error) {
        // 天氣是輔助資訊，失敗時不阻斷首頁其他功能。
        update.textContent = "目前無法連接天氣服務，主要 Demo 功能不受影響。";
    }
});


const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const refreshBtn = document.getElementById("refreshBtn");
const themeBtn = document.getElementById("themeBtn");
const message = document.getElementById("message");
const dashboard = document.getElementById("dashboard");

let selectedLocation = null;

const pollutants = [
    { key: "pm2_5", valueId: "pm25Value", barId: "pm25Bar", max: 75, decimals: 1 },
    { key: "pm10", valueId: "pm10Value", barId: "pm10Bar", max: 150, decimals: 1 },
    { key: "nitrogen_dioxide", valueId: "no2Value", barId: "no2Bar", max: 200, decimals: 1 },
    { key: "ozone", valueId: "o3Value", barId: "o3Bar", max: 180, decimals: 1 },
    { key: "carbon_monoxide", valueId: "coValue", barId: "coBar", max: 10000, decimals: 0 },
    { key: "sulphur_dioxide", valueId: "so2Value", barId: "so2Bar", max: 100, decimals: 1 }
];

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = "message";

    if (type) {
        message.classList.add(type);
    }

    message.hidden = false;
}

function setLoading(isLoading) {
    searchBtn.disabled = isLoading;
    refreshBtn.disabled = isLoading;

    searchBtn.textContent = isLoading ? "Searching..." : "Search";
    refreshBtn.textContent = isLoading ? "Refreshing..." : "↻ Refresh";
}

function formatNumber(value, decimals = 1) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "N/A";
    }

    return Number(value).toLocaleString(undefined, {
        maximumFractionDigits: decimals
    });
}

async function findCity(city) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");

    url.search = new URLSearchParams({
        name: city,
        count: "1",
        language: "en",
        format: "json"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to search for this location. Please try again.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("Location not found. Check the spelling and try again.");
    }

    return data.results[0];
}

async function fetchAirQuality(location) {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");

    url.search = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: [
            "us_aqi",
            "european_aqi",
            "pm2_5",
            "pm10",
            "nitrogen_dioxide",
            "ozone",
            "carbon_monoxide",
            "sulphur_dioxide"
        ].join(","),
        timezone: "auto"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not retrieve air-quality data. Please try again later.");
    }

    const data = await response.json();

    if (!data.current) {
        throw new Error("Air-quality data is not available for this location right now.");
    }

    return data;
}

function getAQICategory(aqi) {
    if (aqi === null || aqi === undefined || !Number.isFinite(Number(aqi))) {
        return {
            label: "Unavailable",
            className: "",
            title: "AQI unavailable",
            description: "The current AQI value could not be retrieved.",
            advice: "Try refreshing the data later.",
            tip: "Check local air-quality alerts before outdoor activities.",
            icon: "ℹ️"
        };
    }

    if (aqi <= 50) {
        return {
            label: "Good",
            className: "good",
            title: "Air quality is good",
            description: "Air pollution poses little or no risk for most people.",
            advice: "Most people can enjoy their usual outdoor activities.",
            tip: "Continue following local air-quality updates.",
            icon: "🌿"
        };
    }

    if (aqi <= 100) {
        return {
            label: "Moderate",
            className: "moderate",
            title: "Air quality is moderate",
            description: "Air quality is generally acceptable, though some pollutants may affect unusually sensitive people.",
            advice: "Sensitive individuals may wish to monitor symptoms during prolonged outdoor activity.",
            tip: "Consider taking breaks if outdoor air bothers you.",
            icon: "🌤️"
        };
    }

    if (aqi <= 150) {
        return {
            label: "Unhealthy for sensitive groups",
            className: "sensitive",
            title: "Sensitive groups should take care",
            description: "People who are unusually sensitive to air pollution may experience health effects.",
            advice: "Children, older adults, and people with heart or lung conditions should consider reducing strenuous outdoor activity.",
            tip: "Consider less strenuous activities or spending more time indoors.",
            icon: "😷"
        };
    }

    if (aqi <= 200) {
        return {
            label: "Unhealthy",
            className: "unhealthy",
            title: "Air quality is unhealthy",
            description: "Some members of the public may experience health effects, with greater risk for sensitive groups.",
            advice: "Reduce strenuous outdoor activity. Sensitive individuals should avoid strenuous outdoor activity.",
            tip: "Follow local public-health guidance and limit prolonged exposure.",
            icon: "⚠️"
        };
    }

    if (aqi <= 300) {
        return {
            label: "Very unhealthy",
            className: "very-unhealthy",
            title: "Air quality is very unhealthy",
            description: "The risk of health effects is increased for everyone.",
            advice: "Avoid strenuous outdoor activities and reduce outdoor exposure.",
            tip: "Follow local air-quality alerts and consider staying indoors.",
            icon: "🚨"
        };
    }

    return {
        label: "Hazardous",
        className: "hazardous",
        title: "Air quality is hazardous",
        description: "Health warnings may apply to the entire population.",
        advice: "Avoid outdoor exertion and follow official local health advice.",
        tip: "Keep track of official air-quality and public-health alerts.",
        icon: "⛔"
    };
}

function displayAQI(current) {
    const aqi = current.us_aqi;
    const category = getAQICategory(aqi);

    document.getElementById("aqiValue").textContent =
        aqi === null || aqi === undefined ? "--" : formatNumber(aqi, 0);

    document.getElementById("aqiBadge").textContent = category.label;
    document.getElementById("aqiBadge").className =
        "aqi-badge " + category.className;

    document.getElementById("aqiTitle").textContent = category.title;
    document.getElementById("aqiDescription").textContent = category.description;

    document.getElementById("healthIcon").textContent = category.icon;
    document.getElementById("healthTitle").textContent = category.label;
    document.getElementById("healthAdvice").textContent = category.advice;
    document.getElementById("healthTip").textContent = category.tip;

    const gauge = document.getElementById("aqiGauge");
    const numericAQI = Number(aqi);

    if (aqi !== null && aqi !== undefined && Number.isFinite(numericAQI)) {
        const progress = Math.min(Math.max(numericAQI, 0), 300) / 300;

        gauge.style.background = `conic-gradient(
            from 225deg,
            #24c887 0%,
            #c5df53 20%,
            #ffc44e 40%,
            #ff8548 60%,
            #f04455 ${progress * 80}%,
            var(--border) ${progress * 80}% 100%
        )`;
    } else {
        gauge.style.background = "var(--border)";
    }
}

function displayPollutants(current) {
    pollutants.forEach((pollutant) => {
        const rawValue = current[pollutant.key];
        const valueElement = document.getElementById(pollutant.valueId);
        const barElement = document.getElementById(pollutant.barId);

        if (rawValue === null || rawValue === undefined || !Number.isFinite(Number(rawValue))) {
            valueElement.textContent = "N/A";
            barElement.style.width = "0%";
            return;
        }

        let displayValue = Number(rawValue);

        // Carbon monoxide is converted from µg/m³ to mg/m³.
        if (pollutant.key === "carbon_monoxide") {
            displayValue = displayValue / 1000;
            valueElement.textContent = formatNumber(displayValue, 2) + " mg/m³";
        } else {
            valueElement.textContent = formatNumber(displayValue, pollutant.decimals);
        }

        const originalValue = Number(rawValue);
        const percentage = Math.min((originalValue / pollutant.max) * 100, 100);

        barElement.style.width = Math.max(percentage, 0) + "%";
    });
}

function displayLocation(location, data) {
    const placeName = location.name || "Selected location";
    const region = location.admin1 ? ", " + location.admin1 : "";
    const country = location.country ? ", " + location.country : "";

    document.getElementById("locationName").textContent =
        placeName + country;

    document.getElementById("locationDetails").textContent =
        `${region ? location.admin1 : ""}${region && country ? " · " : ""}` +
        `Coordinates: ${Number(location.latitude).toFixed(2)}, ${Number(location.longitude).toFixed(2)}`;

    const current = data.current;

    displayAQI(current);
    displayPollutants(current);

    const time = current.time
        ? new Date(current.time).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        })
        : "Time unavailable";

    document.getElementById("updatedAt").textContent =
        "Data time: " + time + " (local to selected location)";

    document.getElementById("dashboard").hidden = false;
}

async function loadCity(city) {
    const cleanedCity = city.trim();

    if (!cleanedCity) {
        showMessage("Please enter a city or place name.", "error");
        return;
    }

    setLoading(true);
    showMessage("Finding location and loading the latest air-quality data...");

    try {
        const location = await findCity(cleanedCity);
        const airQuality = await fetchAirQuality(location);

        selectedLocation = location;
        displayLocation(location, airQuality);

        showMessage(
            "Air-quality data loaded successfully for " +
            location.name + ".",
            "success"
        );
    } catch (error) {
        showMessage(
            error.message || "Something went wrong. Please try again.",
            "error"
        );
    } finally {
        setLoading(false);
    }
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadCity(cityInput.value);
});

refreshBtn.addEventListener("click", () => {
    if (selectedLocation) {
        refreshSelectedLocation();
    } else {
        loadCity(cityInput.value);
    }
});

async function refreshSelectedLocation() {
    setLoading(true);
    showMessage("Refreshing the latest air-quality data...");

    try {
        const airQuality = await fetchAirQuality(selectedLocation);
        displayLocation(selectedLocation, airQuality);

        showMessage(
            "Air-quality data refreshed successfully.",
            "success"
        );
    } catch (error) {
        showMessage(
            error.message || "Unable to refresh data. Please try again.",
            "error"
        );
    } finally {
        setLoading(false);
    }
}

function setTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    themeBtn.textContent = isDark ? "☀" : "☾";
    themeBtn.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );
    themeBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    localStorage.setItem("aeroaqi-theme", isDark ? "dark" : "light");
}

themeBtn.addEventListener("click", () => {
    setTheme(!document.body.classList.contains("dark"));
});

const savedTheme = localStorage.getItem("aeroaqi-theme");
setTheme(savedTheme === "dark");

// Load the default city when the page opens.
loadCity("Kolkata");
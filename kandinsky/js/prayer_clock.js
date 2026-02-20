var COLOR_FAJR='#6da6ba'; 
var COLOR_SUNRISE='#b8c6c9'; 
var COLOR_DHUHR='#51b781'; 
var COLOR_ASR='#e2b937'; 
var COLOR_MAGHRIB='#9f3d1b'; 
var COLOR_ISHA='#0c2126'; 

function nowSecSinceMidnight(){
    var d=new Date();
    return d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds();
}

function getWeather() {
    // Philadelphia coordinates (Open-Meteo requires lat/lon unlike Aladhan)
    const lat = 39.9526;
    const lon = -75.1652;
    
    // params: temperature_2m, weather_code, current_weather=true, temperature_unit=fahrenheit
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;

    // Helper to convert WMO numeric codes to text (Sunny, Cloudy, etc.)
    const decodeWeather = (code) => {
        if (code === 0) return "sun"; // Clear sky
        if (code >= 1 && code <= 3) return "partial_sun"; // Mainy clear, partly cloudy, overcast
        if (code >= 45 && code <= 48) return "cloud";
        if (code >= 51 && code <= 67) return "rain"; // Drizzle or Rain
        if (code >= 71 && code <= 77) return "snow";
        if (code >= 80 && code <= 82) return "rain"; // Showers
        if (code >= 85 && code <= 86) return "snow"; // Snow showers
        if (code >= 95 && code <= 99) return "thunder"; // Thunderstorm
        return "cloud"; // Default fallback
    };

    return fetch(url)
    .then(res => {
        if (!res.ok) throw new Error("Open-Meteo request failed");
        return res.json();
    })
    .then(json => {
        const current = json.current || {};
        
        return {
            temperature: current.temperature_2m, // Returns temp in F
            condition: decodeWeather(current.weather_code), // Returns string (e.g., "Sunny")
            //unit: json.current_units.temperature_2m // Returns "°F"
        };
    });
}


async function updateWeather() {
    try {
        const weather = await getWeather();
        // round temp to integer for display
        const temp = Math.round(weather.temperature);
        document.querySelector('#temp_value tspan').textContent = temp;

        // Update weather icon based on condition
        const icon_src = `img/${weather.condition}.png`; // e.g., img/sun.png, img/rain.png
        const icon_img = document.getElementById('weather_icon');
        if (icon_img) {
            icon_img.setAttribute('src', icon_src);
        }
    } catch (error) {
        console.error("Failed to update weather:", error);
    }
}


async function updateTimeRects() {
    const times = TIMES || await getPrayerTimes();  // waits only if not cached

    // 1. Get Fixed Anchor Points (Start and End of the timeline)
    const fajrLine = document.getElementById('fajr_line');
    const endLine = document.getElementById('end_line');

    // Parse float to ensure math operations work
    const startX = parseFloat(fajrLine.getAttribute('x1')); 
    const endX = parseFloat(endLine.getAttribute('x1'));
    const totalWidth = endX - startX;

    // 2. Define Time Segments (in seconds)
    // We assume the total width represents a full 24-hour cycle (86400 seconds)
    const SECONDS_IN_DAY = 24 * 3600;
    const pxPerSec = totalWidth / SECONDS_IN_DAY;

    // Calculate durations based on times
    const durations = {
        fajr:    times.sunrise - times.fajr,
        sunrise: times.dhuhr - times.sunrise,
        dhuhr:   times.asr - times.dhuhr,
        asr:     times.maghrib - times.asr,
        maghrib: times.isha - times.maghrib,
        // Isha takes the remaining space (representing time until next Fajr)
        isha:    SECONDS_IN_DAY - (times.isha - times.fajr) 
    };

    // 3. Helper to move vertical lines
    const moveLine = (id, xPos) => {
        const line = document.getElementById(id);
        if (line) {
            line.setAttribute('x1', xPos);
            line.setAttribute('x2', xPos);
        }
    };

    // 4. Daisy-chain the updates
    let currentX = startX;

    // List of segments in order
    const segments = [
        { rectId: 'fajr_rect',    lineId: null,            duration: durations.fajr },
        { rectId: 'sunrise_rect', lineId: 'sunrise_line',  duration: durations.sunrise },
        { rectId: 'dhuhr_rect',   lineId: 'dhuhr_line',    duration: durations.dhuhr },
        { rectId: 'asr_rect',     lineId: 'asr_line',      duration: durations.asr },
        { rectId: 'maghrib_rect', lineId: 'maghrib_line',  duration: durations.maghrib },
        { rectId: 'isha_rect',    lineId: 'isha_line',     duration: durations.isha }
    ];

    segments.forEach(seg => {
        // A. Move the divider line for this segment (if it exists) to the current start position
        if (seg.lineId) {
            moveLine(seg.lineId, currentX);
        }

        // B. Update the rectangle
        const rect = document.getElementById(seg.rectId);
        const newWidth = seg.duration * pxPerSec;

        if (rect) {
            rect.setAttribute('x', currentX);
            rect.setAttribute('width', newWidth);
        }

        // C. Advance X for the next segment
        currentX += newWidth;
    });
}


async function updateTime() {
    const times = TIMES || await getPrayerTimes();  // waits only if not cached

    const now = new Date();
    const currentSec = nowSecSinceMidnight();
    
    // 1. Update Text Elements
    // -----------------------
    // Hours
    const hour = now.getHours();
    document.querySelector('#current_hour tspan').textContent = hour;
    if (hour < 10) {
        document.getElementById('current_hour').setAttribute('transform', `translate(407 373)`);
    }
    if (hour > 19) {
        document.getElementById('current_hour').setAttribute('transform', `translate(351 373)`);
    }
    else {
        document.getElementById('current_hour').setAttribute('transform', `translate(378 373)`);
    }
    
    // Minutes (padded)
    const min = now.getMinutes();
    document.querySelector('#current_minute tspan').textContent = min < 10 ? '0' + min : min;

    // Remaining Time
    const remSec = await nextPrayerRemaining();
    const remH = Math.floor(remSec / 3600);
    const remM = Math.floor((remSec % 3600) / 60);
    // Format "h.m" (e.g. 1.59)
    if (remH < 1) {
        document.querySelector('#next_time tspan').textContent = `${remM < 10 ? '0' + remM : remM}`;
    }
    else if (remH > 9) {
        const newTransX = 621 - 17; // Shift left for 2-digit hour
        document.getElementById('next_time').setAttribute('transform', `translate(${newTransX} 485.02)`);
        document.querySelector('#next_time tspan').textContent = `${remH}.${remM < 10 ? '0' + remM : remM}`;
    }
    else {
        const newTransX = 621 - 10; // Shift left for 1-digit hour
        document.getElementById('next_time').setAttribute('transform', `translate(${newTransX} 485.02)`);
        document.querySelector('#next_time tspan').textContent = `${remH}.${remM < 10 ? '0' + remM : remM}`;
    }
    


    // 2. Determine Current Phase & Update Classes
    // -----------------------
    // Ordered timeline keys
    const phases = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    
    // Find current index
    let currentPhase = 'isha'; // Default if before Fajr (late night) or after Isha
    let nextPhase = 'fajr';

    // Check intervals
    if (currentSec >= times.fajr && currentSec < times.sunrise) currentPhase = 'fajr';
    else if (currentSec >= times.sunrise && currentSec < times.dhuhr) currentPhase = 'sunrise';
    else if (currentSec >= times.dhuhr && currentSec < times.asr) currentPhase = 'dhuhr';
    else if (currentSec >= times.asr && currentSec < times.maghrib) currentPhase = 'asr';
    else if (currentSec >= times.maghrib && currentSec < times.isha) currentPhase = 'maghrib';

    // Determine next phase
    const idx = phases.indexOf(currentPhase);
    nextPhase = phases[(idx + 1) % phases.length];

    // Change style of circles and strokes
    const currentColor = {
        fajr: COLOR_FAJR,
        sunrise: COLOR_SUNRISE,
        dhuhr: COLOR_DHUHR,
        asr: COLOR_ASR,
        maghrib: COLOR_MAGHRIB,
        isha: COLOR_ISHA
    }[currentPhase];
    const nextColor = {
        fajr: COLOR_FAJR,
        sunrise: COLOR_SUNRISE,
        dhuhr: COLOR_DHUHR,
        asr: COLOR_ASR,
        maghrib: COLOR_MAGHRIB,
        isha: COLOR_ISHA
    }[nextPhase];
    document.getElementById('current_circle').setAttribute('class', `${currentPhase} time_circle`);
    document.getElementById('next_circle').setAttribute('class', `${nextPhase} time_circle`);
    document.getElementById('current_stroke').style.stroke = currentColor;
    document.getElementById('next_stroke').style.stroke = nextColor;

    // 3. Move the Time Group
    // -----------------------
    const fajrLineX = parseFloat(document.getElementById('fajr_line').getAttribute('x1'));
    const endLineX = parseFloat(document.getElementById('end_line').getAttribute('x1'));
    const whiteLineOriginalX = 254.78; // Hardcoded from your SVG data for #white_line

    // Calculate position on timeline
    // Timeline represents exactly 24 hours from Fajr to next Fajr
    const totalWidth = endLineX - fajrLineX;
    const secondsInDay = 24 * 3600;
    
    // Normalize time relative to Fajr start
    let secFromFajr = currentSec - TIMES.fajr;
    if (secFromFajr < 0) secFromFajr += secondsInDay; // Handle post-midnight/pre-fajr

    const pxPerSec = totalWidth / secondsInDay;
    const targetX = fajrLineX + (secFromFajr * pxPerSec);

    // Calculate shift needed for the group
    const translateX = targetX - whiteLineOriginalX;

    // Move the entire group
    document.getElementById('current_location').setAttribute('transform', `translate(${translateX}, 0)`);
}
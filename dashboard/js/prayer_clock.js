// Convert absolute seconds to degrees in current 12h block
function relDeg12h(secAbs){
    var blockStart = Math.floor(secAbs / 43200) * 43200; // 0..43199→0, 43200..86399→43200
    return ((secAbs - blockStart) / 43200) * 360;        // 0–360 within current 12h window
}

function nowSecSinceMidnight(){
    var d=new Date();
    return d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds();
}

function fmtHM(sec){
    var h = Math.floor(sec/3600);
    var m = Math.floor((sec%3600)/60);
    var hs = String(h);
    var ms = String(m).padStart(2,'0');
    return hs + ':' + ms;
}

function fmtNow24h(sec){
    var h = Math.floor(sec/3600);
    var m = Math.floor((sec%3600)/60);
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
}

// 12-hour dial coloring: 0°=12 o’clock, 90°=3, 180°=6, 270°=9
function buildClockGradient(times){
    var DAY_SEC = 24 * 60 * 60;
    var c1='#6FB1FF'; // Fajr
    var c2='#E6E6E6'; // Sunrise
    var c3='#8bd17c'; // Dhuhr
    var c4='#ffd166'; // Asr
    var c5='#F84E3D'; // Maghrib
    var c6='#4E4242'; // Isha

    var now = nowSecSinceMidnight();
    var blockStart = Math.floor(now / 43200) * 43200; // 0..43199 → 0, 43200..86399 → 43200
    var blockEnd   = blockStart + 43200;

    function toDeg(secAbs){
        return ((secAbs - blockStart) / 43200) * 360; // assumes secAbs clipped inside block
    }
    function addSlice(a, b, color, out){
        var s = Math.max(a, blockStart);
        var e = Math.min(b, blockEnd);
        if (e <= s) return;
        out.push(color + ' ' + toDeg(s) + 'deg ' + toDeg(e) + 'deg');
    }

    var stops = [];
    addSlice(0,             times.fajr,            c6, stops);
    addSlice(times.fajr,    times.sunrise,         c1, stops);
    addSlice(times.sunrise, times.dhuhr,           c2, stops);
    addSlice(times.dhuhr,   times.asr,             c3, stops);
    addSlice(times.asr,     times.maghrib,         c4, stops);
    addSlice(times.maghrib, times.isha,            c5, stops);
    addSlice(times.isha,    times.fajr + DAY_SEC,  c6, stops);

    return 'conic-gradient(' + stops.join(', ') + ')';
}

// Hand shows current time within the current 12h block (0° at 12 o’clock)
function updateHand(){
    var inner = document.getElementById('inner');
    var hand  = document.getElementById('hand');
    var radius = Math.floor(Math.min(inner.offsetWidth, inner.offsetHeight)/2) + 7;
    hand.style.height = radius + 'px';

    var nowSec = nowSecSinceMidnight();
    var angle  = relDeg12h(nowSec);

    hand.dataset.angle = String(angle);
    hand.style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';
}

function updateTexts(times){
    // list times
    var timeList = document.getElementById('list');
    document.getElementById('l-fajr').textContent = fmtNow24h(times.fajr);
    document.getElementById('l-dhuhr').textContent = fmtNow24h(times.dhuhr);
    document.getElementById('l-asr').textContent = fmtNow24h(times.asr);
    document.getElementById('l-maghrib').textContent = fmtNow24h(times.maghrib);
    document.getElementById('l-isha').textContent = fmtNow24h(times.isha);
    
    // now and remaining
    var nowSec = nowSecSinceMidnight();
    var angle = relDeg12h(nowSec);
    var nowEl = document.getElementById('nowTime');
    var remEl = document.getElementById('remTime');
    var wrap = document.getElementById('timewrap');

    nowEl.textContent = fmtNow24h(nowSec);
    var rem = nextPrayerRemaining(times, nowSec);
    remEl.textContent = fmtHM(rem);
    // if less than 30 minutes remaining, highlight
    if ((rem <= 30*60) && (nowSec >= times.dhuhr) && (nowSec <= times.isha)) {
        remEl.style.color = '#FFFFFF';
        remEl.style.backgroundColor = '#CD2929';
        remEl.style.borderRadius = '5px';
        remEl.style.padding = '2px 5px';
    } else {
        remEl.style.color = '#1B1B1B';
        remEl.style.backgroundColor = '#F0F0F0';
        remEl.style.borderRadius = '5px';
        remEl.style.padding = '2px 5px';
    }

    // Position: if in upper half (angle < 90 || angle > 180), place texts in lower half
    if (angle < 90 || angle > 270) {
        wrap.style.top = '60%';
        timeList.style.top = '22%';
    } else {
        wrap.style.top = '17%';
        timeList.style.top = '52%';
    }
}

var handTimer = null;
async function renderPrayerClock() {
    const times = _TIMES || await getPrayerTimes();  // waits only if not cached
    var pie = document.getElementById('pie');
    pie.style.background = buildClockGradient(times);
    updateHand();
    updateTexts(times);
    if (handTimer) { clearInterval(handTimer); }
    handTimer = setInterval(function(){
        pie.style.background = buildClockGradient(times); // update the gradient too since it will change after 12pm
        updateHand();
        updateTexts(times);
    }, 60*1000);
}
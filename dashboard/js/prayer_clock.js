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
    var c1='#588ecf'; // Fajr #6FB1FF
    var c2='#E6E6E6'; // Sunrise
    var c3='#8cbc82'; // Dhuhr #8bd17c
    var c4='#dfbb67'; // Asr #ffd166
    var c5='#d14e42'; // Maghrib #F84E3D
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
function updateHands(){
    var inner = document.getElementById('inner');
    var hHand = document.getElementById('hand-hour');
    var mHand = document.getElementById('hand-minute');
    var sHand = document.getElementById('hand-second');

    if (!inner || !hHand || !mHand || !sHand) return;

    var radius = Math.floor(Math.min(inner.offsetWidth, inner.offsetHeight)/2) + 7;

    // lengths (tweak multipliers if you want different proportions)
    hHand.style.height = Math.floor(radius * 0.69) + 'px';
    mHand.style.height = Math.floor(radius * 0.97) + 'px';
    sHand.style.height = Math.floor(radius * 0.97) + 'px';

    var nowSec = nowSecSinceMidnight();      // absolute seconds since 00:00
    // Hour hand: position inside current 12h block (use existing helper)
    var hourAngle = relDeg12h(nowSec);

    // Minute hand: full turn per hour
    var secInHour = nowSec % 3600;
    var minuteAngle = (secInHour / 3600) * 360;

    // Second hand: full turn per minute
    var secInMinute = nowSec % 60;
    var secondAngle = (secInMinute / 60) * 360;

    hHand.style.transform = 'translateX(-50%) rotate(' + hourAngle + 'deg)';
    mHand.style.transform = 'translateX(-50%) rotate(' + minuteAngle + 'deg)';
    sHand.style.transform = 'translateX(-50%) rotate(' + secondAngle + 'deg)';
}

var handTimer = null;
async function renderPrayerClock() {
    // render clock design
    var container = document.getElementById('prayer-clock-container');
    
    var dial = document.createElement('div');
    dial.classList.add('dial');
    
    var pie = document.createElement('div');
    pie.id = 'pie';
    pie.classList.add('pie');

    var handHour = document.createElement('div');
    handHour.id = 'hand-hour';
    handHour.classList.add('hand', 'hand-hour');
    var handMinute = document.createElement('div');
    handMinute.id = 'hand-minute';
    handMinute.classList.add('hand', 'hand-minute');
    var handSecond = document.createElement('div');
    handSecond.id = 'hand-second';
    handSecond.classList.add('hand', 'hand-second');

    var cap = document.createElement('div');
    cap.id = 'cap';
    cap.classList.add('cap');
    
    var inner = document.createElement('div');
    inner.id = 'inner';
    inner.classList.add('inner');
    
    dial.appendChild(pie);
    dial.appendChild(handHour);
    dial.appendChild(handMinute);
    dial.appendChild(handSecond);
    dial.appendChild(cap);
    dial.appendChild(inner);
    container.appendChild(dial);

    // set sizes (dial and pie are square with width = 40% of viewport width, inner is 40px less)
    dial.style.width = dial.style.height = Math.max(window.innerWidth * 0.5, 340) + 'px';
    pie.style.width = pie.style.height = dial.offsetWidth + 'px';
    inner.style.width = inner.style.height = (dial.offsetWidth - 90) + 'px';

    // get prayer times and start updates
    // @TODO: inside textTimer, check when the times cached last time. if it's a new day, fetch new times.
    const times = _TIMES || await getPrayerTimes();  // waits only if not cached
    var pie = document.getElementById('pie');
    pie.style.background = buildClockGradient(times);
    updateHands();
    
    if (handTimer) { clearInterval(handTimer); }
    handTimer = setInterval(function(){
        updateHands();
    }, 1000);
}
function updateTexts(times){
    // list times
    document.getElementById('l-fajr').textContent = fmtNow24h(times.fajr);
    document.getElementById('l-sun').textContent = fmtNow24h(times.sunrise);
    document.getElementById('l-dhuhr').textContent = fmtNow24h(times.dhuhr);
    document.getElementById('l-asr').textContent = fmtNow24h(times.asr);
    document.getElementById('l-maghrib').textContent = fmtNow24h(times.maghrib);
    document.getElementById('l-isha').textContent = fmtNow24h(times.isha);
    
    // now and remaining
    var nowSec = nowSecSinceMidnight();
    var remaining = document.getElementById('rem-time');

    //nowEl.textContent = fmtNow24h(nowSec);
    var rem = nextPrayerRemaining(times, nowSec);
    remaining.textContent = fmtHM(rem);
    // if less than 30 minutes remaining, highlight
    if ((rem <= 30*60) && (nowSec >= times.dhuhr) && (nowSec <= times.isha)) {
        remaining.style.backgroundColor = '#fcb9b4';
    } else {
        remaining.style.backgroundColor = '#f7f3ec'; //#fcb9b4 #f7f5f3
    }
}

var textTimer = null;
async function renderPrayerList() {
    // render clock design
    var container = document.getElementById('prayer-list-container');
    
    var list = document.createElement('div');
    list.id = 'prayer-list';
    list.classList.add('prayer-list');
    list.innerHTML = `
        <div><span class="l-fajr">F</span> <span id="l-fajr" class="l-fajr">0:00</span></div>
        <div><span class="l-sun">S</span> <span id="l-sun" class="l-sun">0:00</span></div>
        <div><span class="l-dhuhr">D</span> <span id="l-dhuhr" class="l-dhuhr">0:00</span></div>
        <div><span class="l-asr">A</span> <span id="l-asr" class="l-asr">0:00</span></div>
        <div><span class="l-maghrib">M</span> <span id="l-maghrib" class="l-maghrib">0:00</span></div>
        <div><span class="l-isha">I</span> <span id="l-isha" class="l-isha">0:00</span></div><br />
        <div><span class="rem-time-label">Next in </span><span id="rem-time" class="rem-time"></span></div>
    `;
    container.appendChild(list);

    // get prayer times and start updates
    // @TODO: inside textTimer, check when the times cached last time. if it's a new day, fetch new times.
    const times = _TIMES || await getPrayerTimes();  // waits only if not cached
    updateTexts(times);

    if (textTimer) { clearInterval(textTimer); }
    textTimer = setInterval(function(){
        // read current times again in case of day change (it is updated in prayer_clock.js)
        const times = _TIMES;
        updateTexts(times);
    }, 60*1000);
}
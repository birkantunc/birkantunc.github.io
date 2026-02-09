var TIMES = null;
var LAST_FETCH_DAY = null;
var SECONDS_IN_DAY = 24 * 60 * 60;

// times in seconds since 00:00
function getPrayerTimes() {
    const city = "Philadelphia";
    const country = "US";
    const method = 2;   // ISNA
    const school = 0;   // Standard (Shafi/Maliki/Hanbali). Use 1 for Hanafi.
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${country}&method=${method}&school=${school}`;

    const toSec = (hhmm) => {
        const [hh, mm] = hhmm.split(":").map(Number);
        return (hh * 3600) + (mm * 60);
    };

    return fetch(url)
    .then(res => {
        if (!res.ok) throw new Error("Aladhan request failed");
        return res.json();
    })
    .then(json => {
        const t = json && json.data && json.data.timings ? json.data.timings : {};
        TIMES = {
            fajr:    toSec(t.Fajr),
            sunrise: toSec(t.Sunrise),
            dhuhr:   toSec(t.Dhuhr),
            asr:     toSec(t.Asr),
            maghrib: toSec(t.Maghrib),
            isha:    toSec(t.Isha)
        };
        LAST_FETCH_DAY = new Date().setHours(0, 0, 0, 0);
        return TIMES;
    });
}


function nowSecSinceMidnight(){
    var d=new Date();
    return d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds();
}


async function nextPrayerRemaining(){
    const times = TIMES || await getPrayerTimes();  // waits only if not cached

    var nowSec = nowSecSinceMidnight();
    var seq = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha, times.fajr + SECONDS_IN_DAY];
    for (var i=0;i<seq.length;i++){
        if (seq[i] > nowSec) {
            return seq[i] - nowSec;
        }
    }
    return (times.fajr + SECONDS_IN_DAY) - nowSec;
}
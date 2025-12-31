var _TIMES = null;
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
        _TIMES = {
            fajr:    toSec(t.Fajr),
            sunrise: toSec(t.Sunrise),
            dhuhr:   toSec(t.Dhuhr),
            asr:     toSec(t.Asr),
            maghrib: toSec(t.Maghrib),
            isha:    toSec(t.Isha)
        };
        return _TIMES;
    });
}

function nextPrayerRemaining(times, nowSec){
    var DAY_SEC = 24 * 60 * 60;
    var seq = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha, times.fajr + DAY_SEC];
    for (var i=0;i<seq.length;i++){
        if (seq[i] > nowSec) {
            return seq[i] - nowSec;
        }
    }
    return (times.fajr + DAY_SEC) - nowSec;
}
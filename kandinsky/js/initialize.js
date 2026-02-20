const SVG_PATH = 'img/abstract_v3.svg';
const CONTAINER_ID = 'svg-container';

var timer0 = null;
var timer1 = null;

// load SVG Inline
fetch(SVG_PATH)
    .then(response => response.text())
    .then(svgContent => {
        const container = document.getElementById(CONTAINER_ID);
        container.innerHTML = svgContent;
        
        // after SVG is loaded, get prayer times and render clock
        getPrayerTimes()
        .then(times => {
            // render time rects
            updateTimeRects();
            updateTime();
            updateWeather();

            // every minute, update time and check if we need to fetch new prayer times (new day)
            if (timer0) { clearInterval(timer0); }
            timer0 = setInterval(async function(){
                // check if we need to fetch new prayer times (new day)
                var today = new Date().setHours(0, 0, 0, 0);
                if (today !== LAST_FETCH_DAY) {
                    await getPrayerTimes();
                    updateTimeRects();
                }
                updateTime();
            }, 60*1000);

            // every hour, update weather
            if (timer1) { clearInterval(timer1); }
            timer1 = setInterval(async function(){
                updateWeather();
            }, 60*60*1000);
        })
        .catch(console.error);
    })
    .catch(console.error);
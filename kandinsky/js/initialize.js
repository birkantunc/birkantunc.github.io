const SVG_PATH = 'img/abstract_v3_1024_600.svg';
const CONTAINER_ID = 'svg-container';

// load SVG Inline
fetch(SVG_PATH)
    .then(response => response.text())
    .then(svgContent => {
        const container = document.getElementById(CONTAINER_ID);
        container.innerHTML = svgContent;
        
        // Initialize your logic here (once SVG is ready)
        // initDynamicUpdates(); 
    })
    .catch(console.error);
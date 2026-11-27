/**
 * Ayse Tunc — Illumination & Miniature Art
 * Vanilla ES Module: Loads .txt and .json data, renders sections,
 * manages variable detail-image gallery & PhotoSwipe v5 deep zoom,
 * and handles static commission/workshop form submission.
 */

import PhotoSwipe from "https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js";

const DATA_PATHS = {
  artworks: "./data/artworks.json",
  materials: "./data/materials.json",
  workshops: "./data/workshops.json",
  teaching: "./data/teaching.json",
  training: "./data/training.json",
  exhibitions: "./data/exhibitions.json",
  symposiums: "./data/symposiums.json",
  biography: "./data/biography.txt",
  statement: "./data/statement.txt"
};

let allArtworks = [];
let activeArtwork = null;
let activeSlideIndex = 0;
let artworkModalInstance = null;

// Utility: Safe HTML escaping
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Utility: Fetch JSON or Text
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.text();
}

// Utility: Convert double-newline plain text to semantic paragraphs
function renderTextParagraphs(text, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);
  container.innerHTML = paragraphs
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join("");
}

// Utility: Measure image natural dimensions for PhotoSwipe v5
function getImageDimensions(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1600, h: img.naturalHeight || 1600 });
    img.onerror = () => resolve({ w: 1600, h: 1600 });
    img.src = src;
  });
}

// ---------------------------------------------------------
// Render Artworks Grid + Category Filter
// ---------------------------------------------------------
function renderArtworks(filter = "all") {
  const grid = document.getElementById("artworks-grid");
  if (!grid) return;

  const filtered =
    filter === "all"
      ? allArtworks
      : allArtworks.filter((w) => w.filterGroup === filter);

  if (!filtered.length) {
    grid.innerHTML = `<div class="col-12"><p class="text-muted">No artworks found in this category.</p></div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((work) => {
      const detailCount = Array.isArray(work.details) ? work.details.length : 0;
      const badgeHtml =
        detailCount > 0
          ? `<span class="artwork-badge">+ ${detailCount} detail${detailCount > 1 ? "s" : ""}</span>`
          : "";

      return `
        <div class="col-12 col-sm-6 col-lg-4">
          <article class="artwork-card"
                   role="button"
                   tabindex="0"
                   data-work-id="${escapeHtml(work.id)}"
                   aria-label="Inspect ${escapeHtml(work.title)} and detail views">
            <figure class="mb-0">
              <div class="artwork-frame">
                <img src="${escapeHtml(work.image)}"
                     alt="${escapeHtml(work.title)} — ${escapeHtml(work.category)} by Ayse Tunc"
                     loading="lazy"
                     decoding="async">
                ${badgeHtml}
              </div>
              <figcaption>
                <h3 class="artwork-title">${escapeHtml(work.number)}. ${escapeHtml(work.title)}</h3>
                <p class="artwork-meta">${escapeHtml(work.medium)}</p>
                <p class="artwork-meta text-uppercase" style="font-size:0.7rem; letter-spacing:0.1em; color:var(--gold);">
                  ${escapeHtml(work.technique)}${work.year ? " · " + escapeHtml(work.year) : ""}
                </p>
              </figcaption>
            </figure>
          </article>
        </div>
      `;
    })
    .join("");

  // Attach click & keyboard handlers
  grid.querySelectorAll(".artwork-card").forEach((card) => {
    const open = () => openArtworkModal(card.dataset.workId);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function setupFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      renderArtworks(btn.dataset.filter);
    });
  });
}

// ---------------------------------------------------------
// Artwork Modal + Variable Detail Strip + PhotoSwipe Zoom
// ---------------------------------------------------------
function buildSlidesForWork(work) {
  const slides = [
    {
      src: work.image,
      label: `${work.title} — Full View`,
      alt: `${work.title} full artwork by Ayse Tunc`
    }
  ];
  if (Array.isArray(work.details)) {
    work.details.forEach((detailPath, idx) => {
      slides.push({
        src: detailPath,
        label: `${work.title} — Detail ${String(idx + 1).padStart(2, "0")}`,
        alt: `${work.title} brushwork detail ${idx + 1} by Ayse Tunc`
      });
    });
  }
  return slides;
}

function updateModalStage(index) {
  if (!activeArtwork) return;
  const slides = buildSlidesForWork(activeArtwork);
  activeSlideIndex = Math.max(0, Math.min(index, slides.length - 1));
  const current = slides[activeSlideIndex];

  const stageImg = document.getElementById("modal-stage-img");
  const stageCaption = document.getElementById("modal-stage-caption");
  stageImg.src = current.src;
  stageImg.alt = current.alt;
  if (stageCaption) stageCaption.textContent = current.label;

  document.querySelectorAll("#modal-detail-strip .detail-thumb").forEach((btn, i) => {
    btn.classList.toggle("active", i === activeSlideIndex);
    btn.setAttribute("aria-current", i === activeSlideIndex ? "true" : "false");
  });
}

function openArtworkModal(workId) {
  const work = allArtworks.find((w) => w.id === workId);
  if (!work) return;
  activeArtwork = work;
  const slides = buildSlidesForWork(work);

  document.getElementById("modal-work-kicker").textContent = work.technique;
  document.getElementById("modal-work-title").textContent = `${work.number}. ${work.title}`;
  document.getElementById("modal-work-medium").textContent = work.medium;
  document.getElementById("modal-work-desc").textContent = work.description;

  const inquireBtn = document.getElementById("modal-inquire-btn");
  inquireBtn.onclick = () => {
    if (artworkModalInstance) artworkModalInstance.hide();
    prefillContact("commission", `Inquiry regarding "${work.title}"`);
  };

  // Render dynamic thumbnails (works for 0, 1, 3, 4, or any number of detail shots)
  const strip = document.getElementById("modal-detail-strip");
  if (slides.length > 1) {
    strip.innerHTML = slides
      .map(
        (s, idx) => `
          <button type="button"
                  class="detail-thumb ${idx === 0 ? "active" : ""}"
                  data-slide-idx="${idx}"
                  aria-label="View ${escapeHtml(s.label)}">
            <img src="${escapeHtml(s.src)}" alt="${escapeHtml(s.alt)}" loading="lazy">
          </button>
        `
      )
      .join("");
    strip.classList.remove("d-none");
    strip.querySelectorAll(".detail-thumb").forEach((btn) => {
      btn.addEventListener("click", () => updateModalStage(Number(btn.dataset.slideIdx)));
    });
  } else {
    strip.innerHTML = "";
    strip.classList.add("d-none");
  }

  updateModalStage(0);

  const modalEl = document.getElementById("artworkModal");
  artworkModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
  artworkModalInstance.show();
}

async function openPhotoSwipeZoom(startIndex = 0) {
  if (!activeArtwork) return;
  const slides = buildSlidesForWork(activeArtwork);
  const measured = await Promise.all(
    slides.map(async (s) => {
      const dims = await getImageDimensions(s.src);
      return {
        src: s.src,
        width: dims.w,
        height: dims.h,
        alt: s.alt
      };
    })
  );

  const pswp = new PhotoSwipe({
    dataSource: measured,
    index: startIndex,
    bgOpacity: 0.94,
    showHideAnimationType: "fade",
    maxZoomLevel: 4,
    initialZoomLevel: "fit",
    secondaryZoomLevel: 2.2
  });
  pswp.init();
}

// ---------------------------------------------------------
// Render Materials, Workshops, Teaching, Exhibitions, About
// ---------------------------------------------------------
function renderMaterials(items) {
  const container = document.getElementById("materials-grid");
  if (!container) return;
  container.innerHTML = items
    .map(
      (item) => `
        <div class="col-12 col-md-6 col-lg-4">
          <article class="material-card">
            <div class="material-num">${escapeHtml(item.number)}</div>
            <h3 class="material-name">${escapeHtml(item.name)}</h3>
            <p class="material-desc">${escapeHtml(item.description)}</p>
          </article>
        </div>
      `
    )
    .join("");
}

function renderWorkshops(items) {
  const list = document.getElementById("workshops-list");
  if (!list) return;
  list.innerHTML = items
    .map(
      (w) => `
        <li class="archive-item">
          <time class="archive-date">${escapeHtml(w.date)}</time>
          <div>
            <div class="archive-title">${escapeHtml(w.name)}</div>
            <div class="text-muted small">${escapeHtml(w.place)}</div>
          </div>
          <div class="archive-place">${escapeHtml(w.location)}</div>
        </li>
      `
    )
    .join("");
}

function renderTeaching(items) {
  const list = document.getElementById("teaching-list");
  if (!list) return;
  list.innerHTML = items
    .map(
      (t) => `
        <li class="archive-item">
          <span class="archive-date">${escapeHtml(t.period)}</span>
          <div>
            <div class="archive-title">${escapeHtml(t.role)} — ${escapeHtml(t.institution)}</div>
            <div class="text-muted small mt-1">${escapeHtml(t.details)}</div>
          </div>
          <div class="archive-place">${escapeHtml(t.location)}</div>
        </li>
      `
    )
    .join("");
}

function renderTraining(items) {
  const list = document.getElementById("training-list");
  if (!list) return;
  list.innerHTML = items
    .map(
      (t) => `
        <li class="archive-item">
          <span class="archive-date">${escapeHtml(t.period)}</span>
          <div>
            <div class="archive-title">${escapeHtml(t.credential)}</div>
            <div class="text-muted small">${escapeHtml(t.institution)}</div>
          </div>
          <div class="archive-place">${escapeHtml(t.location)}</div>
        </li>
      `
    )
    .join("");
}

function renderSymposiums(items) {
  const list = document.getElementById("symposiums-list");
  if (!list) return;
  list.innerHTML = items
    .map(
      (s) => `
        <li class="archive-item">
          <span class="archive-date">${escapeHtml(s.year)}</span>
          <div>
            <div class="archive-title">${escapeHtml(s.paper)}</div>
            <div class="text-muted small">${escapeHtml(s.event)}</div>
          </div>
          <div class="archive-place">${escapeHtml(s.location)}</div>
        </li>
      `
    )
    .join("");
}

function renderExhibitions(items, showAll = false) {
  const list = document.getElementById("exhibitions-list");
  const toggleBtn = document.getElementById("toggle-exhibitions-btn");
  if (!list) return;

  const INITIAL_COUNT = 8;
  const visible = showAll ? items : items.slice(0, INITIAL_COUNT);

  list.innerHTML = visible
    .map((ex) => {
      const tagClass = ex.type.toLowerCase() === "solo" ? "archive-tag archive-tag--solo" : "archive-tag";
      return `
        <li class="archive-item">
          <time class="archive-date">${escapeHtml(ex.date)}</time>
          <div class="archive-title">
            ${escapeHtml(ex.title)}
            <span class="${tagClass}">${escapeHtml(ex.type)}</span>
          </div>
          <div class="archive-place">${escapeHtml(ex.place)}</div>
        </li>
      `;
    })
    .join("");

  if (toggleBtn) {
    if (items.length <= INITIAL_COUNT) {
      toggleBtn.classList.add("d-none");
    } else {
      toggleBtn.classList.remove("d-none");
      toggleBtn.textContent = showAll
        ? "Show Fewer Exhibitions"
        : `View All ${items.length} Exhibitions`;
      toggleBtn.onclick = () => renderExhibitions(items, !showAll);
    }
  }
}

// ---------------------------------------------------------
// Contact Form Prefill & AJAX Submission (Formspree-Ready)
// ---------------------------------------------------------
function prefillContact(inquiryType, subjectNote = "") {
  const typeEl = document.getElementById("inquiryType");
  const msgEl = document.getElementById("message");
  if (typeEl && inquiryType) typeEl.value = inquiryType;
  if (msgEl && subjectNote && !msgEl.value.trim()) {
    msgEl.value = `${subjectNote}\n\n`;
  }
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
}

function setupContactForm() {
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("form-status");
  if (!form || !statusEl) return;

  const workshopInviteBtn = document.getElementById("invite-workshop-btn");
  if (workshopInviteBtn) {
    workshopInviteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      prefillContact("workshop", "Workshop / Lecture Invitation:");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const endpoint = form.getAttribute("action") || "";
    const submitBtn = form.querySelector('button[type="submit"]');

    // Fallback if Formspree ID hasn't been configured yet
    if (!endpoint || endpoint.includes("YOUR_FORMSPREE_ID")) {
      const name = document.getElementById("name").value.trim();
      const type = document.getElementById("inquiryType").value;
      const message = document.getElementById("message").value.trim();
      const mailtoSubject = encodeURIComponent(`[Website ${type}] Inquiry from ${name}`);
      const mailtoBody = encodeURIComponent(message);
      window.location.href = `mailto:artbyaysetunc@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
      statusEl.innerHTML = `<div class="alert alert-light border mt-3 mb-0 small">Opening your email client to send your message to artbyaysetunc@gmail.com.</div>`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    statusEl.innerHTML = "";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });

      if (res.ok) {
        form.reset();
        form.classList.remove("was-validated");
        statusEl.innerHTML = `<div class="alert alert-light border mt-3 mb-0 small" style="border-color: var(--gold) !important;">Thank you for your inquiry. Ayse will respond shortly.</div>`;
      } else {
        throw new Error("Submission failed");
      }
    } catch {
      statusEl.innerHTML = `<div class="alert alert-light border mt-3 mb-0 small">Unable to submit right now. Please email <a href="mailto:artbyaysetunc@gmail.com">artbyaysetunc@gmail.com</a> directly.</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Inquiry";
    }
  });
}

// ---------------------------------------------------------
// Close Mobile Nav on Link Click & Initialize App
// ---------------------------------------------------------
function setupMobileNavAutoClose() {
  const navCollapse = document.getElementById("primaryNav");
  if (!navCollapse) return;
  navCollapse.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (navCollapse.classList.contains("show")) {
        bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
      }
    });
  });
}

async function init() {
  // Stage zoom handler
  const stageTrigger = document.getElementById("modal-stage-trigger");
  if (stageTrigger) {
    stageTrigger.addEventListener("click", () => openPhotoSwipeZoom(activeSlideIndex));
  }

  setupFilters();
  setupContactForm();
  setupMobileNavAutoClose();

  const yearEl = document.getElementById("copyright-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  try {
    const [
      artworks,
      materials,
      workshops,
      teaching,
      training,
      exhibitions,
      symposiums,
      bioText,
      statementText
    ] = await Promise.all([
      fetchJson(DATA_PATHS.artworks),
      fetchJson(DATA_PATHS.materials),
      fetchJson(DATA_PATHS.workshops),
      fetchJson(DATA_PATHS.teaching),
      fetchJson(DATA_PATHS.training),
      fetchJson(DATA_PATHS.exhibitions),
      fetchJson(DATA_PATHS.symposiums),
      fetchText(DATA_PATHS.biography),
      fetchText(DATA_PATHS.statement)
    ]);

    allArtworks = artworks;
    renderArtworks("all");
    renderMaterials(materials);
    renderWorkshops(workshops);
    renderTeaching(teaching);
    renderTraining(training);
    renderExhibitions(exhibitions, false);
    renderSymposiums(symposiums);
    renderTextParagraphs(bioText, "biography-content");
    renderTextParagraphs(statementText, "statement-content");
  } catch (err) {
    console.error("Error loading portfolio content:", err);
  }
}

document.addEventListener("DOMContentLoaded", init);

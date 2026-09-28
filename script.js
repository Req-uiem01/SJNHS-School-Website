const stateKey = "sjnhsWebsiteEditsV1";
const imageKey = "sjnhsWebsiteImagesV1";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();

  // Welcome popup: first visit only.
  const modal = $("#announcementModal");
  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    sessionStorage.setItem("sjnhsWelcomeShown", "1");
  };
  $$("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));
  if (!sessionStorage.getItem("sjnhsWelcomeShown")) {
    setTimeout(() => {
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
    }, 650);
  }

  // Mobile navigation.
  $("#navToggle").addEventListener("click", () => {
    $("#navMenu").classList.toggle("open");
  });
  $$("#navMenu a").forEach(a => a.addEventListener("click", () => $("#navMenu").classList.remove("open")));

  // Restore locally saved text/image changes.
  loadTextEdits();
  loadImages();

  // Edit mode.
  $("#editModeBtn").addEventListener("click", () => {
    document.body.classList.toggle("edit-mode");
    const active = document.body.classList.contains("edit-mode");
    $("#editPanel").setAttribute("aria-hidden", String(!active));
    $$(".editable").forEach(el => {
      el.contentEditable = active ? "true" : "false";
    });
  });

  $("#closeEdit").addEventListener("click", () => {
    document.body.classList.remove("edit-mode");
    $$(".editable").forEach(el => el.contentEditable = "false");
  });

  $$(".editable").forEach(el => {
    el.addEventListener("blur", () => {
      const key = el.dataset.key;
      if (!key) return;
      const edits = JSON.parse(localStorage.getItem(stateKey) || "{}");
      edits[key] = el.innerHTML;
      localStorage.setItem(stateKey, JSON.stringify(edits));
    });
  });

  // Image uploads. Each image slot has its own storage key.
  $$('input[type="file"][data-upload-for]').forEach(input => {
    input.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const slot = input.dataset.uploadFor;
        const images = JSON.parse(localStorage.getItem(imageKey) || "{}");
        images[slot] = reader.result;
        localStorage.setItem(imageKey, JSON.stringify(images));
        $$(`[data-image-slot="${slot}"]`).forEach(img => img.src = reader.result);
      };
      reader.readAsDataURL(file);
    });
  });

  // Search index.
  buildSearch();
  $("#siteSearch").addEventListener("input", runSearch);
  $("#clearSearch").addEventListener("click", () => {
    $("#siteSearch").value = "";
    runSearch();
    $("#siteSearch").focus();
  });

  $("#resetSite").addEventListener("click", () => {
    const ok = confirm("Reset locally saved text and images for this website?");
    if (!ok) return;
    localStorage.removeItem(stateKey);
    localStorage.removeItem(imageKey);
    location.reload();
  });
});

function loadTextEdits() {
  const edits = JSON.parse(localStorage.getItem(stateKey) || "{}");
  $$(".editable").forEach(el => {
    const key = el.dataset.key;
    if (key && edits[key]) el.innerHTML = edits[key];
  });
}

function loadImages() {
  const images = JSON.parse(localStorage.getItem(imageKey) || "{}");
  Object.entries(images).forEach(([slot, src]) => {
    $$(`[data-image-slot="${slot}"]`).forEach(img => img.src = src);
  });
}

function buildSearch() {
  const items = [];
  $$("main section[id]").forEach(section => {
    const heading = section.querySelector("h2, h1");
    const text = section.innerText.replace(/\s+/g, " ").trim();
    if (!heading || !text) return;
    items.push({
      title: heading.textContent.trim(),
      section: section.id,
      text,
      label: section.querySelector(".eyebrow")?.textContent.trim() || "SJNHS"
    });
  });
  window.sjnhsSearchIndex = items;
}

function runSearch() {
  const query = $("#siteSearch").value.trim().toLowerCase();
  const results = $("#searchResults");
  results.innerHTML = "";

  if (!query) return;

  const terms = query.split(/\s+/).filter(Boolean);
  const matches = (window.sjnhsSearchIndex || []).filter(item => {
    const haystack = `${item.title} ${item.label} ${item.text}`.toLowerCase();
    return terms.every(term => haystack.includes(term));
  }).slice(0, 8);

  if (!matches.length) {
    results.innerHTML = `<div class="no-results">No matching section found. Try another keyword.</div>`;
    return;
  }

  matches.forEach(item => {
    const a = document.createElement("a");
    a.className = "result-item";
    a.href = `#${item.section}`;
    a.innerHTML = `<b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.label)} • Open section →</small>`;
    results.appendChild(a);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

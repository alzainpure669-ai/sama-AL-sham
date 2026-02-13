const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  document.querySelectorAll('.mLink').forEach(a => a.addEventListener('click', () => setMenu(false)));

  function setMenu(open){
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileMenu.classList.toggle('show', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
  });
  document.addEventListener('click', (e) => {
    const isOpen = burger.getAttribute('aria-expanded') === 'true';
    if (!isOpen) return;
    const inside = mobileMenu.contains(e.target) || burger.contains(e.target);
    if (!inside) setMenu(false);
  });

  document.getElementById('scrollToContact').addEventListener('click', () => {
    document.getElementById('contact').scrollIntoView({behavior:'smooth'});
  });

  /* =========================
     Animated counters
     ========================= */
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counters = [...document.querySelectorAll('[data-count]')];

  function animateCount(el){
    const target = Number(el.dataset.count || 0);
    const duration = 900;
    const t0 = performance.now();
    function tick(now){
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (!prefersReduced){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  } else {
    counters.forEach(c => c.textContent = c.dataset.count);
  }

  /* =========================
     Data (localStorage)
     ========================= */
  const STORAGE_KEY = "aiu_sama_routes_v1";
  const $ = (id) => document.getElementById(id);

  function loadRoutes(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }
  function saveRoutes(routes){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  }

  // A route object:
  // { id, direction: "to"|"from", line, stop, time, notes }

  let routes = loadRoutes();

  /* =========================
     Tabs (To/From)
     ========================= */
  let activeDirection = "to"; // default
  const tabToAIU = $("tabToAIU");
  const tabFromAIU = $("tabFromAIU");

  function setActiveTab(dir){
    activeDirection = dir;
    tabToAIU.classList.toggle("active", dir === "to");
    tabFromAIU.classList.toggle("active", dir === "from");
    tabToAIU.setAttribute("aria-selected", dir === "to" ? "true" : "false");
    tabFromAIU.setAttribute("aria-selected", dir === "from" ? "true" : "false");
    render();
  }
  tabToAIU.addEventListener("click", () => setActiveTab("to"));
  tabFromAIU.addEventListener("click", () => setActiveTab("from"));

  /* =========================
     Filters
     ========================= */
  const search = $("search");
  const lineFilter = $("lineFilter");
  $("clearFilters").addEventListener("click", () => {
    search.value = "";
    lineFilter.value = "";
    render();
  });
  search.addEventListener("input", render);
  lineFilter.addEventListener("change", render);

  /* =========================
     Rendering
     ========================= */
  const tbody = $("tbody");
  const emptyBox = $("emptyBox");

  function normalize(s){ return (s || "").toString().toLowerCase().trim(); }

  function buildLineOptions(){
    const lines = [...new Set(routes.filter(r => r.direction === activeDirection).map(r => r.line).filter(Boolean))].sort();
    const keep = lineFilter.value;
    lineFilter.innerHTML = `<option value="">All lines</option>` + lines.map(l => `<option>${escapeHtml(l)}</option>`).join("");
    // keep selection if still exists
    if (lines.includes(keep)) lineFilter.value = keep;
  }

  function escapeHtml(str){
    return (str || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function render(){
    buildLineOptions();

    const q = normalize(search.value);
    const line = normalize(lineFilter.value);

    const filtered = routes
      .filter(r => r.direction === activeDirection)
      .filter(r => !line || normalize(r.line) === line)
      .filter(r => {
        if (!q) return true;
        const hay = normalize(`${r.line} ${r.stop} ${r.time} ${r.notes}`);
        return hay.includes(q);
      })
      .sort((a,b) => (a.time || "").localeCompare(b.time || ""));

    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td><span class="pillMini">${escapeHtml(r.line || "—")}</span></td>
        <td>${escapeHtml(r.stop || "—")}</td>
        <td style="font-weight:1000;color:rgba(15,33,62,.92)">${escapeHtml(r.time || "—")}</td>
        <td>${escapeHtml(r.notes || "")}</td>
      </tr>
    `).join("");

    emptyBox.style.display = filtered.length ? "none" : "block";
  }

  /* =========================
     Admin modal
     ========================= */
  const modalBackdrop = $("modalBackdrop");
  const openAdmin = $("openAdmin");
  const openAdmin2 = $("openAdmin2");
  const closeAdmin = $("closeAdmin");

  function openModal(){
    modalBackdrop.style.display = "flex";
    renderAdminList();
  }
  function closeModal(){
    modalBackdrop.style.display = "none";
  }
  openAdmin.addEventListener("click", openModal);
  openAdmin2.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
  closeAdmin.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });

  function uid(){
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  $("addRoute").addEventListener("click", () => {
    const direction = $("aDirection").value;
    const line = $("aLine").value.trim();
    const stop = $("aStop").value.trim();
    const time = $("aTime").value.trim();
    const notes = $("aNotes").value.trim();

    if (!line || !stop || !time){
      alert("Please fill Line, Stop/Destination, and Time.");
      return;
    }

    routes.push({ id: uid(), direction, line, stop, time, notes });
    saveRoutes(routes);

    $("aStop").value = "";
    $("aTime").value = "";
    $("aNotes").value = "";

    renderAdminList();
    render();
  });

  function renderAdminList(){
    const list = $("adminList");
    const grouped = routes
      .slice()
      .sort((a,b) => (a.line||"").localeCompare(b.line||"") || (a.time||"").localeCompare(b.time||""))
      .map(r => `
        <div style="padding:12px;border-radius:16px;border:1px solid rgba(15,33,62,.10);background:rgba(255,255,255,.62);display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
          <div style="display:grid;gap:4px;">
            <div style="font-weight:1000;color:rgba(15,33,62,.92)">
              ${escapeHtml(r.direction === "to" ? "To AIU" : "From AIU")} • ${escapeHtml(r.line)}
            </div>
            <div style="font-weight:850;color:rgba(10,16,32,.74)">
              ${escapeHtml(r.stop)} — <span style="font-weight:1000;color:rgba(15,33,62,.92)">${escapeHtml(r.time)}</span>
            </div>
            ${r.notes ? `<div style="font-weight:800;color:rgba(10,16,32,.62);font-size:12px;">${escapeHtml(r.notes)}</div>` : ""}
          </div>
          <button class="btn btn-ghost danger" type="button" data-del="${r.id}">Delete</button>
        </div>
      `).join("");

    list.innerHTML = grouped || `<div class="hint">No routes yet. Add your places and timings above.</div>`;

    list.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        routes = routes.filter(r => r.id !== id);
        saveRoutes(routes);
        renderAdminList();
        render();
      });
    });
  }

  /* =========================
     Sample seed (optional)
     ========================= */
  $("seedExamples").addEventListener("click", () => {
    // Small sample — you will replace/add your real places & timings.
    // (Not the full poster; just demo to show how it looks.)
    const demo = [
      { id: uid(), direction:"to", line:"AIU Line A", stop:"Pickup Point 1", time:"07:20", notes:"Main street" },
      { id: uid(), direction:"to", line:"AIU Line A", stop:"Pickup Point 2", time:"07:30", notes:"Near landmark" },
      { id: uid(), direction:"from", line:"AIU Return A", stop:"Drop-off Point 1", time:"10:10", notes:"Return trip" },
      { id: uid(), direction:"from", line:"AIU Return A", stop:"Drop-off Point 2", time:"11:30", notes:"Late return" },
    ];
    routes = routes.concat(demo);
    saveRoutes(routes);
    renderAdminList();
    render();
    alert("Sample routes added. Now add your real places & timings in Admin.");
  });

  /* =========================
     Export / Reset
     ========================= */
  function download(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], {type: "application/json"}));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  $("exportJson").addEventListener("click", () => {
    download("routes.json", JSON.stringify(routes, null, 2));
  });
  $("exportJsonLink").addEventListener("click", (e) => {
    e.preventDefault();
    download("routes.json", JSON.stringify(routes, null, 2));
  });

  function doReset(){
    if (!confirm("Reset all routes on this device?")) return;
    routes = [];
    saveRoutes(routes);
    renderAdminList();
    render();
  }
  $("resetAll").addEventListener("click", doReset);
  $("resetAllLink").addEventListener("click", (e) => { e.preventDefault(); doReset(); });

  /* =========================
     Request form (demo)
     ========================= */
  const reqForm = $("requestForm");
  const reqToast = $("reqToast");
  reqForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const dest = $("reqDestination").value.trim();
    const time = $("reqTime").value.trim();
    const name = $("reqName").value.trim();
    const phone = $("reqPhone").value.trim();

    reqToast.style.display = "block";
    if (!dest || !time || !name || !phone){
      reqToast.textContent = "Please fill destination, time, name, and phone.";
      return;
    }
    reqToast.textContent = `Request received (demo): ${name} • ${phone} • ${dest} @ ${time}. Connect this form to WhatsApp/email later.`;
    reqForm.reset();
  });

  // Year
  $("year").textContent = new Date().getFullYear();

  // Initial render
  render();
  // ===== Official Table: Fullscreen + Print + Zoom =====
const btnOpenTable = document.getElementById("btnOpenTable");
const btnCloseTable = document.getElementById("btnCloseTable");
const tableModal = document.getElementById("tableModal");
const btnPrintTable = document.getElementById("btnPrintTable");
const tableImg = document.getElementById("tableImg");
const tableViewer = document.getElementById("tableViewer");

btnOpenTable?.addEventListener("click", () => {
  tableModal.style.display = "flex";
});

btnCloseTable?.addEventListener("click", () => {
  tableModal.style.display = "none";
});

tableModal?.addEventListener("click", (e) => {
  if (e.target === tableModal) tableModal.style.display = "none";
});

btnPrintTable?.addEventListener("click", () => {
  const w = window.open("", "_blank");
  w.document.write(`
    <html>
      <head>
        <title>Print Table</title>
        <style>
          body{ margin:0; padding:0; }
          img{ width:100%; height:auto; }
        </style>
      </head>
      <body>
        <img src="routes-table.png" />
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
});

// Wheel zoom inside viewer
let zoom = 1;
tableViewer?.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  zoom += (delta > 0 ? -0.08 : 0.08);
  zoom = Math.min(2.2, Math.max(1, zoom));
  tableImg.style.transform = `scale(${zoom})`;
}, { passive: false });

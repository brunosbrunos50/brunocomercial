/* ===========================================================
   Comercial Artigas — app.js
   Carga productos.csv y config.csv, arma el catálogo,
   maneja búsqueda/filtros y genera los links de WhatsApp.
   No requiere backend ni build: todo corre en el navegador.
   =========================================================== */

let PRODUCTS = [];
let CONFIG = {};
let activeCategory = "Todos";
let searchTerm = "";
let CART = [];
let CURRENT_LIST = [];

/* ---------- Parser CSV simple (soporta comillas y comas dentro de campos) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { row.push(field); field = ""; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        row.push(field); field = "";
        if (row.some(f => f.trim() !== "")) rows.push(row);
        row = [];
      } else { field += char; }
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const headers = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.length && r.some(f => f.trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] || "").trim(); });
      return obj;
    });
}

/* ---------- Carga de datos ---------- */
async function loadCSV(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
  const text = await res.text();
  return parseCSV(text);
}

async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();

  // Cargar config y productos por separado: si uno falla, el otro sigue andando
  const [configResult, productResult] = await Promise.allSettled([
    loadCSV("config.csv"),
    loadCSV("productos.csv"),
  ]);

  if (configResult.status === "fulfilled") {
    CONFIG = {};
    configResult.value.forEach(r => { CONFIG[r.clave] = r.valor; });
  } else {
    console.error("Error cargando config.csv:", configResult.reason);
    CONFIG = {};
  }
  applyBranding();

  if (productResult.status === "fulfilled") {
    PRODUCTS = productResult.value
      .map(p => ({
        categoria: (p.categoria || "Otros").trim() || "Otros",
        nombre: (p.nombre || "").trim(),
        descripcion: (p.descripcion || "").trim(),
        precio: (p.precio || "").trim(),
        unidad: (p.unidad || "").trim(),
        destacado: (p.destacado || "").toUpperCase() === "SI",
      }))
      // descarta filas sin nombre de producto (fila vacía o corrupta en el CSV)
      .filter(p => p.nombre !== "");

    buildCategoryChips();
    renderCatalog();
    wireEvents();
  } else {
    console.error("Error cargando productos.csv:", productResult.reason);
    const status = document.getElementById("catalog-status");
    status.hidden = false;
    status.textContent =
      "No pudimos cargar el catálogo de productos. Revisá que el archivo productos.csv esté subido y bien nombrado.";
  }
}

/* ---------- Branding dinámico desde config.csv ---------- */
function applyBranding() {
  const waNumber = (CONFIG.whatsapp_numero || "").replace(/\D/g, "");
  const waLink = buildWALink(waNumber, "Hola! Quería consultar por un producto.");

  document.getElementById("header-whatsapp").href = waLink;
  document.getElementById("float-whatsapp").href = waLink;
  document.getElementById("footer-whatsapp").href = waLink;

  document.getElementById("footer-name").textContent = CONFIG.nombre_negocio || "Comercial Artigas";
  document.getElementById("footer-address").textContent = CONFIG.direccion || "—";
  document.getElementById("footer-hours-1").textContent = CONFIG.horario_l_v || "";
  document.getElementById("footer-hours-2").textContent = CONFIG.horario_sab || "";
  document.getElementById("footer-map").href = CONFIG.mapa_url || "#";

  document.title = `${CONFIG.nombre_negocio || "Comercial Artigas"} — Catálogo`;

  if (!waNumber) {
    console.warn(
      "⚠️ whatsapp_numero no está configurado en config.csv. Los botones de WhatsApp no van a funcionar hasta que se cargue."
    );
    const warning = document.getElementById("config-warning");
    warning.hidden = false;
    warning.textContent =
      "⚠️ Falta configurar el número de WhatsApp en config.csv — los botones de consulta no van a funcionar hasta que se cargue.";
  }
}

// Genera el link de wa.me. Es seguro insertar el resultado directo en un atributo
// href vía innerHTML porque number ya se limpia a solo dígitos (\D eliminado) y
// message siempre pasa por encodeURIComponent — nunca queda una comilla o `<`
// sin escapar en el string final. Si en el futuro se agrega algo a este link,
// mantener ese mismo patrón (encodeURIComponent siempre).
function buildWALink(number, message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

/* ---------- Categorías ---------- */
function buildCategoryChips() {
  // Agrupa categorías ignorando mayúsculas/minúsculas (ej: "Herramientas" y "herramientas" cuentan como una sola)
  const seen = new Map(); // key: minúscula normalizada, value: primer texto tal como se escribió
  PRODUCTS.forEach(p => {
    const key = normalize(p.categoria);
    if (!seen.has(key)) seen.set(key, p.categoria);
  });
  const cats = ["Todos", ...seen.values()];
  const wrap = document.getElementById("category-scroll");
  wrap.innerHTML = "";

  cats.forEach(cat => {
    const chip = document.createElement("button");
    chip.className = "chip" + (cat === activeCategory ? " active" : "");
    chip.textContent = cat;
    chip.type = "button";
    chip.addEventListener("click", () => {
      activeCategory = cat;
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderCatalog();
    });
    wrap.appendChild(chip);
  });
}

/* ---------- Render del catálogo ---------- */
function renderCatalog() {
  const grid = document.getElementById("catalog-grid");
  const emptyState = document.getElementById("empty-state");
  const status = document.getElementById("catalog-status");

  let list = PRODUCTS;

  if (activeCategory !== "Todos") {
    list = list.filter(p => normalize(p.categoria) === normalize(activeCategory));
  }

  if (searchTerm.trim()) {
    const term = normalize(searchTerm);
    list = list.filter(p =>
      normalize(p.nombre).includes(term) || normalize(p.descripcion).includes(term)
    );
  }

  // destacados primero
  list = [...list].sort((a, b) => (b.destacado === a.destacado ? 0 : b.destacado ? 1 : -1));

  grid.innerHTML = "";

  if (!list.length) {
    emptyState.hidden = false;
    emptyState.textContent = PRODUCTS.length === 0
      ? "Todavía no hay productos cargados en el catálogo."
      : "No encontramos productos con ese nombre. Probá con otra palabra o consultanos directo por WhatsApp.";
    status.hidden = true;
    return;
  }

  emptyState.hidden = true;
  status.hidden = false;
  status.textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;

  const waNumber = (CONFIG.whatsapp_numero || "").replace(/\D/g, "");

  list.forEach(p => {
    const card = document.createElement("article");
    card.className = "product-card";

    const priceLabel = getPriceLabel(p.precio);
    const message = `Hola! Quería consultar precio y disponibilidad de: ${p.nombre}`;
    const waLink = buildWALink(waNumber, message);

    card.innerHTML = `
      ${p.destacado ? '<span class="product-badge">Destacado</span>' : ""}
      <span class="product-category">${escapeHTML(p.categoria)}</span>
      <h2 class="product-name">${escapeHTML(p.nombre)}</h2>
      <p class="product-desc">${escapeHTML(p.descripcion)}</p>
      <div class="product-footer">
        <span class="product-price">${priceLabel}${p.unidad ? `<span class="unit"> / ${escapeHTML(p.unidad)}</span>` : ""}</span>
        <a class="btn-consultar" href="${waLink}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.4 3.9 3.4.5.2 1 .4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" fill="currentColor"/></svg>
          Consultar
        </a>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ---------- Utils ---------- */
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPriceLabel(rawPrice) {
  if (!rawPrice || !rawPrice.trim()) return "Consultar";
  const formatted = formatPrice(rawPrice);
  if (formatted === null) return escapeHTML(rawPrice); // texto tipo "A convenir"
  return `$${formatted}`;
}

function formatPrice(value) {
  const cleaned = String(value).trim();
  // Detecta si es un número válido (con o sin separador de miles/decimales)
  const numericPattern = /^\$?\s*\d{1,3}(\.\d{3})*(,\d+)?$|^\$?\s*\d+(\.\d+)?$/;
  if (!numericPattern.test(cleaned)) {
    return null; // no es un número (ej: "A convenir") — se muestra tal cual
  }
  let normalized = cleaned.replace(/\$/g, "").trim();
  // Si tiene puntos como separador de miles (ej: 1.500) y opcionalmente coma decimal (1.500,50)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    // Un solo separador: asumimos que es decimal si tiene 1-2 dígitos después, sino miles
    normalized = normalized.replace(",", ".");
  }
  const num = parseFloat(normalized);
  if (isNaN(num)) return null;
  return num.toLocaleString("es-UY");
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

/* ---------- Eventos ---------- */
function wireEvents() {
  const input = document.getElementById("search-input");
  let debounce;
  input.addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchTerm = e.target.value;
      renderCatalog();
    }, 120);
  });
}

init();

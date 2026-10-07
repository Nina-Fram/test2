(function () {
  const data = window.LANDING;
  const root = document.getElementById("landing");

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function track(name, detail) {
    document.dispatchEvent(new CustomEvent("lk-landing", { detail: Object.assign({ name }, detail || {}) }));
  }

  function detailButton(product) {
    const label = product.detailLabel || "Подробнее об исследовании";
    const route = data.catalogRoutes[product.code];
    if (!route) {
      return `<button type="button" class="btn" disabled aria-describedby="catalog-pending">${esc(label)}</button>`;
    }
    return `<a class="btn" href="${esc(route)}" data-event="open-detail" data-code="${esc(product.code)}">${esc(label)}</a>`;
  }

  function materialLink(sectionId) {
    return `<a class="btn light" href="#materials-${esc(sectionId)}" data-event="open-booklet" data-section="${esc(sectionId)}">Материалы для врачей</a>`;
  }

  function videoNote() {
    return `<p class="study-pending">Короткое видео сейчас недоступно: ссылка на файл не подтверждена, поэтому плеер не подключён.</p>
      <button type="button" class="btn light" disabled>Смотреть короткое видео</button>`;
  }

  function facts(items) {
    if (!items) return "";
    return `<ul class="fact-row">${items.map((item) => `<li><span class="fact-value">${esc(item.value)}</span><span class="fact-label">${esc(item.label)}</span></li>`).join("")}</ul>`;
  }

  function productCard(product, section) {
    return `<article class="study-card" id="product-${esc(product.code)}" data-track="product" data-code="${esc(product.code)}">
      <p class="study-code">№ ${esc(product.code)}</p>
      <h3>${esc(product.name)}</h3>
      <p>${esc(product.summary)}</p>
      ${product.details ? `<p class="study-details">${esc(product.details)}</p>` : ""}
      ${product.accent ? `<p class="study-accent">${esc(product.accent)}</p>` : ""}
      ${facts(product.facts)}
      ${product.material ? `<p class="study-material">Материал: ${esc(product.material)}</p>` : ""}
      ${product.note ? `<p class="study-note">${esc(product.note)}</p>` : ""}
      ${product.video ? videoNote() : ""}
      <div class="study-actions">
        ${detailButton(product)}
        ${materialLink(section.id)}
      </div>
    </article>`;
  }

  function sectionView(section) {
    const intro = section.title
      ? `<p class="section-kicker">${esc(section.eyebrow)}</p><h2 id="label-${esc(section.id)}">${esc(section.title)}</h2><p class="section-lead">${esc(section.text)}</p>`
      : `<h2 id="label-${esc(section.id)}">${esc(section.eyebrow)}</h2>`;
    const cards = section.products.map((product) => productCard(product, section)).join("");
    return `<section class="landing-section tone-${esc(section.id)}" id="${esc(section.id)}" aria-labelledby="label-${esc(section.id)}" data-track="section" data-section="${esc(section.id)}">
      ${intro}
      <div class="study-grid is-${esc(section.layout)}">${cards}</div>
    </section>`;
  }

  function materialsView() {
    const groups = data.materials.map((group) => {
      const items = group.items.map((item) => `<li><a href="${esc(item.href)}" target="_blank" rel="noopener noreferrer" data-event="open-webinar" data-section="${esc(group.id)}">${esc(item.title)}</a>${item.sameAs ? `<span class="same-note">Та же запись указана и в соседнем направлении: название относится и к желудку, и к толстой кишке.</span>` : ""}</li>`).join("");
      return `<section class="material-group" id="materials-${esc(group.id)}" aria-labelledby="materials-label-${esc(group.id)}">
        <h3 id="materials-label-${esc(group.id)}">${esc(group.title)}</h3>
        <ul>${items}</ul>
      </section>`;
    }).join("");
    return `<section class="landing-section materials" id="materials" aria-labelledby="materials-title">
      <h2 id="materials-title">Подробнее о каждом исследовании</h2>
      <p class="section-lead">${esc(data.materialsIntro)}</p>
      <p class="study-pending">Общая папка материалов для печати сейчас не открывается, поэтому кнопки скачивания нет. Ниже — вебинары с проверенными названиями.</p>
      <div class="material-grid">${groups}</div>
      <p class="disclaimer">${esc(data.disclaimer)}</p>
    </section>`;
  }

  root.innerHTML = `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="hero-kicker">Исследования</p>
        <h1 id="hero-title">${esc(data.hero.title)}</h1>
        <p>${esc(data.hero.text)}</p>
        <a class="btn" href="#${esc(data.hero.target)}">${esc(data.hero.cta)}</a>
      </div>
    </section>
    <nav class="direction-nav" aria-label="Направления" id="selection">
      ${data.directions.map((item) => `<a href="#${esc(item.id)}">${esc(item.label)}</a>`).join("")}
    </nav>
    <p class="catalog-note" id="catalog-pending">Переход в карточку исследования появится, когда будет подключён адрес в личном кабинете. Кнопка «Подробнее» пока не ведёт на другую страницу.</p>
    ${data.sections.map(sectionView).join("")}
    ${materialsView()}`;

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-event]");
    if (!target) return;
    track(target.dataset.event, {
      code: target.dataset.code || "",
      section: target.dataset.section || "",
      href: target.getAttribute("href") || "",
    });
  });

  const seen = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const key = entry.target.dataset.section || entry.target.dataset.code;
      if (seen.has(key)) return;
      seen.add(key);
      track("view-section", { section: entry.target.dataset.section || "", code: entry.target.dataset.code || "" });
    });
  }, { threshold: 0.45 });
  root.querySelectorAll("[data-track]").forEach((node) => observer.observe(node));
})();

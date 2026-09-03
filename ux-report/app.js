(function () {
  const boot = () => {
    const report = window.UX_REPORT;
    if (!report) return;

  const dash = "—";
  const levelLabel = {
    p0: "P0 · Блокер",
    p1: "P1 · Критично",
    p2: "P2 · Важно",
    p3: "P3 · Наблюдать",
  };

  const pct = (n) => `${Math.round(n * 100)}%`;
  const fmtN = (n) => new Intl.NumberFormat("ru-RU").format(n);

  const painLabel = (s) => {
    if (s.id === "lab") return `${pct(s.missRate)} не нашли`;
    if (s.id === "prio") return "сигнал спроса";
    if (s.negativeShare == null) return dash;
    return `${pct(s.negativeShare)} негатива`;
  };

  const successLabel = (s) => {
    if (s.avg != null) return `CES ${s.avg.toFixed(2)}`;
    if (s.id === "lab") return `${s.found.yes} нашли / ${s.found.no} нет`;
    if (s.id === "prio") return "ранжирование фич";
    return dash;
  };

  document.getElementById("kpis").innerHTML = [
    { num: fmtN(report.kpis.responses), label: "Всего обращений по 6 опросам" },
    { num: report.kpis.surveys, label: "Кампаний в выгрузке" },
    { num: pct(report.kpis.cesNegativeShare), label: "Негатив в CES-опросах" },
    { num: report.kpis.p0p1, label: "Тем уровня P0–P1 в очереди" },
  ]
    .map(
      (k) => `<article class="kpi">
        <div class="num">${k.num}</div>
        <div class="label">${k.label}</div>
      </article>`
    )
    .join("");

  document.getElementById("takeaways").innerHTML = report.takeaways
    .map(
      (t) => `<article class="takeaway ${t.level}">
        <div class="id">${t.id} · ${levelLabel[t.level]}</div>
        <h3>${t.title}</h3>
        <p>${t.text}</p>
      </article>`
    )
    .join("");

  const maxN = Math.max(...report.surveys.map((s) => s.responses));
  const byVolume = [...report.surveys].sort((a, b) => b.responses - a.responses);

  document.getElementById("bars").innerHTML = byVolume
    .map((s) => {
      const width = Math.max(8, Math.round((s.responses / maxN) * 100));
      return `<div class="bar-row">
        <div class="name">${s.short}<span class="sub">${s.area} · ${s.period}</span></div>
        <div class="track" aria-hidden="true"><div class="fill" style="width:${width}%"></div></div>
        <div class="count">${fmtN(s.responses)}</div>
      </div>`;
    })
    .join("");

  const order = { p0: 0, p1: 1, p2: 2, p3: 3 };
  const ranked = [...report.surveys].sort((a, b) => {
    const ld = order[a.level] - order[b.level];
    if (ld !== 0) return ld;
    return b.responses - a.responses;
  });

  document.getElementById("rank-body").innerHTML = ranked
    .map(
      (s, i) => `<tr>
        <td class="rank">${String(i + 1).padStart(2, "0")}</td>
        <td>
          <strong>${s.name}</strong>
          <div class="why">${s.why}</div>
        </td>
        <td>${fmtN(s.responses)}</td>
        <td>${painLabel(s)}</td>
        <td>${successLabel(s)}</td>
        <td><span class="sev sev--${s.level}">${levelLabel[s.level]}</span></td>
      </tr>`
    )
    .join("");

  document.getElementById("issues-card").innerHTML = `<div class="table-wrap"><table>
    <thead>
      <tr>
        <th>#</th>
        <th>Тема</th>
        <th>Опрос</th>
        <th>Сигналов</th>
        <th>Уровень</th>
        <th>Рекомендация</th>
      </tr>
    </thead>
    <tbody>${report.issues
      .map(
        (issue, i) => `<tr>
          <td class="rank">${String(i + 1).padStart(2, "0")}</td>
          <td>
            <strong>${issue.title}</strong>
            ${issue.quote ? `<div class="why">«${issue.quote}»</div>` : ""}
          </td>
          <td>${issue.survey}</td>
          <td>${issue.count}</td>
          <td><span class="sev sev--${issue.severity}">${levelLabel[issue.severity]}</span></td>
          <td>${issue.recommendation}</td>
        </tr>`
      )
      .join("")}</tbody>
  </table></div>`;

  const maxFeat = Math.max(...report.features.map((f) => f.mentions));
  document.getElementById("feature-bars").innerHTML = report.features
    .map((f) => {
      const width = Math.max(8, Math.round((f.mentions / maxFeat) * 100));
      return `<div class="bar-row">
        <div class="name">${f.name}<span class="sub">${f.rank1} раз — 1-е место · средний ранг ${f.avgRank} · ${f.note}</span></div>
        <div class="track" aria-hidden="true"><div class="fill" style="width:${width}%"></div></div>
        <div class="count">${f.mentions}</div>
      </div>`;
    })
    .join("");

  const cesColors = {
    Отлично: "var(--ok)",
    Хорошо: "#7bc9b0",
    Нормально: "var(--p2)",
    Плохо: "var(--p1)",
    Ужасно: "var(--p0)",
  };
  const cesKeys = ["Отлично", "Хорошо", "Нормально", "Плохо", "Ужасно"];

  document.getElementById("ces-bars").innerHTML = report.surveys
    .filter((s) => s.ces)
    .map((s) => {
      const total = cesKeys.reduce((sum, k) => sum + (s.ces[k] || 0), 0);
      const segs = cesKeys
        .map((k) => {
          const n = s.ces[k] || 0;
          if (!n) return "";
          const w = (n / total) * 100;
          return `<span style="width:${w}%;background:${cesColors[k]}" title="${k}: ${n}"></span>`;
        })
        .join("");
      return `<div class="bar-row">
        <div class="name">${s.short}<span class="sub">CES ${s.avg.toFixed(2)} · ${fmtN(s.responses)} ответов</span></div>
        <div class="stack" aria-hidden="true">${segs}</div>
        <div class="count">${pct(s.negativeShare)}</div>
      </div>`;
    })
    .join("");

  const courier = report.surveys.find((s) => s.id === "courier");
  document.getElementById("ces-note").innerHTML = courier.domainSplit
    .map((d) => `<strong>${d.name}:</strong> ${fmtN(d.n)} ответов, CES ${d.avg.toFixed(2)}, негатив ${pct(d.neg)}`)
    .join(" · ");

  document.getElementById("quotes").innerHTML = report.quotes
    .map(
      (q) => `<figure class="quote">
        <p>«${q.text}»</p>
        <figcaption class="meta"><span class="pill">${q.survey}</span><span>${q.score}</span></figcaption>
      </figure>`
    )
    .join("");

  document.getElementById("actions-card").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Уровень</th><th>Действие</th><th>Кто</th><th>Когда</th></tr></thead>
    <tbody>${report.actions
      .map(
        (a) => `<tr>
          <td><span class="sev sev--${a.level}">${levelLabel[a.level]}</span></td>
          <td><strong>${a.title}</strong><div class="why">${a.detail}</div></td>
          <td>${a.owner}</td>
          <td>${a.when}</td>
        </tr>`
      )
      .join("")}</tbody>
  </table></div>`;

  document.getElementById("formula").textContent = report.methodology.formula;
  document.getElementById("factors").innerHTML = report.methodology.factors
    .map((f) => `<article class="factor"><h3>${f.name}</h3><p>${f.detail}</p></article>`)
    .join("");
  document.getElementById("levels").innerHTML = report.methodology.levels
    .map(
      (l) => `<article class="level">
        <div class="t">${l.label}</div>
        <div class="d">${l.hint}</div>
      </article>`
    )
    .join("");
  document.getElementById("sample-note").textContent = report.meta.sampleNote;

  const links = document.querySelectorAll(".nav__list a");
  const sections = [...links].map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const setCurrent = () => {
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 96) current = section;
    }
    links.forEach((a) => {
      a.setAttribute("aria-current", a.getAttribute("href") === `#${current.id}` ? "true" : "false");
    });
  };
    setCurrent();
    window.addEventListener("scroll", setCurrent, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

(function () {
  const report = window.UX_REPORT;
  if (!report) return;

  const ready = report.meta.dataStatus === "ready";
  const dash = "—";

  const fmt = (value, suffix) => {
    if (value === null || value === undefined || Number.isNaN(value)) return dash;
    if (typeof value === "number" && suffix === "%") return `${Math.round(value * 100)}%`;
    return String(value);
  };

  const totalResponses = report.surveys.reduce((sum, s) => sum + (s.responses || 0), 0);
  const maxResponses = Math.max(0, ...report.surveys.map((s) => s.responses || 0));
  const negatives = report.surveys.reduce((sum, s) => {
    if (!s.responses || s.negativeShare == null) return sum;
    return sum + s.responses * s.negativeShare;
  }, 0);
  const p0p1 = report.issues.filter((i) => i.severity === "p0" || i.severity === "p1").length;

  document.getElementById("period").textContent = report.meta.periodLabel;
  document.getElementById("generated").textContent = report.meta.generatedAt;
  document.getElementById("formula").textContent = report.methodology.formula;

  const pill = document.getElementById("status-pill");
  const banner = document.getElementById("data-banner");
  if (!ready) {
    pill.textContent = "Ожидает выгрузку";
    pill.classList.add("pill--warn");
    banner.hidden = false;
    banner.innerHTML = `<strong>Данные ещё не подставлены.</strong> ${report.meta.dataNote}`;
  } else {
    pill.textContent = "Данные UX Feedback";
    pill.classList.add("pill--accent");
    banner.hidden = true;
  }

  const kpis = [
    {
      num: ready ? totalResponses : dash,
      label: "Всего обращений по опросам",
    },
    {
      num: report.surveys.length,
      label: "Кампаний в контуре отчёта",
    },
    {
      num: ready ? fmt(totalResponses ? negatives / totalResponses : null, "%") : dash,
      label: "Доля негативных оценок",
    },
    {
      num: ready ? p0p1 : dash,
      label: "Тем уровня P0–P1",
    },
  ];

  document.getElementById("kpis").innerHTML = kpis
    .map(
      (k) => `<article class="kpi">
        <div class="num${k.num === dash ? " is-empty" : ""}">${k.num}</div>
        <div class="label">${k.label}</div>
      </article>`
    )
    .join("");

  const sortedByVolume = [...report.surveys].sort((a, b) => (b.responses || 0) - (a.responses || 0));

  document.getElementById("bars").innerHTML = sortedByVolume
    .map((s) => {
      const empty = !ready || !s.responses;
      const width = empty ? null : Math.max(6, Math.round((s.responses / (maxResponses || 1)) * 100));
      return `<div class="bar-row">
        <div class="name">${s.name}<span class="sub">${s.area} · ${s.type === "passive" ? "пассивный" : "активный"}</span></div>
        <div class="track" aria-hidden="true"><div class="fill${empty ? " is-empty" : ""}" style="${empty ? "" : `width:${width}%`}"></div></div>
        <div class="count">${empty ? dash : s.responses}</div>
      </div>`;
    })
    .join("");

  const scoreSurvey = (s) => {
    const freq = s.responses || 0;
    const neg = s.negativeShare == null ? 0 : s.negativeShare;
    const weight = s.scenarioWeight || 0.5;
    return freq * (0.35 + neg) * weight;
  };

  const levelFromScore = (s, score, maxScore) => {
    if (s.forcedLevel) return s.forcedLevel;
    if (!ready || !s.responses) return null;
    const ratio = maxScore ? score / maxScore : 0;
    const neg = s.negativeShare || 0;
    if (neg >= 0.35 && s.scenarioWeight >= 0.9) return "p0";
    if (ratio >= 0.7 || (neg >= 0.25 && s.scenarioWeight >= 0.9)) return "p1";
    if (ratio >= 0.35 || neg >= 0.15) return "p2";
    return "p3";
  };

  const scored = report.surveys.map((s) => ({ ...s, _score: scoreSurvey(s) }));
  const maxScore = Math.max(0, ...scored.map((s) => s._score));
  scored.forEach((s) => {
    s._level = levelFromScore(s, s._score, maxScore);
  });
  scored.sort((a, b) => {
    const order = { p0: 0, p1: 1, p2: 2, p3: 3 };
    if (!ready) return (b.scenarioWeight || 0) - (a.scenarioWeight || 0);
    const ld = (order[a._level] ?? 9) - (order[b._level] ?? 9);
    if (ld !== 0) return ld;
    return b._score - a._score;
  });

  const levelLabel = {
    p0: "P0 · Блокер",
    p1: "P1 · Критично",
    p2: "P2 · Важно",
    p3: "P3 · Наблюдать",
  };

  document.getElementById("rank-body").innerHTML = scored
    .map((s, i) => {
      const level = s._level
        ? `<span class="sev sev--${s._level}">${levelLabel[s._level]}</span>`
        : `<span class="muted">${dash}</span>`;
      return `<tr>
        <td class="rank">${String(i + 1).padStart(2, "0")}</td>
        <td><strong>${s.name}</strong><div class="muted">${s.question}</div></td>
        <td>${ready && s.responses != null ? s.responses : dash}</td>
        <td>${ready ? fmt(s.negativeShare, "%") : dash}</td>
        <td>${s.scenarioWeight.toFixed(1)}</td>
        <td>${level}</td>
      </tr>`;
    })
    .join("");

  document.getElementById("survey-grid").innerHTML = report.surveys
    .map(
      (s) => `<article class="survey">
        <header>
          <h3>${s.name}</h3>
          <span class="pill">${s.type === "passive" ? "Пассивный" : "Активный"}</span>
        </header>
        <p class="q">${s.question}</p>
        <div class="stats">
          <div class="stat"><div class="n">${ready && s.responses != null ? s.responses : dash}</div><div class="l">ответов</div></div>
          <div class="stat"><div class="n">${ready ? fmt(s.negativeShare, "%") : dash}</div><div class="l">негатив</div></div>
          <div class="stat"><div class="n">${s.scenarioWeight.toFixed(1)}</div><div class="l">вес сценария</div></div>
        </div>
      </article>`
    )
    .join("");

  const issuesCard = document.getElementById("issues-card");
  if (!report.issues.length) {
    issuesCard.innerHTML = `<div class="empty">
      <strong>Кластеры появятся из открытых ответов</strong>
      Когда будет выгрузка, здесь будет очередь тем: формулировка проблемы, число упоминаний, цитата и рекомендация в бэклог.
    </div>`;
  } else {
    issuesCard.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Тема</th><th>Опрос</th><th>Упоминаний</th><th>Уровень</th><th>Рекомендация</th></tr></thead>
      <tbody>${report.issues
        .map(
          (issue, i) => `<tr>
            <td class="rank">${String(i + 1).padStart(2, "0")}</td>
            <td><strong>${issue.title}</strong>${issue.quote ? `<div class="muted">«${issue.quote}»</div>` : ""}</td>
            <td>${issue.survey}</td>
            <td>${issue.count}</td>
            <td><span class="sev sev--${issue.severity}">${levelLabel[issue.severity] || issue.severity}</span></td>
            <td>${issue.recommendation || "—"}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table></div>`;
  }

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
})();

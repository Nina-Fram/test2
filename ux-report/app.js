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

  const escape = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const answers = window.UX_ANSWERS || [];
  const acc = document.getElementById("answers-acc");
  const renderAnswer = (a) => {
    const also = (a.also || [])
      .map((x) => `<span class="pill">${escape(x)}</span>`)
      .join("");
    return `<article class="answer">
      <div class="meta">
        <span class="pill">${escape(a.score)}</span>
        <span class="muted">${escape(a.domain)}${a.kind ? ` · ${escape(a.kind)}` : ""}</span>
      </div>
      <div>
        <p class="text">${escape(a.text)}</p>
        ${also ? `<div class="also"><span class="muted">Ещё выбирали:</span> ${also}</div>` : ""}
      </div>
    </article>`;
  };
  if (acc) {
    acc.innerHTML = answers
      .map((g) => {
        let items;
        if (g.grouped && g.groups) {
          const hint = g.question
            ? `<p class="acc-hint">${escape(g.question)} Комментарий привязан к варианту, который человек выбрал или поставил первым.</p>`
            : "";
          items =
            hint +
            g.groups
              .filter((sub) => sub.answers.length)
              .map(
                (sub) => `<details class="acc acc--nested">
                  <summary>${escape(sub.option)} <span class="count">${sub.answers.length}</span></summary>
                  <div class="acc-body">${sub.answers.map(renderAnswer).join("")}</div>
                </details>`
              )
              .join("");
        } else {
          items = (g.answers || []).map(renderAnswer).join("");
        }
        const n = g.grouped ? (g.answers || []).length : (g.answers || []).length;
        return `<details class="acc">
          <summary>${escape(g.name)} <span class="count">${n}</span></summary>
          <div class="acc-body">${items || `<p class="muted" style="padding:12px">Нет формулировок для доработок</p>`}</div>
        </details>`;
      })
      .join("");
    document.getElementById("acc-open")?.addEventListener("click", () => {
      acc.querySelectorAll("details").forEach((d) => {
        d.open = true;
      });
    });
    document.getElementById("acc-close")?.addEventListener("click", () => {
      acc.querySelectorAll("details").forEach((d) => {
        d.open = false;
      });
    });
    window.addEventListener("beforeprint", () => {
      acc.querySelectorAll("details").forEach((d) => {
        d.open = true;
      });
    });
  }

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

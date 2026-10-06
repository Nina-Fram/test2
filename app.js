const REGIMES = [
  { id: "p2", label: "+2…+8 °C" },
  { id: "m20", label: "−17…−23 °C" },
  { id: "p18", label: "+18…+27 °C" },
  { id: "p35", label: "+35…+37 °C" },
  { id: "none", label: "Без терморежима" },
];

const ADDRESSES = [
  { id: "a1", text: "г. Москва, ул. Маросейка, д. 7, стр. 1" },
  { id: "a2", text: "г. Москва, ул. Пятницкая, д. 25, стр. 1" },
];

const PERIODS = [
  { id: "week", label: "за неделю", days: 7 },
  { id: "month", label: "за месяц", days: 31 },
  { id: "quarter", label: "за 3 месяца", days: 92 },
  { id: "all", label: "за всё время", days: null },
];

let seq = 1;
const uid = (p) => `${p}${seq++}`;

const state = {
  view: "list",
  modal: null,
  period: "week",
  periodOpen: false,
  sortKey: "created",
  sortDir: "desc",
  refreshLeft: 9 * 60 + 58,
  refreshing: false,
  toast: "",
  toastTimer: null,
  orders: [],
  contacts: [
    { id: "c1", name: "Кудряшов Владимир Андреевич", phone: "+7 (953) 510-44-66" },
    { id: "c2", name: "Кукухин Петр Сергеевич", phone: "+7 (951) 212-33-44" },
  ],
  standing: [
    { id: "s1", schedule: "Каждый будний день", time: "09:00–12:00", address: ADDRESSES[0].text, cargo: "Биоматериал" },
    { id: "s2", schedule: "Пн, Ср, Пт", time: "15:00–18:00", address: ADDRESSES[1].text, cargo: "Биоматериал" },
  ],
  activeId: null,
  standingId: null,
  form: null,
  errors: {},
  showErrors: false,
  calOpen: false,
  calCursor: null,
  openMenu: null,
  successPayload: null,
  sendTimer: null,
};

function at(dayOffset, hh, mm) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function pad(n) { return String(n).padStart(2, "0"); }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDate(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; }
function fmtDateShort(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`; }
function fmtTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDateTime(d) { return `${fmtDate(d)} ${fmtTime(d)}`; }
function dayWord(d) {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return `Сегодня ${fmtDateShort(d)}`;
  if (diff === 1) return `Завтра ${fmtDateShort(d)}`;
  return fmtDate(d);
}
function fmtTimer(sec) {
  const s = Math.max(0, sec);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
function minutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function hhmm(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}
function ceilTo30(date) {
  const d = new Date(date);
  if (d.getSeconds() || d.getMilliseconds()) {
    d.setMinutes(d.getMinutes() + 1);
    d.setSeconds(0, 0);
  }
  const m = d.getMinutes();
  if (m === 0 || m === 30) return d;
  if (m < 30) d.setMinutes(30);
  else { d.setMinutes(0); d.setHours(d.getHours() + 1); }
  return d;
}
function phoneDigits(v) { return String(v || "").replace(/\D/g, ""); }
function formatPhone(raw) {
  let d = phoneDigits(raw);
  if (d.startsWith("8")) d = `7${d.slice(1)}`;
  if (d.startsWith("7")) d = d.slice(1);
  d = d.slice(0, 10);
  let out = "+7";
  if (!d.length) return raw.trim() === "" ? "" : "+7";
  out += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}
function phoneValid(v) {
  let d = phoneDigits(v);
  if (d.startsWith("8")) d = `7${d.slice(1)}`;
  return d.length === 11 && d.startsWith("7");
}

function regimeLabel(id) { return REGIMES.find((r) => r.id === id)?.label || ""; }
function contactById(id) { return state.contacts.find((c) => c.id === id); }
function addressById(id) { return ADDRESSES.find((a) => a.id === id); }

function seed() {
  const pack = (regime, qty) => ({ id: uid("p"), regime, qty });
  const row = (partial) => ({
    id: uid("o"),
    cargo: "bio",
    packages: [pack("p2", 1), pack("m20", 1)],
    comment: "",
    fillerName: "Кудряшов Владимир Андреевич",
    fillerPhone: "+7 (953) 510-44-66",
    meetName: "Кудряшов Владимир Андреевич",
    meetPhone: "+7 (953) 510-44-66",
    addressId: "a1",
    hoursFrom: "10:00",
    hoursTo: "20:00",
    cancelFails: false,
    ...partial,
  });
  state.orders = [
    row({
      created: at(0, 9, 12),
      visit: at(1, 15, 0),
      visitTo: "18:00",
      status: "new",
      comment: "Плановый забор, профосмотр",
    }),
    row({
      created: at(0, 8, 4),
      visit: at(1, 9, 0),
      visitTo: "12:00",
      status: "new",
      addressId: "a2",
      meetName: "Ромашкин Иван Александрович",
      meetPhone: "+7 (921) 555-12-35",
      packages: [pack("p2", 2), pack("m20", 1)],
      comment: "Биоматериал 20 человек с профосмотра",
    }),
    row({
      created: at(-1, 18, 40),
      visit: at(0, 12, 0),
      visitTo: "15:00",
      status: "confirmed",
    }),
    row({
      created: at(-3, 11, 5),
      visit: at(-2, 15, 0),
      visitTo: "18:00",
      status: "done",
    }),
    row({
      created: at(-4, 16, 48),
      visit: at(-3, 17, 0),
      visitTo: "20:00",
      status: "cancelled",
      comment: "Отменена клиентом",
    }),
    row({
      created: at(-2, 10, 17),
      visit: at(2, 10, 0),
      visitTo: "13:00",
      status: "new",
      cancelFails: true,
      addressId: "a2",
    }),
    row({
      created: at(-10, 12, 24),
      visit: at(-9, 11, 0),
      visitTo: "14:00",
      status: "done",
      packages: [pack("p18", 1)],
    }),
    row({
      created: at(-40, 14, 2),
      visit: at(-39, 15, 0),
      visitTo: "18:00",
      status: "cancelled",
    }),
    row({
      created: at(-120, 9, 30),
      visit: at(-119, 10, 0),
      visitTo: "13:00",
      status: "done",
    }),
  ];
}

function statusMeta(status) {
  if (status === "new") return { text: "Оформлена, ожидайте подтверждения...", cls: "status-new" };
  if (status === "confirmed") return { text: "Подтверждена, ожидайте курьера", cls: "" };
  if (status === "done") return { text: "Выполнена", cls: "status-done" };
  return { text: "Отменена", cls: "status-cancel" };
}

function blankForm(prefill) {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const base = {
    date: tomorrow,
    timeFrom: "15:00",
    timeTo: "18:00",
    cargo: "bio",
    packages: [
      { id: uid("p"), regime: "p2", qty: 1 },
      { id: uid("p"), regime: "m20", qty: 1 },
    ],
    comment: "",
    fillerMode: "",
    fillerId: "",
    newName: "",
    newPhone: "",
    newExt: "",
    meetMode: "",
    meetId: "",
    meetName: "",
    meetPhone: "",
    meetExt: "",
    addressId: "",
    hoursFrom: "",
    hoursTo: "",
    repeatOf: null,
  };
  return Object.assign(base, prefill || {});
}

function openForm(prefill) {
  state.view = "form";
  state.form = blankForm(prefill);
  state.errors = {};
  state.showErrors = false;
  state.calOpen = false;
  state.openMenu = null;
  state.calCursor = new Date(state.form.date);
  state.modal = null;
  render({ keepScroll: false });
}

function icon(name) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const paths = {
    logout: `<path d="M9 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/><path d="M10 12h10"/><path d="M16 8l4 4-4 4"/>`,
    refresh: `<path d="M20 12a8 8 0 1 1-2.2-5.5"/><path d="M20 4v5h-5"/>`,
    chevron: `<path d="M6 9l6 6 6-6"/>`,
    arrowUp: `<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>`,
    cal: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`,
    trash: `<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/>`,
    close: `<path d="M6 6l12 12M18 6L6 18"/>`,
    check: `<path d="M5 12.5l4.2 4.2L19 7.5"/>`,
    box: `<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>`,
  };
  return `<svg ${common} width="18" height="18" aria-hidden="true">${paths[name] || ""}</svg>`;
}

function showToast(text) {
  state.toast = text;
  clearTimeout(state.toastTimer);
  render();
  state.toastTimer = setTimeout(() => {
    state.toast = "";
    const el = document.querySelector(".toast");
    if (el) el.remove();
  }, 2400);
}

function visibleOrders() {
  const period = PERIODS.find((p) => p.id === state.period);
  const now = startOfDay(new Date());
  let rows = state.orders.slice();
  if (period.days != null) {
    const from = addDays(now, -period.days);
    rows = rows.filter((o) => o.created >= from);
  }
  const dir = state.sortDir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const key = state.sortKey;
    const av = key === "visit" ? a.visit.getTime() : key === "status" ? statusMeta(a.status).text : a.created.getTime();
    const bv = key === "visit" ? b.visit.getTime() : key === "status" ? statusMeta(b.status).text : b.created.getTime();
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return rows;
}

function minStartMinutes(date) {
  if (!isSameDay(date, new Date())) return 0;
  const edge = ceilTo30(new Date(Date.now() + 3 * 60 * 60 * 1000));
  if (!isSameDay(edge, date)) return 24 * 60;
  return edge.getHours() * 60 + edge.getMinutes();
}

function timeOptions(minMinute) {
  const out = [];
  for (let m = 0; m <= 23 * 60 + 30; m += 30) {
    if (m >= minMinute) out.push(hhmm(m));
  }
  return out;
}

function sameDayLate(date) {
  return isSameDay(date, new Date()) && new Date().getHours() >= 13;
}

function intervalWarnings(form) {
  const notes = [];
  if (!form.timeFrom || !form.timeTo) return notes;
  const span = minutes(form.timeTo) - minutes(form.timeFrom);
  const same = isSameDay(form.date, new Date());
  if (same && span > 0 && span < 180) {
    notes.push("Просьба обратить внимание, выбран нестандартный временной интервал. Возможны временные отклонения приезда курьера.");
  }
  if (same && form.cargo === "bio" && form.packages.some((p) => p.regime === "p35")) {
    notes.push("Термоконтейнеры (+35…+37 °C) рекомендуем заказывать на следующий день. День в день доставка не гарантируется.");
  }
  if (sameDayLate(form.date)) {
    notes.push("Обратите внимание, что заявка оформляется позже установленного срока. Просьба контролировать статус заявки.");
  }
  return notes;
}

function validate(form) {
  const errors = {};
  const minStart = minStartMinutes(form.date);
  if (minStart >= 24 * 60) errors.date = "На сегодня свободных интервалов нет — курьер может приехать не раньше чем через 3 часа. Выберите другую дату.";
  if (!form.timeFrom || !form.timeTo) errors.time = "Укажите желаемое время визита";
  else if (minutes(form.timeFrom) < minStart) errors.time = "В день заявки визит возможен не раньше чем через 3 часа";
  else if (minutes(form.timeTo) <= minutes(form.timeFrom)) errors.time = "Время «До» должно быть позже времени «С»";
  else {
    const span = minutes(form.timeTo) - minutes(form.timeFrom);
    const same = isSameDay(form.date, new Date());
    if (same && span < 60) errors.time = "В день заявки интервал не может быть меньше часа";
    if (!same && span < 30) errors.time = "Минимальный интервал — 30 минут";
  }
  if (form.cargo === "bio") {
    if (!form.packages.length) errors.packages = "Добавьте хотя бы один термоконтейнер";
    form.packages.forEach((p) => {
      if (!p.regime) errors[`regime-${p.id}`] = "Выберите терморежим";
      if (!p.qty || p.qty < 1) errors[`qty-${p.id}`] = "Укажите количество";
    });
  }
  if (form.fillerMode === "existing" && form.fillerId) {
    /* ok */
  } else if (form.fillerMode === "new") {
    if (!form.newName.trim()) errors.fillerName = "Заполните ФИО";
    if (!phoneValid(form.newPhone)) errors.fillerPhone = "Неверный формат данных. Добавьте новый контакт";
  } else errors.filler = "Укажите, кто заполняет заявку";

  if (form.meetMode === "self") {
    if (errors.filler || (form.fillerMode === "new" && (errors.fillerName || errors.fillerPhone)) || !form.fillerMode) {
      errors.meet = "Сначала укажите, кто заполняет заявку";
    }
  } else if (form.meetMode === "other" && form.meetSub === "existing" && form.meetId) {
    /* ok */
  } else if (form.meetMode === "other" && form.meetSub === "new") {
    if (!form.meetName.trim()) errors.meetName = "Заполните ФИО";
    if (!phoneValid(form.meetPhone)) errors.meetPhone = "Неверный формат данных";
  } else errors.meet = "Укажите, кто встретит курьера";

  if (!form.addressId) errors.address = "Выберите адрес приезда курьера";
  if (!form.hoursFrom || !form.hoursTo) errors.hours = "Укажите время работы медицинского центра";
  else if (minutes(form.hoursTo) <= minutes(form.hoursFrom)) errors.hours = "Время закрытия должно быть позже времени открытия";
  return errors;
}

function personFromForm(form, role) {
  if (role === "filler") {
    if (form.fillerMode === "existing") {
      const c = contactById(form.fillerId);
      return c ? { name: c.name, phone: c.phone } : null;
    }
    if (form.fillerMode === "new" && form.newName.trim() && phoneValid(form.newPhone)) {
      return { name: form.newName.trim(), phone: formatPhone(form.newPhone) + (form.newExt.trim() ? ` доб. ${form.newExt.trim()}` : "") };
    }
  }
  if (role === "meet") {
    if (form.meetMode === "self") return personFromForm(form, "filler");
    if (form.meetSub === "existing") {
      const c = contactById(form.meetId);
      return c ? { name: c.name, phone: c.phone } : null;
    }
    if (form.meetSub === "new" && form.meetName.trim() && phoneValid(form.meetPhone)) {
      return { name: form.meetName.trim(), phone: formatPhone(form.meetPhone) + (form.meetExt.trim() ? ` доб. ${form.meetExt.trim()}` : "") };
    }
  }
  return null;
}

function hasOverlap(form) {
  const from = minutes(form.timeFrom);
  const to = minutes(form.timeTo);
  return state.orders.some((o) => {
    if (o.status !== "new" && o.status !== "confirmed") return false;
    if (o.addressId !== form.addressId) return false;
    if (!isSameDay(o.visit, form.date)) return false;
    const oFrom = o.visit.getHours() * 60 + o.visit.getMinutes();
    const oTo = minutes(o.visitTo);
    return from < oTo && oFrom < to;
  });
}

function submitForm() {
  const form = state.form;
  const errors = validate(form);
  state.errors = errors;
  state.showErrors = true;
  if (Object.keys(errors).length) {
    render();
    const bad = document.querySelector(".field-error, .warn");
    if (bad) bad.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  if (hasOverlap(form)) {
    state.modal = "duplicate";
    render();
    return;
  }
  state.modal = "sending";
  render();
  clearTimeout(state.sendTimer);
  state.sendTimer = setTimeout(() => {
    const filler = personFromForm(form, "filler");
    const meet = personFromForm(form, "meet");
    if (form.fillerMode === "new") {
      const phone = formatPhone(form.newPhone);
      if (!state.contacts.some((c) => c.phone === phone && c.name === form.newName.trim())) {
        state.contacts.push({ id: uid("c"), name: form.newName.trim(), phone });
      }
    }
    if (form.meetMode === "new") {
      const phone = formatPhone(form.meetPhone);
      if (!state.contacts.some((c) => c.phone === phone && c.name === form.meetName.trim())) {
        state.contacts.push({ id: uid("c"), name: form.meetName.trim(), phone });
      }
    }
    const visit = new Date(form.date);
    const [vh, vm] = form.timeFrom.split(":").map(Number);
    visit.setHours(vh, vm, 0, 0);
    const order = {
      id: uid("o"),
      created: new Date(),
      visit,
      visitTo: form.timeTo,
      status: "new",
      cargo: form.cargo,
      packages: form.cargo === "bio" ? form.packages.map((p) => ({ ...p })) : [],
      comment: form.comment.trim(),
      fillerName: filler.name,
      fillerPhone: filler.phone,
      meetName: meet.name,
      meetPhone: meet.phone,
      addressId: form.addressId,
      hoursFrom: form.hoursFrom,
      hoursTo: form.hoursTo,
      cancelFails: false,
    };
    state.orders.unshift(order);
    state.successPayload = order;
    state.view = "list";
    state.modal = "success";
    state.period = "week";
    render({ keepScroll: false });
  }, 2000);
}

function header() {
  const nav = [
    ["results", "Результаты"],
    ["order", "Оформление заказа"],
    ["orders", "Заказы"],
    ["courier", "Вызов курьера"],
    ["supplies", "Расходные материалы"],
    ["lab", "Лаборатория"],
    ["pre", "Предзаказы"],
  ];
  return `
    <div class="topbar">
      <div class="container topbar-inner">
        <button class="promo-orange" data-action="toast" data-msg="Промо-страница в прототипе не подключена">Развиваемся с ИНВИТРО!</button>
        <div class="webinar">
          <span>Приглашаем медицинских сестер и администраторов</span>
          <span>на бесплатный вебинар: «Этичные продажи в медицине»</span>
        </div>
        <div class="date-pill">
          <b>17 сентября 2026 г.</b>
          <span>11:00 — 13:00 мск</span>
        </div>
      </div>
    </div>
    <header class="site-header">
      <div class="container head-row">
        <button class="brand" data-action="home">
          <span class="logo">INVITRO</span>
          <span class="brand-div"></span>
          <span class="brand-sub">Личный кабинет</span>
        </button>
        <div class="userbar">
          <button class="office" data-action="toast" data-msg="Карточка офиса TEST-KK-A2 в прототипе не открывается">TEST-KK-A2</button>
          <button data-action="toast" data-msg="Раздел «Сотрудники» в прототипе не подключён">Сотрудники</button>
          <button data-action="toast" data-msg="Профиль amazing в прототипе не открывается">amazing</button>
          <button class="logout" data-action="toast" data-msg="Выход в прототипе не выполняется" aria-label="Выйти">${icon("logout")}</button>
        </div>
      </div>
      <div class="container nav">
        ${nav.map(([id, label]) => `
          <button data-action="nav" data-id="${id}" class="${id === "courier" ? "active" : ""}">
            ${label}${id === "lab" ? '<span class="badge">37</span>' : ""}
          </button>`).join("")}
      </div>
    </header>`;
}

function listView() {
  const rows = visibleOrders();
  const period = PERIODS.find((p) => p.id === state.period);
  const sortBtn = (key, label) => {
    const mark = state.sortKey === key ? (state.sortDir === "asc" ? "↑" : "↓") : "";
    return `<button data-action="sort" data-key="${key}">${label}<span class="sort-mark">${mark}</span></button>`;
  };
  const body = rows.length ? rows.map((o) => {
    const st = statusMeta(o.status);
    const addr = addressById(o.addressId);
    let action = "";
    if (o.status === "new") action = `<button class="linkish" data-action="ask-cancel" data-id="${o.id}">Отменить</button>`;
    if (o.status === "done" || o.status === "cancelled") action = `<button class="linkish" data-action="repeat" data-id="${o.id}">Повторить</button>`;
    const sub = o.status === "confirmed" ? `<span class="status-sub">(Отмена возможна через сотрудника ИНВИТРО)</span>` : "";
    return `<tr data-action="details" data-id="${o.id}">
      <td>${fmtDateTime(o.created)}</td>
      <td>${fmtDate(o.visit)} ${fmtTime(o.visit)} – ${o.visitTo}</td>
      <td><span class="${st.cls}">${st.text}</span>${sub}</td>
      <td class="actions">${action}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="4"><div class="empty">Заявок ${period.label} нет. Измените период или оставьте новую заявку.</div></td></tr>`;

  return `
    <h1 class="page-title">Заявки на вызов курьера</h1>
    <section class="card">
      <div class="hints">
        <article class="hint">
          <h3>Заявки «день в день» рекомендуем оформлять до 13:00</h3>
          <p>Оказание услуги зависит от текущей загруженности службы доставки</p>
        </article>
        <article class="hint">
          <h3>Старайтесь использовать 3-часовой интервал времени для визита курьера</h3>
          <p>При указании интервала менее 3 часов визит курьера в точное время не гарантируется</p>
        </article>
        <article class="hint">
          <h3>Поддержка всегда рядом</h3>
          <p>При необходимости с вами свяжется специалист клиентской поддержки, или вы можете самостоятельно связаться с курирующим сотрудником ИНВИТРО</p>
        </article>
      </div>
      <div class="toolbar">
        <button class="btn" data-action="create">Оставить заявку</button>
        ${state.standing.length ? `<button class="btn secondary" data-action="permanent">Отменить одну из постоянных заявок</button>` : `<button class="btn ghost" disabled>Отменить одну из постоянных заявок</button>`}
        <span class="spacer"></span>
        <div style="position:relative">
          <button class="period" data-action="toggle-period" data-popover>${icon("arrowUp")} Показывать ${period.label}</button>
          ${state.periodOpen ? `<div class="menu" data-popover>${PERIODS.map((p) => `<button data-action="period" data-id="${p.id}" ${p.id === state.period ? 'aria-current="true"' : ""}>${p.label}</button>`).join("")}</div>` : ""}
        </div>
      </div>
      <div class="table-wrap">
        <table class="orders">
          <thead>
            <tr>
              <th>${sortBtn("created", "Дата и время оформления")}</th>
              <th>${sortBtn("visit", "Дата и время визита")}</th>
              <th>${sortBtn("status", "Статус")} <span class="refresh-note"><span id="refresh-label">Обновится через ${fmtTimer(state.refreshLeft)}</span>
                <button class="icon-btn ${state.refreshing ? "spin" : ""}" data-action="refresh" aria-label="Обновить список">${icon("refresh")}</button>
              </span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>`;
}

function choice(checked, label, action, extra = "") {
  return `<button type="button" class="choice ${extra}" role="radio" aria-checked="${checked ? "true" : "false"}" data-action="${action.action}" ${action.attrs || ""}>
    <span class="dot"></span><span class="name ${action.strong ? "strong" : ""}">${label}</span>
  </button>`;
}

function contactChoices(selectedId, actionName) {
  return state.contacts.map((c) => `
    <button type="button" class="choice" role="radio" aria-checked="${selectedId === c.id ? "true" : "false"}" data-action="${actionName}" data-id="${c.id}">
      <span class="dot"></span>
      <span class="name">${esc(c.name)}</span>
      <span class="phone">${esc(c.phone)}</span>
    </button>`).join("");
}

function calendar(form) {
  const cursor = state.calCursor || form.date;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  let start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());
  const monthLabel = first.toLocaleString("ru-RU", { month: "long", year: "numeric" });
  const canPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  let cells = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => `<span>${d}</span>`).join("");
  for (let i = 0; i < start; i++) cells += "<span></span>";
  for (let day = 1; day <= days; day++) {
    const date = new Date(year, month, day);
    const disabled = date < today;
    const selected = isSameDay(date, form.date);
    const isToday = isSameDay(date, today);
    cells += `<button type="button" ${disabled ? "disabled" : ""} class="${selected ? "selected" : ""} ${isToday ? "today" : ""}" data-action="pick-date" data-y="${date.getFullYear()}" data-m="${date.getMonth()}" data-d="${date.getDate()}">${day}</button>`;
  }
  return `<div class="popover cal" data-popover>
    <div class="cal-head">
      <button class="icon-btn" type="button" data-action="cal-prev" ${canPrev ? "" : "disabled"} aria-label="Предыдущий месяц" style="transform:rotate(90deg)">${icon("chevron")}</button>
      <span style="text-transform:capitalize">${monthLabel}</span>
      <button class="icon-btn" type="button" data-action="cal-next" aria-label="Следующий месяц" style="transform:rotate(-90deg)">${icon("chevron")}</button>
    </div>
    <div class="cal-grid">${cells}</div>
  </div>`;
}

function timeField(which, value, minMinute) {
  const open = state.openMenu === which;
  let floor = minMinute;
  if (which === "timeTo" && state.form.timeFrom) {
    const gap = isSameDay(state.form.date, new Date()) ? 60 : 30;
    floor = Math.max(minMinute, minutes(state.form.timeFrom) + gap);
  }
  const options = timeOptions(floor);
  const shown = options.length ? options : [];
  return `<div class="grow" style="position:relative">
    <button type="button" class="control ${value ? "" : "placeholder"} ${open ? "open" : ""}" data-action="toggle-time" data-which="${which}" data-popover>
      <span class="prefix">${which === "timeFrom" ? "С" : "До"}</span>
      <span>${value || "Выберите время"}</span>
      <span style="margin-left:auto;color:#647893">${icon("chevron")}</span>
    </button>
    ${open ? `<div class="popover time-menu" data-popover>${shown.map((t) => `<button type="button" data-action="pick-time" data-which="${which}" data-value="${t}" ${t === value ? 'aria-current="true"' : ""}>${t}</button>`).join("") || `<div class="help" style="padding:8px">Нет доступных слотов</div>`}</div>` : ""}
  </div>`;
}

function hoursField(which, value) {
  const open = state.openMenu === which;
  const min = which === "hoursTo" && state.form.hoursFrom ? minutes(state.form.hoursFrom) + 30 : 0;
  const options = timeOptions(min);
  return `<div class="grow" style="position:relative">
    <button type="button" class="control ${value ? "" : "placeholder"} ${open ? "open" : ""}" data-action="toggle-time" data-which="${which}" data-popover>
      <span>${value || "Выберите время"}</span>
      <span style="margin-left:auto;color:#647893">${icon("chevron")}</span>
    </button>
    ${open ? `<div class="popover time-menu" data-popover>${options.map((t) => `<button type="button" data-action="pick-time" data-which="${which}" data-value="${t}" ${t === value ? 'aria-current="true"' : ""}>${t}</button>`).join("")}</div>` : ""}
  </div>`;
}

function formView() {
  const f = state.form;
  const err = state.showErrors ? state.errors : {};
  const warnings = intervalWarnings(f);
  const minStart = minStartMinutes(f.date);
  const fillerPerson = personFromForm(f, "filler");
  const packRows = f.packages.map((p) => `
    <tr>
      <td>
        <span class="tm">${icon("box")} TM - 8
          <button type="button" class="info" aria-label="Что такое ТМ-8">i
            <span class="tip"><b>ТМ-8</b><br>Термоконтейнер объёмом 8 л. Поле не редактируется: для заявки всегда используется ТМ-8.</span>
          </button>
        </span>
      </td>
      <td>
        <select class="select-mini ${err[`regime-${p.id}`] ? "bad" : ""}" data-action="regime" data-id="${p.id}">
          <option value="" ${p.regime ? "" : "selected"}>Выберите терморежим</option>
          ${REGIMES.map((r) => `<option value="${r.id}" ${p.regime === r.id ? "selected" : ""}>${r.label}</option>`).join("")}
        </select>
        ${err[`regime-${p.id}`] ? `<div class="field-error">${err[`regime-${p.id}`]}</div>` : ""}
      </td>
      <td>
        <div class="stepper">
          <button type="button" data-action="qty" data-id="${p.id}" data-delta="-1" aria-label="Меньше">−</button>
          <input inputmode="numeric" value="${p.qty}" data-field="qty" data-id="${p.id}" aria-label="Количество" />
          <button type="button" data-action="qty" data-id="${p.id}" data-delta="1" aria-label="Больше">+</button>
        </div>
      </td>
      <td><button type="button" class="trash" data-action="remove-pack" data-id="${p.id}" aria-label="Удалить строку">${icon("trash")}</button></td>
    </tr>`).join("");

  return `
    <h1 class="page-title">Новая заявка</h1>
    <section class="card form-card">
      <form class="form-grid" id="courier-form">
        <div class="row-2">
          <div>
            <div class="field-label">Дата визита</div>
            <div style="position:relative">
              <button type="button" class="control date-field ${state.calOpen ? "open" : ""}" data-action="toggle-cal" data-popover>
                <span>${dayWord(f.date)}</span>
                <span style="margin-left:auto;color:var(--primary)">${icon("cal")}</span>
              </button>
              ${state.calOpen ? calendar(f) : ""}
            </div>
            ${err.date ? `<div class="field-error">${err.date}</div>` : ""}
          </div>
          <div class="grow">
            <div class="field-label">Желаемое время визита</div>
            <div class="row-time">
              ${timeField("timeFrom", f.timeFrom, minStart)}
              ${timeField("timeTo", f.timeTo, minStart)}
            </div>
            ${err.time ? `<div class="field-error">${err.time}</div>` : ""}
            ${warnings.map((w) => `<div class="warn">${w}</div>`).join("")}
          </div>
        </div>

        <div>
          <div class="field-label">Характер груза:</div>
          <div class="choices" role="radiogroup">
            ${choice(f.cargo === "bio", "Биоматериал", { action: "cargo", attrs: 'data-value="bio"', strong: true })}
            ${choice(f.cargo === "other", "Другое", { action: "cargo", attrs: 'data-value="other"' })}
          </div>
        </div>

        ${f.cargo === "bio" ? `
        <div>
          <div class="field-label">Тип упаковки</div>
          <table class="pack">
            <thead><tr><th>Термоконтейнер</th><th>Терморежим</th><th>Количество</th><th></th></tr></thead>
            <tbody>${packRows}</tbody>
          </table>
          ${err.packages ? `<div class="field-error">${err.packages}</div>` : ""}
          <div style="margin-top:12px"><button type="button" class="btn small" data-action="add-pack">Добавить</button></div>
        </div>` : `<p class="help">Для груза «Другое» тип упаковки не указывается. Детали напишите в комментарии.</p>`}

        <div>
          <div class="field-label">Комментарий к заказу:</div>
          <textarea class="area" data-field="comment" placeholder="Введите комментарий">${esc(f.comment)}</textarea>
        </div>

        <div>
          <div class="field-label">Кто заполняет заявку:
            <button type="button" class="info label-info" aria-label="Подсказка">i
              <span class="tip">Тот, кто заполняет заявку. В большинстве случаев это пользователь личного кабинета.</span>
            </button>
          </div>
          <div class="choices" role="radiogroup">
            ${contactChoices(f.fillerMode === "existing" ? f.fillerId : "", "pick-filler")}
            ${choice(f.fillerMode === "new", "Добавить новый контакт", { action: "filler-new" })}
          </div>
          ${err.filler ? `<div class="field-error">${err.filler}</div>` : ""}
          ${f.fillerMode === "new" ? `
            <div class="inline-fields">
              <div>
                <label>ФИО:</label>
                <div class="control"><input data-field="newName" value="${esc(f.newName)}" placeholder="Заполните ФИО" /></div>
                ${err.fillerName ? `<div class="field-error">${err.fillerName}</div>` : ""}
              </div>
              <div>
                <label>Телефон:</label>
                <div class="control"><input data-field="newPhone" value="${esc(f.newPhone)}" placeholder="+7 (900) 000-00-00" inputmode="tel" /></div>
                <div class="help">Вы можете указать добавочный номер</div>
                ${err.fillerPhone ? `<div class="field-error">${err.fillerPhone}</div>` : ""}
                <div class="control" style="margin-top:8px"><input data-field="newExt" value="${esc(f.newExt)}" placeholder="Добавочный, если есть" /></div>
              </div>
            </div>` : ""}
        </div>

        <div>
          <div class="field-label">Кто будет встречать курьера</div>
          <div class="choices" role="radiogroup">
            ${choice(f.meetMode === "self", "Я встречу курьера", { action: "meet-self" })}
            ${choice(f.meetMode === "other", "Встретит другой сотрудник", { action: "meet-other" })}
          </div>
          ${f.meetMode === "self" && fillerPerson ? `<p class="help">Встретит ${esc(fillerPerson.name)}, ${esc(fillerPerson.phone)}</p>` : ""}
          ${f.meetMode === "other" ? `
            <div class="choices" style="margin-top:10px">
              ${contactChoices(f.meetSub === "existing" ? f.meetId : "", "pick-meet")}
              ${choice(f.meetSub === "new", "Добавить новый контакт", { action: "meet-new" })}
            </div>` : ""}
          ${err.meet ? `<div class="field-error">${err.meet}</div>` : ""}
          ${f.meetSub === "new" ? `
            <div class="inline-fields">
              <div>
                <label>ФИО:</label>
                <div class="control"><input data-field="meetName" value="${esc(f.meetName)}" placeholder="Заполните ФИО" /></div>
                ${err.meetName ? `<div class="field-error">${err.meetName}</div>` : ""}
              </div>
              <div>
                <label>Телефон:</label>
                <div class="control"><input data-field="meetPhone" value="${esc(f.meetPhone)}" placeholder="+7 (900) 000-00-00" inputmode="tel" /></div>
                ${err.meetPhone ? `<div class="field-error">${err.meetPhone}</div>` : ""}
                <div class="control" style="margin-top:8px"><input data-field="meetExt" value="${esc(f.meetExt)}" placeholder="Добавочный, если есть" /></div>
              </div>
            </div>` : ""}
        </div>

        <div>
          <div class="field-label">Адрес приезда курьера</div>
          <p class="help" style="margin-top:0">Если адрес указан неверно или нужно добавить новый, свяжитесь с курирующим сотрудником ИНВИТРО</p>
          <div class="choices" role="radiogroup">
            ${ADDRESSES.map((a) => choice(f.addressId === a.id, esc(a.text), { action: "address", attrs: `data-id="${a.id}"` })).join("")}
          </div>
          ${err.address ? `<div class="field-error">${err.address}</div>` : ""}
        </div>

        <div>
          <div class="field-label">Время работы медицинского центра (${dayWord(f.date)})</div>
          <div class="row-time">
            ${hoursField("hoursFrom", f.hoursFrom)}
            ${hoursField("hoursTo", f.hoursTo)}
          </div>
          ${err.hours ? `<div class="field-error">${err.hours}</div>` : ""}
        </div>

        <div class="submit-row">
          <button class="btn" type="submit">Отправить заявку</button>
          ${state.showErrors && Object.keys(state.errors).length ? `<div class="warn">Пожалуйста, заполните обязательные поля</div>` : ""}
        </div>
      </form>
    </section>`;
}

function detailsModal(order) {
  const st = statusMeta(order.status);
  const packs = order.cargo === "other"
    ? "Другое, без термоконтейнера"
    : order.packages.map((p) => `ТМ-8 · ${regimeLabel(p.regime)} · ${p.qty} шт`).join("<br>");
  const canCancel = order.status === "new";
  return `
    <div class="modal wide" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 id="dlg-title" style="text-align:left">Информация о заявке</h2>
      <p class="lead" style="text-align:left;font-weight:700;color:${order.status === "cancelled" ? "var(--danger)" : "inherit"}">${st.text}</p>
      <dl class="defs">
        <dt>Дата и время заказа:</dt><dd>${fmtDateTime(order.created)}</dd>
        <dt>Дата и время визита курьера:</dt><dd>${fmtDate(order.visit)} ${fmtTime(order.visit)} – ${order.visitTo}</dd>
        <dt>Характер груза:</dt><dd>${order.cargo === "bio" ? "Биоматериал" : "Другое"}</dd>
        <dt>Упаковка:</dt><dd>${packs}</dd>
        <dt>Оформил:</dt><dd>${esc(order.fillerName)} / ${esc(order.fillerPhone)}</dd>
        <dt>Встречает курьера:</dt><dd>${esc(order.meetName)} / ${esc(order.meetPhone)}</dd>
        <dt>Адрес:</dt><dd>${esc(addressById(order.addressId).text)}</dd>
        <dt>Время работы медицинского центра:</dt><dd>${order.hoursFrom} – ${order.hoursTo}</dd>
        <dt>Комментарий:</dt><dd>${order.comment ? esc(order.comment) : "—"}</dd>
      </dl>
      <div class="note">Чтобы внести изменения, отмените текущую заявку и создайте новую. Редактирование созданных заявок недоступно.</div>
      <div class="modal-actions">
        ${canCancel ? `<button class="btn" data-action="ask-cancel" data-id="${order.id}">Отменить</button>` : ""}
        ${order.status === "done" || order.status === "cancelled" ? `<button class="btn" data-action="repeat" data-id="${order.id}">Повторить</button>` : ""}
        <button class="btn secondary" data-action="close">Закрыть</button>
      </div>
    </div>`;
}

function modalHtml() {
  if (!state.modal) return "";
  if (state.modal === "details") {
    const order = state.orders.find((o) => o.id === state.activeId);
    if (!order) return "";
    return `<div class="overlay" data-action="close">${detailsModal(order)}</div>`;
  }
  if (state.modal === "cancel") {
    const order = state.orders.find((o) => o.id === state.activeId);
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2>Отменить заявку?</h2>
      <p class="lead">Визит ${fmtDate(order.visit)}, ${fmtTime(order.visit)}–${order.visitTo}. После отмены заявку нельзя изменить — при необходимости создайте новую.</p>
      <div class="modal-actions">
        <button class="btn" data-action="confirm-cancel" data-autofocus>Отменить заявку</button>
        <button class="btn secondary" data-action="close">Назад</button>
      </div>
    </div></div>`;
  }
  if (state.modal === "cancelError") {
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 style="color:#e07826">Не удалось отменить заявку</h2>
      <p class="lead">Возможно, статус заявки уже изменился. Обновите страницу.</p>
      <div class="modal-actions"><button class="btn" data-action="refresh-after-error" data-autofocus>Обновить страницу</button></div>
    </div></div>`;
  }
  if (state.modal === "sending") {
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="Отправка формы">
      <div class="spinner"></div>
      <h2 style="color:#8a9196">Отправка формы</h2>
      <p class="lead">При невозможности предоставления курьера с вами дополнительно свяжется курирующий сотрудник ИНВИТРО</p>
    </div></div>`;
  }
  if (state.modal === "success") {
    const o = state.successPayload;
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <div class="check">${icon("check")}</div>
      <h2 style="color:var(--primary)">Заявка отправлена!</h2>
      <p class="lead">Ожидайте курьера ${fmtDate(o.visit)} г.<br>Желаемое время: с ${fmtTime(o.visit)} до ${o.visitTo}<br>По адресу: ${esc(addressById(o.addressId).text)}</p>
      <div class="note">Чтобы внести изменения, отмените текущую заявку и создайте новую. Вы можете самостоятельно отменить заявку до её подтверждения.</div>
      <div class="modal-actions"><button class="btn" data-action="close" data-autofocus>Отлично</button></div>
    </div></div>`;
  }
  if (state.modal === "duplicate") {
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 style="color:#e07826">К сожалению, заявка не может быть создана</h2>
      <p class="lead">В выбранное время уже есть запись.<br>Выберите другое время или дату.</p>
      <div class="modal-actions"><button class="btn" data-action="close" data-autofocus>Назад</button></div>
    </div></div>`;
  }
  if (state.modal === "permanent") {
    const items = state.standing.map((s) => `
      <div class="standing">
        <div><b>${esc(s.schedule)}, ${esc(s.time)}</b><span>${esc(s.address)} · ${esc(s.cargo)}</span></div>
        <button class="linkish" data-action="ask-standing" data-id="${s.id}">Отменить</button>
      </div>`).join("");
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 style="text-align:left;font-size:24px">Постоянные заявки</h2>
      <p class="lead" style="text-align:left">Выберите заявку, выезд по которой нужно прекратить. Новую разовую заявку это не создаёт.</p>
      ${items || `<div class="empty">Постоянных заявок нет</div>`}
    </div></div>`;
  }
  if (state.modal === "standingConfirm") {
    const s = state.standing.find((x) => x.id === state.standingId);
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2>Отменить постоянную заявку?</h2>
      <p class="lead">${esc(s.schedule)}, ${esc(s.time)}<br>${esc(s.address)}</p>
      <div class="modal-actions">
        <button class="btn" data-action="confirm-standing">Отменить заявку</button>
        <button class="btn secondary" data-action="permanent">Назад</button>
      </div>
    </div></div>`;
  }
  return "";
}

function render({ keepScroll = true } = {}) {
  const y = window.scrollY;
  const focus = document.activeElement;
  const field = focus && focus.dataset ? focus.dataset.field : null;
  const fieldId = focus && focus.dataset ? focus.dataset.id : null;
  document.getElementById("app").innerHTML = `
    ${header()}
    <main class="page"><div class="container">${state.view === "list" ? listView() : formView()}</div></main>
    ${modalHtml()}
    ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}`;
  if (keepScroll) window.scrollTo(0, y);
  if (field) {
    const el = fieldId
      ? document.querySelector(`[data-field="${field}"][data-id="${fieldId}"]`)
      : document.querySelector(`[data-field="${field}"]`);
    if (el) {
      el.focus();
      const len = el.value ? el.value.length : 0;
      if (el.setSelectionRange) {
        try { el.setSelectionRange(len, len); } catch (e) { /* date inputs */ }
      }
    }
  }
  const auto = document.querySelector("[data-autofocus]");
  if (auto && state.modal) auto.focus();
}

function onField(el) {
  const f = state.form;
  const key = el.dataset.field;
  if (key === "qty") {
    const row = f.packages.find((p) => p.id === el.dataset.id);
    const n = Math.max(1, Math.min(99, parseInt(el.value || "1", 10) || 1));
    if (row) row.qty = n;
    return;
  }
  if (key === "newPhone" || key === "meetPhone") {
    f[key] = formatPhone(el.value);
    el.value = f[key];
    return;
  }
  f[key] = el.value;
}

function repeatOrder(id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  const today = startOfDay(new Date());
  const date = startOfDay(o.visit) >= today ? new Date(o.visit) : addDays(today, 1);
  const filler = state.contacts.find((c) => c.name === o.fillerName);
  const meet = state.contacts.find((c) => c.name === o.meetName);
  openForm({
    date,
    timeFrom: "",
    timeTo: "",
    cargo: o.cargo,
    packages: o.packages.map((p) => ({ id: uid("p"), regime: p.regime, qty: p.qty })),
    comment: o.comment,
    fillerMode: filler ? "existing" : "",
    fillerId: filler ? filler.id : "",
    meetMode: meet && filler && meet.id === filler.id ? "self" : meet ? "other" : "",
    meetSub: meet && (!filler || meet.id !== filler.id) ? "existing" : "",
    meetId: meet && (!filler || meet.id !== filler.id) ? meet.id : "",
    addressId: o.addressId,
    hoursFrom: "",
    hoursTo: "",
    repeatOf: o.id,
  });
}

function onAction(el, event) {
  const action = el.dataset.action;
  if (action === "close") {
    if (event.target !== el && !el.classList.contains("x") && !el.classList.contains("btn") && !el.classList.contains("secondary")) {
      if (event.target.closest(".modal")) return;
    }
    if (state.modal === "sending") return;
    state.modal = null;
    state.periodOpen = false;
    render();
    return;
  }
  const stop = () => event.stopPropagation();
  if (action === "home" || (action === "nav" && el.dataset.id === "courier")) {
    state.view = "list";
    state.modal = null;
    render({ keepScroll: false });
    return;
  }
  if (action === "nav" || action === "toast") {
    showToast(el.dataset.msg || "В прототипе доступен раздел «Вызов курьера»");
    return;
  }
  if (action === "create") { openForm(); return; }
  if (action === "toggle-period") {
    state.periodOpen = !state.periodOpen;
    render();
    return;
  }
  if (action === "period") {
    state.period = el.dataset.id;
    state.periodOpen = false;
    render();
    return;
  }
  if (action === "sort") {
    if (state.sortKey === el.dataset.key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else { state.sortKey = el.dataset.key; state.sortDir = "desc"; }
    render();
    return;
  }
  if (action === "refresh") {
    state.refreshing = true;
    state.refreshLeft = 9 * 60 + 58;
    render();
    setTimeout(() => { state.refreshing = false; showToast("Список заявок обновлён"); }, 700);
    return;
  }
  if (action === "details") {
    if (event.target.closest("button")) return;
    state.activeId = el.dataset.id;
    state.modal = "details";
    render();
    return;
  }
  if (action === "ask-cancel") {
    stop();
    state.activeId = el.dataset.id;
    state.modal = "cancel";
    render();
    return;
  }
  if (action === "confirm-cancel") {
    const order = state.orders.find((o) => o.id === state.activeId);
    if (order?.cancelFails) {
      state.modal = "cancelError";
    } else if (order) {
      order.status = "cancelled";
      state.modal = null;
      showToast("Заявка отменена");
      return;
    }
    render();
    return;
  }
  if (action === "refresh-after-error") {
    const order = state.orders.find((o) => o.id === state.activeId);
    if (order && order.status === "new") order.status = "confirmed";
    state.modal = null;
    state.refreshLeft = 9 * 60 + 58;
    showToast("Статус заявки обновился: отмена уже недоступна");
    return;
  }
  if (action === "repeat") {
    stop();
    repeatOrder(el.dataset.id);
    return;
  }
  if (action === "permanent") { state.modal = "permanent"; render(); return; }
  if (action === "ask-standing") { state.standingId = el.dataset.id; state.modal = "standingConfirm"; render(); return; }
  if (action === "confirm-standing") {
    state.standing = state.standing.filter((s) => s.id !== state.standingId);
    state.modal = null;
    showToast("Постоянная заявка отменена");
    return;
  }
  if (action === "toggle-cal") { state.calOpen = !state.calOpen; state.openMenu = null; render(); return; }
  if (action === "cal-prev") {
    const c = state.calCursor || state.form.date;
    state.calCursor = new Date(c.getFullYear(), c.getMonth() - 1, 1);
    render();
    return;
  }
  if (action === "cal-next") {
    const c = state.calCursor || state.form.date;
    state.calCursor = new Date(c.getFullYear(), c.getMonth() + 1, 1);
    render();
    return;
  }
  if (action === "pick-date") {
    const date = new Date(Number(el.dataset.y), Number(el.dataset.m), Number(el.dataset.d));
    state.form.date = startOfDay(date);
    state.calOpen = false;
    const minStart = minStartMinutes(state.form.date);
    if (state.form.timeFrom && minutes(state.form.timeFrom) < minStart) {
      state.form.timeFrom = "";
      state.form.timeTo = "";
    }
    render();
    return;
  }
  if (action === "toggle-time") {
    state.openMenu = state.openMenu === el.dataset.which ? null : el.dataset.which;
    state.calOpen = false;
    render();
    return;
  }
  if (action === "pick-time") {
    const which = el.dataset.which;
    const value = el.dataset.value;
    state.form[which] = value;
    if (which === "timeFrom") {
      let to = minutes(value) + 180;
      if (to > 23 * 60 + 30) to = 23 * 60 + 30;
      state.form.timeTo = hhmm(to);
    }
    state.openMenu = null;
    render();
    return;
  }
  if (action === "cargo") {
    state.form.cargo = el.dataset.value;
    render();
    return;
  }
  if (action === "add-pack") {
    state.form.packages.push({ id: uid("p"), regime: "", qty: 1 });
    render();
    return;
  }
  if (action === "remove-pack") {
    state.form.packages = state.form.packages.filter((p) => p.id !== el.dataset.id);
    render();
    return;
  }
  if (action === "qty") {
    const row = state.form.packages.find((p) => p.id === el.dataset.id);
    if (row) row.qty = Math.max(1, Math.min(99, row.qty + Number(el.dataset.delta)));
    render();
    return;
  }
  if (action === "regime") return;
  if (action === "pick-filler") {
    state.form.fillerMode = "existing";
    state.form.fillerId = el.dataset.id;
    render();
    return;
  }
  if (action === "filler-new") {
    state.form.fillerMode = "new";
    state.form.fillerId = "";
    render();
    return;
  }
  if (action === "meet-self") { state.form.meetMode = "self"; state.form.meetSub = ""; render(); return; }
  if (action === "meet-other") { state.form.meetMode = "other"; render(); return; }
  if (action === "pick-meet") {
    state.form.meetMode = "other";
    state.form.meetSub = "existing";
    state.form.meetId = el.dataset.id;
    render();
    return;
  }
  if (action === "meet-new") {
    state.form.meetMode = "other";
    state.form.meetSub = "new";
    state.form.meetId = "";
    render();
    return;
  }
  if (action === "address") { state.form.addressId = el.dataset.id; render(); return; }
}

function bind() {
  document.body.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (el) {
      onAction(el, event);
      return;
    }
    if (!event.target.closest("[data-popover]") && !event.target.closest("[type='submit']")) {
      if (state.periodOpen || state.calOpen || state.openMenu) {
        state.periodOpen = false;
        state.calOpen = false;
        state.openMenu = null;
        render();
      }
    }
  });
  document.body.addEventListener("submit", (event) => {
    if (event.target.id !== "courier-form") return;
    event.preventDefault();
    submitForm();
  });
  document.body.addEventListener("change", (event) => {
    const el = event.target;
    if (el.dataset.action === "regime" && state.form) {
      const row = state.form.packages.find((p) => p.id === el.dataset.id);
      if (row) row.regime = el.value;
      render();
    }
  });
  document.body.addEventListener("input", (event) => {
    if (event.target.dataset.field && state.form) onField(event.target);
  });
  document.body.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modal && state.modal !== "sending") {
      state.modal = null;
      render();
    }
  });
  setInterval(() => {
    state.refreshLeft -= 1;
    if (state.refreshLeft < 0) state.refreshLeft = 10 * 60;
    const label = document.getElementById("refresh-label");
    if (label) label.textContent = `Обновится через ${fmtTimer(state.refreshLeft)}`;
  }, 1000);
}

seed();
bind();
render({ keepScroll: false });

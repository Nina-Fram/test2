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

const OFFICES = [
  { name: "TEST-KK-A1", group: "Москва — центр" },
  { name: "TEST-KK-A2", group: "Москва — центр" },
  { name: "TEST-KK-MSK", group: "Москва — север" },
];

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DOW_LONG = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const HOUR_PX = 48;
const PENDING_PREVIEW = 2;
const MONTH_PREVIEW = 3;

const SERIES = {
  id: "series-mon",
  weekday: 1,
  timeFrom: "12:00",
  timeTo: "15:00",
  schedule: "Каждый понедельник",
  created: null,
  cargo: "bio",
  packages: [
    { regime: "p2", qty: 1 },
    { regime: "m20", qty: 1 },
  ],
  comment: "",
  fillerName: "Кудряшов Владимир Андреевич",
  fillerPhone: "+7 (953) 510-44-66",
  meetName: "Кудряшов Владимир Андреевич",
  meetPhone: "+7 (953) 510-44-66",
  addressId: "a1",
  hoursFrom: "08:00",
  hoursTo: "20:00",
};

let seq = 1;
const uid = (p) => `${p}${seq++}`;

const state = {
  view: "list",
  modal: null,
  calMode: "week",
  anchor: startOfDay(new Date()),
  weekScroll: null,
  keepWeekScroll: true,
  pendingExpanded: false,
  refreshLeft: 9 * 60 + 58,
  refreshing: false,
  toast: "",
  toastTimer: null,
  orders: [],
  contacts: [
    { id: "c1", name: "Кудряшов Владимир Андреевич", phone: "+7 (953) 510-44-66" },
    { id: "c2", name: "Кукухин Петр Сергеевич", phone: "+7 (951) 212-33-44" },
  ],
  seriesCancelled: [],
  seriesStatus: {},
  activeId: null,
  dayIso: null,
  form: null,
  errors: {},
  showErrors: false,
  calOpen: false,
  calCursor: null,
  openMenu: null,
  headerMenu: null,
  officeName: "TEST-KK-A1",
  officeQuery: "",
  officeSection: "",
  successPayload: null,
  sendTimer: null,
};

function at(dayOffset, hh, mm) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
}
function onDay(base, hh, mm) {
  const d = new Date(base);
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
function mondayOf(d) {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseIso(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtDate(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; }
function fmtDateShort(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`; }
function fmtTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDateTime(d) { return `${fmtDate(d)} ${fmtTime(d)}`; }
function fmtVisitDay(d) { return `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
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
function addressText(id) { return addressById(id)?.text || "Не указан"; }
function dowIndex(d) { return (d.getDay() + 6) % 7; }

function seriesOccurrence(date) {
  const day = startOfDay(date);
  if (day.getDay() !== SERIES.weekday) return null;
  if (SERIES.created && day < startOfDay(SERIES.created)) return null;
  const key = isoDate(day);
  const visit = onDay(day, ...SERIES.timeFrom.split(":").map(Number));
  let status = "confirmed";
  if (state.seriesCancelled.includes(key)) status = "cancelled";
  else if (state.seriesStatus[key]) status = state.seriesStatus[key];
  return {
    id: `${SERIES.id}@${key}`,
    type: "standing",
    seriesId: SERIES.id,
    schedule: SERIES.schedule,
    created: SERIES.created,
    visit,
    visitTo: SERIES.timeTo,
    status,
    cargo: SERIES.cargo,
    packages: SERIES.packages,
    comment: SERIES.comment,
    fillerName: SERIES.fillerName,
    fillerPhone: SERIES.fillerPhone,
    meetName: SERIES.meetName,
    meetPhone: SERIES.meetPhone,
    addressId: SERIES.addressId,
    hoursFrom: SERIES.hoursFrom,
    hoursTo: SERIES.hoursTo,
    cancelFails: false,
  };
}

function visitsOn(date) {
  const day = startOfDay(date);
  const list = state.orders.filter((o) => isSameDay(o.visit, day));
  const series = seriesOccurrence(day);
  if (series) list.push(series);
  list.sort((a, b) => a.visit - b.visit || String(a.visitTo).localeCompare(String(b.visitTo)));
  return list;
}

function pendingVisits() {
  const from = addDays(startOfDay(new Date()), -30);
  const to = addDays(startOfDay(new Date()), 80);
  const list = state.orders.filter((o) => o.status === "new");
  let d = new Date(from);
  while (d.getDay() !== 1) d = addDays(d, 1);
  for (; d < to; d = addDays(d, 7)) {
    const v = seriesOccurrence(d);
    if (v && v.status === "new") list.push(v);
  }
  list.sort((a, b) => a.visit - b.visit);
  return list;
}

function findVisit(id) {
  if (!id) return null;
  if (String(id).startsWith(`${SERIES.id}@`)) return seriesOccurrence(parseIso(String(id).split("@")[1]));
  return state.orders.find((o) => o.id === id) || null;
}

function seed() {
  SERIES.created = at(-40, 11, 20);
  const today = startOfDay(new Date());
  const mon = mondayOf(today);
  state.anchor = today;
  state.seriesCancelled = [isoDate(mon)];
  state.seriesStatus = { [isoDate(addDays(mon, 7))]: "new" };
  const pack = (regime, qty) => ({ id: uid("p"), regime, qty });
  const row = (partial) => ({
    id: uid("o"),
    type: "once",
    cargo: "bio",
    packages: [pack("p2", 1), pack("m20", 1)],
    comment: "",
    fillerName: "Кудряшов Владимир Андреевич",
    fillerPhone: "+7 (953) 510-44-66",
    meetName: "Кудряшов Владимир Андреевич",
    meetPhone: "+7 (953) 510-44-66",
    addressId: "a1",
    hoursFrom: "09:00",
    hoursTo: "21:00",
    cancelFails: false,
    ...partial,
  });
  state.orders = [
    row({
      created: at(-8, 12, 0),
      visit: onDay(addDays(mon, -1), 10, 0),
      visitTo: "13:00",
      status: "confirmed",
      comment: "Прошлый день: заявка подтверждена и не закрыта",
    }),
    row({
      created: at(-4, 9, 10),
      visit: onDay(mon, 8, 0),
      visitTo: "10:00",
      status: "confirmed",
      comment: "Прошедший понедельник, курьер ещё не отмечен",
    }),
    row({
      created: at(-3, 15, 0),
      visit: onDay(mon, 16, 0),
      visitTo: "19:00",
      status: "done",
      comment: "Забор выполнен",
    }),
    row({
      created: at(-1, 18, 0),
      visit: onDay(today, 7, 0),
      visitTo: "08:30",
      status: "confirmed",
    }),
    row({
      created: at(0, 8, 10),
      visit: onDay(today, 9, 0),
      visitTo: "12:00",
      status: "new",
      comment: "Плановый забор",
    }),
    row({
      created: at(-1, 11, 20),
      visit: onDay(today, 14, 0),
      visitTo: "17:00",
      status: "confirmed",
      comment: "Повторный контейнер",
    }),
    row({
      created: at(0, 9, 40),
      visit: onDay(today, 21, 0),
      visitTo: "23:00",
      status: "new",
      comment: "Поздний выезд",
    }),
    row({
      created: at(-2, 15, 12),
      visit: onDay(addDays(mon, 3), 11, 0),
      visitTo: "14:00",
      status: "cancelled",
      comment: "Отменена клиентом",
    }),
    row({
      created: at(-1, 10, 0),
      visit: onDay(addDays(mon, 4), 8, 0),
      visitTo: "10:00",
      status: "confirmed",
    }),
    row({
      created: at(0, 7, 30),
      visit: onDay(addDays(mon, 4), 10, 30),
      visitTo: "13:30",
      status: "new",
      cancelFails: true,
      comment: "Статус может измениться до отмены",
    }),
    row({
      created: at(-1, 16, 0),
      visit: onDay(addDays(mon, 4), 14, 0),
      visitTo: "16:30",
      status: "confirmed",
    }),
    row({
      created: at(-1, 17, 5),
      visit: onDay(addDays(mon, 4), 19, 0),
      visitTo: "22:00",
      status: "confirmed",
      comment: "Поздний интервал",
    }),
    row({
      created: at(-5, 13, 0),
      visit: onDay(addDays(mon, 7), 9, 0),
      visitTo: "18:00",
      status: "confirmed",
      comment: "Разовый вызов в день постоянной заявки",
    }),
    row({
      created: at(0, 10, 5),
      visit: onDay(addDays(mon, 9), 11, 0),
      visitTo: "14:00",
      status: "new",
      comment: "Заявка на другой неделе",
    }),
  ];
}

function statusMeta(status) {
  if (status === "new") {
    return {
      text: "Ожидает подтверждения",
      short: "Ожидает",
      note: "Заявка принята и обрабатывается. Статус обновится автоматически после подтверждения.",
      icon: "clock",
    };
  }
  if (status === "confirmed") {
    return {
      text: "Подтверждена",
      short: "Подтверждена",
      note: "Заявка подтверждена. Ожидайте курьера в указанном окне приезда. Отмена возможна через сотрудника ИНВИТРО.",
      icon: "check",
    };
  }
  if (status === "done") {
    return {
      text: "Выполнена",
      short: "Выполнена",
      note: "Вызов выполнен.",
      icon: "done",
    };
  }
  return {
    text: "Отменена",
    short: "Отменена",
    note: "Вызов отменён.",
    icon: "cross",
  };
}

function typeLabel(v) { return v.type === "standing" ? "Постоянная" : "Разовая"; }

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
    meetSub: "",
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
  state.headerMenu = null;
  state.calCursor = new Date(state.form.date);
  state.modal = null;
  render({ keepScroll: false });
}

function icon(name, size = 18) {
  const common = `viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const paths = {
    logout: `<path d="M9 6H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/><path d="M13 16l4-4-4-4"/><path d="M17 12H9"/>`,
    bell: `<path d="M6.5 9a5.5 5.5 0 1 1 11 0c0 6 2 6.5 2 8.5h-15c0-2 2-2.5 2-8.5"/><path d="M10 20a2 2 0 0 0 4 0"/>`,
    refresh: `<path d="M20 12a8 8 0 1 1-2.2-5.5"/><path d="M20 4v5h-5"/>`,
    chevron: `<path d="M6 9l6 6 6-6"/>`,
    left: `<path d="M15 6l-6 6 6 6"/>`,
    right: `<path d="M9 6l6 6-6 6"/>`,
    cal: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`,
    trash: `<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/>`,
    check: `<path d="M5 12.5l4.2 4.2L19 7.5"/>`,
    done: `<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.3 2.3 4.7-5"/>`,
    cross: `<path d="M7 7l10 10M17 7L7 17"/>`,
    clock: `<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>`,
    repeat: `<path d="M17 2l4 4-4 4"/><path d="M21 6H9a6 6 0 0 0-6 6"/><path d="M7 22l-4-4 4-4"/><path d="M3 18h12a6 6 0 0 0 6-6"/>`,
    box: `<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>`,
    mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>`,
    heart: `<path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/>`,
  };
  return `<svg ${common} aria-hidden="true">${paths[name] || ""}</svg>`;
}

function showToast(text) {
  state.toast = text;
  clearTimeout(state.toastTimer);
  render();
  state.toastTimer = setTimeout(() => {
    state.toast = "";
    const el = document.querySelector(".toast");
    if (el) el.remove();
  }, 2600);
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

function intervalWarnings(form) {
  const notes = [];
  const same = isSameDay(form.date, new Date());
  if (same && new Date().getHours() >= 13) {
    notes.push("Обратите внимание, что заявка оформляется позже установленного срока. Просьба контролировать статус заявки.");
  }
  if (same && minStartMinutes(form.date) >= 24 * 60) {
    notes.push("На сегодня свободных интервалов нет — курьер может приехать не раньше чем через 3 часа. Выберите другую дату.");
  }
  if (same && form.cargo === "bio" && form.packages.some((p) => p.regime === "p35")) {
    notes.push("Термоконтейнеры (+35…+37 °C) рекомендуем заказывать на следующий день. День в день доставка не гарантируется.");
  }
  if (form.timeFrom && form.timeTo) {
    const span = minutes(form.timeTo) - minutes(form.timeFrom);
    if (same && span > 0 && span < 180) {
      notes.push("Просьба обратить внимание, выбран нестандартный временной интервал. Возможны временные отклонения приезда курьера.");
    }
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
  return visitsOn(form.date).some((o) => {
    if (o.status !== "new" && o.status !== "confirmed") return false;
    if (o.addressId !== form.addressId) return false;
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
    if (form.meetSub === "new") {
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
      type: "once",
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
    state.anchor = startOfDay(visit);
    state.weekScroll = Math.max(0, (vh - 1) * HOUR_PX);
    state.keepWeekScroll = false;
    state.pendingExpanded = true;
    render({ keepScroll: false });
  }, 2000);
}

function header() {
  const pending = pendingVisits();
  const tabs = [
    ["results", "Результаты"],
    ["checkout", "Оформление заказа"],
    ["orders", "Заказы"],
    ["courier", "Вызов курьера"],
    ["supplies", "Расходные материалы"],
    ["lab", "Лаборатория"],
    ["pre", "Предзаказы"],
  ];
  const courierOpen = state.headerMenu === "courier";
  const suppliesOpen = state.headerMenu === "supplies";
  const bellOpen = state.headerMenu === "bell";
  const tab = ([id, label]) => {
    const active = id === "courier";
    const open = state.headerMenu === id;
    const badge = id === "lab" ? `<span class="tab-badge">68</span>` : "";
    const menu = id === "courier" || id === "supplies";
    return `<div class="tab-wrap">
      <button type="button" class="tab ${active ? "active" : ""} ${open ? "open" : ""}" data-action="nav" data-id="${id}">${label}${badge}</button>
      ${id === "courier" && courierOpen ? `<div class="drop" data-popover>
        <button type="button" data-action="menu-go" data-id="history">История заявок</button>
        <button type="button" data-action="menu-go" data-id="new">Новая заявка</button>
      </div>` : ""}
      ${id === "supplies" && suppliesOpen ? `<div class="drop" data-popover>
        <button type="button" data-action="menu-go" data-id="supplies-history">История заказов</button>
        <button type="button" data-action="menu-go" data-id="supplies-new">Новый заказ</button>
      </div>` : ""}
    </div>`;
  };
  const bellItems = pending.length
    ? pending.map((v) => `<button type="button" class="bell-item" data-action="details" data-id="${v.id}">
        <span>${esc(fmtVisitDay(v.visit))}</span>
        <small>${fmtTime(v.visit)}–${v.visitTo} · ${esc(typeLabel(v))} · Ожидает подтверждения</small>
      </button>`).join("")
    : `<div class="empty-note">Нет новых уведомлений</div>`;
  return `
    <header class="lk-header">
      <div class="lk-bar">
        <button type="button" class="brand" data-action="home" aria-label="Личный кабинет ИНВИТРО">
          <img class="logo-mark" src="assets/logo.svg" width="133" height="24" alt="INVITRO" />
          <span class="brand-sep"></span>
          <span class="brand-sub">Личный кабинет</span>
        </button>
        <div class="lk-actions">
          <button type="button" class="ghost-btn" data-action="open-office">${esc(state.officeName)}</button>
          <button type="button" class="ghost-btn" data-action="open-staff">Сотрудники</button>
          <button type="button" class="ghost-btn" data-action="open-profile">Constantinopolitan</button>
          <div class="tab-wrap">
            <button type="button" class="icon-sq" data-action="toggle-bell" aria-label="Уведомления">
              ${icon("bell", 20)}
              ${pending.length ? `<span class="bell-dot"></span>` : ""}
            </button>
            ${bellOpen ? `<div class="drop right" data-popover>${bellItems}</div>` : ""}
          </div>
          <button type="button" class="icon-sq" data-action="open-logout" aria-label="Выйти">${icon("logout", 20)}</button>
        </div>
      </div>
      <nav class="lk-tabs" aria-label="Разделы">${tabs.map(tab).join("")}</nav>
    </header>`;
}

function footer() {
  return `<footer class="lk-footer"><div class="container">© 2011-2026, ИНВИТРО</div></footer>`;
}

function periodLabel() {
  if (state.calMode === "month") return `${MONTHS_NOM[state.anchor.getMonth()]} ${state.anchor.getFullYear()}`;
  const start = mondayOf(state.anchor);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  const yearBit = start.getFullYear() === end.getFullYear() ? "" : ` ${start.getFullYear()}`;
  return `${start.getDate()} ${MONTHS[start.getMonth()]}${yearBit} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

function placeEvents(visits) {
  const items = visits.map((v) => {
    const start = v.visit.getHours() * 60 + v.visit.getMinutes();
    let end = minutes(v.visitTo);
    if (end <= start) end = Math.min(24 * 60, start + 30);
    return { v, start, end };
  }).sort((a, b) => a.start - b.start || b.end - a.end);
  const laneEnds = [];
  items.forEach((it) => {
    let lane = 0;
    while (laneEnds[lane] > it.start) lane += 1;
    laneEnds[lane] = it.end;
    it.lane = lane;
  });
  const clusters = [];
  let group = [];
  let groupEnd = -1;
  items.forEach((it) => {
    if (!group.length || it.start < groupEnd) {
      group.push(it);
      groupEnd = Math.max(groupEnd, it.end);
    } else {
      clusters.push(group);
      group = [it];
      groupEnd = it.end;
    }
  });
  if (group.length) clusters.push(group);
  clusters.forEach((g) => {
    const n = Math.max(...g.map((i) => i.lane)) + 1;
    g.forEach((i) => { i.lanes = n; });
  });
  return items;
}

function eventButton(it, compact) {
  const v = it.v;
  const st = statusMeta(v.status);
  const when = `${fmtTime(v.visit)}–${v.visitTo}`;
  const type = typeLabel(v);
  const label = `${when}, ${type}, ${st.text}. Окно приезда курьера`;
  if (compact) {
    return `<button type="button" class="m-card status-${v.status}" data-action="details" data-id="${v.id}" data-status="${v.status}" data-type="${v.type}" title="${esc(label)}" aria-label="${esc(label)}">
      <span class="t ${v.status === "cancelled" ? "strike" : ""}">${when}</span>
      <span class="s">${v.type === "standing" ? icon("repeat", 12) : ""}${esc(type)} · ${icon(st.icon, 12)} ${esc(st.short)}</span>
    </button>`;
  }
  const height = Math.max(22, ((it.end - it.start) / 60) * HOUR_PX - 2);
  const width = 100 / it.lanes;
  const left = it.lane * width;
  const gutter = it.lanes > 1 ? 4 : 3;
  const style = `top:${(it.start / 60) * HOUR_PX}px;height:${height}px;left:calc(${left}% + ${it.lane ? 2 : 1}px);width:calc(${width}% - ${gutter}px);z-index:${it.lane + 1}`;
  const statusWord = st.short === "Подтверждена" ? "Подтвер&shy;ждена" : esc(st.short);
  const bits = [`<span class="when ${v.status === "cancelled" ? "strike" : ""}">${fmtTime(v.visit)}–<wbr>${v.visitTo}</span>`];
  if (height >= 40) bits.push(`<span class="meta">${v.type === "standing" ? icon("repeat", 12) : ""}${esc(type)}</span>`);
  if (height >= 56) bits.push(`<span class="st">${icon(st.icon, 12)} ${statusWord}</span>`);
  if (height >= 88) bits.push(`<span class="win">окно приезда</span>`);
  return `<button type="button" class="event status-${v.status}" style="${style}" data-action="details" data-id="${v.id}" data-status="${v.status}" data-type="${v.type}" title="${esc(label)}" aria-label="${esc(label)}">${bits.join("")}</button>`;
}

function weekInitialScroll(visits) {
  if (!visits.length) return 8 * HOUR_PX;
  const earliest = Math.min(...visits.map((v) => v.visit.getHours() + v.visit.getMinutes() / 60));
  const hour = earliest < 8 ? Math.max(0, Math.floor(earliest) - 1) : 8;
  return hour * HOUR_PX;
}

function weekView() {
  const start = mondayOf(state.anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  const grouped = days.map((d) => visitsOn(d));
  const initial = weekInitialScroll(grouped.flat());
  const head = days.map((d) => {
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = isSameDay(d, today);
    return `<div class="dh ${isToday ? "today" : ""} ${weekend ? "weekend" : ""}"><span class="dn">${DOW[dowIndex(d)]}</span><span class="dd">${d.getDate()}</span></div>`;
  }).join("");
  const hours = Array.from({ length: 24 }, (_, h) => `<div class="hour-label">${pad(h)}:00</div>`).join("");
  const cols = days.map((d, i) => {
    const placed = placeEvents(grouped[i]);
    return `<div class="day-col ${isSameDay(d, today) ? "today" : ""}" data-date="${isoDate(d)}">${placed.map((it) => eventButton(it, false)).join("")}</div>`;
  }).join("");
  return `<div class="week-scroll" data-initial-scroll="${initial}">
    <div class="week-head"><div></div>${head}</div>
    <div class="week-canvas"><div>${hours}</div>${cols}</div>
  </div>`;
}

function monthCells(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(first, -dowIndex(first));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const sixth = cells.slice(35).some((d) => d.getMonth() === anchor.getMonth());
  return sixth ? cells : cells.slice(0, 35);
}

function monthView() {
  const today = new Date();
  const cells = monthCells(state.anchor);
  const head = DOW.map((d) => `<span>${d}</span>`).join("");
  const body = cells.map((d) => {
    const visits = visitsOn(d);
    const shown = visits.slice(0, MONTH_PREVIEW);
    const more = visits.length - shown.length;
    const cards = shown.map((v) => eventButton({ v }, true)).join("");
    const moreBtn = more > 0 ? `<button type="button" class="more-btn" data-action="day-more" data-date="${isoDate(d)}">Ещё ${more}</button>` : "";
    const out = d.getMonth() !== state.anchor.getMonth();
    return `<div class="month-cell ${out ? "out" : ""} ${isSameDay(d, today) ? "today" : ""}">
      <div class="num">${d.getDate()}</div>
      ${cards}${moreBtn}
    </div>`;
  }).join("");
  return `<div class="month-wrap"><div class="month"><div class="month-head">${head}</div><div class="month-grid">${body}</div></div></div>`;
}

function scheduleView() {
  const pending = pendingVisits();
  const shown = state.pendingExpanded ? pending : pending.slice(0, PENDING_PREVIEW);
  const hidden = pending.length - shown.length;
  const pendingBlock = pending.length ? `
    <section class="panel wait-list" aria-label="Ожидают подтверждения">
      <h2 class="wait-title">Ожидают подтверждения <span class="count">${pending.length}</span></h2>
      <div class="cells">
        ${shown.map((v) => `<button type="button" class="cell" data-action="details" data-id="${v.id}">
          <span class="cell-ico">${icon(v.type === "standing" ? "repeat" : "clock", 24)}</span>
          <span class="cell-body">
            <span class="cell-label">${esc(fmtVisitDay(v.visit))} · ${fmtTime(v.visit)}–${v.visitTo}</span>
            <span class="cell-caption">${esc(typeLabel(v))} · Ожидает подтверждения</span>
          </span>
          <span class="cell-go">${icon("right", 24)}</span>
        </button>`).join("")}
      </div>
      ${hidden > 0 ? `<button type="button" class="link-btn" data-action="toggle-pending">Ещё ${hidden}</button>` : ""}
      ${state.pendingExpanded && pending.length > PENDING_PREVIEW ? `<button type="button" class="link-btn" data-action="toggle-pending">Свернуть</button>` : ""}
    </section>` : "";
  return `
    <div class="page-head">
      <h1 class="page-title">Заявки</h1>
      <button type="button" class="btn" data-action="create">Вызвать курьера</button>
    </div>
    ${pendingBlock}
    <section class="panel schedule" aria-label="Расписание заявок">
    <div class="cal-tools">
      <div class="seg" role="group" aria-label="Режим календаря">
        <button type="button" data-action="cal-mode" data-mode="week" aria-pressed="${state.calMode === "week"}">Неделя</button>
        <button type="button" data-action="cal-mode" data-mode="month" aria-pressed="${state.calMode === "month"}">Месяц</button>
      </div>
      <div class="cal-nav">
        <button type="button" class="icon-sq sm" data-action="cal-move" data-dir="-1" aria-label="Предыдущий период">${icon("left", 18)}</button>
        <div class="period-label">${periodLabel()}</div>
        <button type="button" class="icon-sq sm" data-action="cal-move" data-dir="1" aria-label="Следующий период">${icon("right", 18)}</button>
      </div>
      <button type="button" class="btn light slim" data-action="cal-today">Сегодня</button>
      <span class="refresh-note"><span id="refresh-label">Обновится через ${fmtTimer(state.refreshLeft)}</span>
        <button type="button" class="icon-btn ${state.refreshing ? "spin" : ""}" data-action="refresh" aria-label="Обновить список">${icon("refresh")}</button>
      </span>
    </div>
    <p class="window-note">Интервал на календаре — окно ожидаемого приезда курьера, а не длительность его работы у клиента.</p>
    ${state.calMode === "week" ? weekView() : monthView()}
    </section>`;
}

function settingsView() {
  return `
    <div class="settings">
      <aside class="set-side">
        <h2>Настройки</h2>
        <button type="button" class="set-link active">Управление кабинетом</button>
        <button type="button" class="set-link" data-action="open-staff">Сотрудники</button>
        <button type="button" class="set-link" data-action="open-office">Группы офисов</button>
      </aside>
      <section class="set-card">
        <h2>Сменить пароль</h2>
        <div class="set-grid">
          <label for="old-pass">Старый пароль:</label>
          <input id="old-pass" type="password" autocomplete="off" />
          <label for="new-pass">Новый пароль:</label>
          <input id="new-pass" type="password" autocomplete="new-password" />
          <label for="rep-pass">Повторите пароль:</label>
          <input id="rep-pass" type="password" autocomplete="new-password" />
        </div>
        <button type="button" class="btn" data-action="toast" data-msg="В прототипе учётные данные не меняются">Сохранить</button>
        <h2>Сменить email для входа</h2>
        <p class="set-email"><span style="display:inline-block;width:180px">Текущий email:</span> amazing@horse.com</p>
        <div class="set-grid">
          <label for="new-mail">Новый email:</label>
          <input id="new-mail" type="email" autocomplete="off" />
        </div>
        <button type="button" class="btn" data-action="toast" data-msg="В прототипе учётные данные не меняются">Отправить</button>
      </section>
    </div>`;
}

function choice(checked, label, action) {
  return `<button type="button" class="choice" role="radio" aria-checked="${checked ? "true" : "false"}" data-action="${action.action}" ${action.attrs || ""}>
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

function datePicker(form) {
  const cursor = state.calCursor || form.date;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = dowIndex(first);
  const days = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());
  const monthLabel = first.toLocaleString("ru-RU", { month: "long", year: "numeric" });
  const canPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  let cells = DOW.map((d) => `<span>${d}</span>`).join("");
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
      <button class="icon-btn" type="button" data-action="cal-prev" ${canPrev ? "" : "disabled"} aria-label="Предыдущий месяц">${icon("left")}</button>
      <span style="text-transform:capitalize">${monthLabel}</span>
      <button class="icon-btn" type="button" data-action="cal-next" aria-label="Следующий месяц">${icon("right")}</button>
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
  return `<div class="grow" style="position:relative">
    <button type="button" class="control ${value ? "" : "placeholder"} ${open ? "open" : ""}" data-action="toggle-time" data-which="${which}" data-popover>
      <span class="prefix">${which === "timeFrom" ? "С" : "До"}</span>
      <span>${value || "Выберите время"}</span>
      <span style="margin-left:auto;color:#647893">${icon("chevron")}</span>
    </button>
    ${open ? `<div class="popover time-menu" data-popover>${options.map((t) => `<button type="button" data-action="pick-time" data-which="${which}" data-value="${t}" ${t === value ? 'aria-current="true"' : ""}>${t}</button>`).join("") || `<div class="help" style="padding:8px">Нет доступных слотов</div>`}</div>` : ""}
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
              ${state.calOpen ? datePicker(f) : ""}
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

function packLines(order) {
  if (order.cargo === "other") return "Другое, без термоконтейнера";
  if (!order.packages || !order.packages.length) return "Не указана";
  return order.packages.map((p) => `ТМ-8, ${esc(regimeLabel(p.regime))}, ${p.qty} шт.`).join("<br>");
}

function detailsModal(order) {
  const st = statusMeta(order.status);
  const standing = order.type === "standing";
  const canCancel = order.status === "new";
  const canRepeat = !standing && (order.status === "cancelled" || order.status === "done");
  const note = standing
    ? "Редактирование созданной заявки недоступно. Отмена здесь касается только выбранного приезда и не меняет расписание."
    : "Чтобы внести изменения, отмените текущую заявку и создайте новую. Редактирование созданных заявок недоступно.";
  const cancelLabel = standing ? "Отменить этот приезд" : "Отменить заявку";
  return `
    <div class="modal wide left" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 id="dlg-title">Информация о заявке</h2>
      <div class="status-banner status-${order.status}">
        <span>${icon(st.icon, 20)}</span>
        <div><strong>${st.text}</strong><p>${st.note}</p></div>
      </div>
      <dl class="defs">
        <dt>Тип заявки</dt><dd>${standing ? `${icon("repeat", 14)} Постоянная` : "Разовая"}</dd>
        ${standing ? `<dt>Повторение</dt><dd>${esc(order.schedule)}</dd>` : ""}
        <dt>Дата и время оформления</dt><dd>${fmtDateTime(order.created)}</dd>
        <dt>Дата и время визита курьера</dt><dd>${fmtDate(order.visit)} ${fmtTime(order.visit)} – ${order.visitTo}<br><span class="help">Окно ожидаемого приезда</span></dd>
        <dt>Характер груза</dt><dd>${order.cargo === "bio" ? "Биоматериал" : "Другое"}</dd>
        <dt>Тара и контейнеры</dt><dd>${packLines(order)}</dd>
        <dt>Кто оформил</dt><dd>${esc(order.fillerName)}</dd>
        <dt>Телефон оформившего</dt><dd>${esc(order.fillerPhone)}</dd>
        <dt>Адрес</dt><dd>${esc(addressText(order.addressId))}</dd>
        <dt>Кто встречает курьера</dt><dd>${esc(order.meetName)}</dd>
        <dt>Телефон встречающего</dt><dd>${esc(order.meetPhone)}</dd>
        <dt>Комментарий</dt><dd>${order.comment ? esc(order.comment) : "Не указан"}</dd>
        <dt>Время работы медицинского центра</dt><dd>${order.hoursFrom} – ${order.hoursTo}</dd>
      </dl>
      <div class="note">${note}</div>
      <div class="modal-actions">
        ${canCancel ? `<button type="button" class="btn" data-action="ask-cancel" data-id="${order.id}">${cancelLabel}</button>` : ""}
        ${canRepeat ? `<button type="button" class="btn" data-action="repeat" data-id="${order.id}">Повторить</button>` : ""}
        <button type="button" class="btn secondary" data-action="close">Закрыть</button>
      </div>
    </div>`;
}

function officeModal() {
  const q = state.officeQuery.trim().toLowerCase();
  const match = (name) => !q || name.toLowerCase().includes(q);
  const offices = OFFICES.filter((o) => match(o.name));
  const groups = [...new Set(OFFICES.map((o) => o.group))].filter((g) => {
    if (!q) return true;
    return g.toLowerCase().includes(q) || OFFICES.some((o) => o.group === g && match(o.name));
  });
  const openOffices = state.officeSection === "offices" || q;
  const openGroups = state.officeSection === "groups" || q;
  const officeButtons = offices.map((o) => `<button type="button" class="item" data-action="pick-office" data-name="${esc(o.name)}" ${state.officeName === o.name ? 'aria-current="true"' : ""}>${esc(o.name)}</button>`).join("") || `<div class="help" style="padding:0 12px 10px">Ничего не найдено</div>`;
  const groupButtons = groups.map((g) => {
    const items = OFFICES.filter((o) => o.group === g && (match(o.name) || g.toLowerCase().includes(q)));
    return `<div style="padding:0 8px 8px"><div class="help" style="margin:4px 8px">${esc(g)}</div>${items.map((o) => `<button type="button" class="item" data-action="pick-office" data-name="${esc(o.name)}" ${state.officeName === o.name ? 'aria-current="true"' : ""}>${esc(o.name)}</button>`).join("")}</div>`;
  }).join("") || `<div class="help" style="padding:0 12px 10px">Ничего не найдено</div>`;
  return `<div class="overlay" data-action="close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="office-title">
    <button class="x" data-action="close" aria-label="Закрыть">×</button>
    <h2 id="office-title" style="text-align:left;font-size:24px">Смена медофиса</h2>
    <input class="search" data-field="officeQuery" value="${esc(state.officeQuery)}" placeholder="Поиск" aria-label="Поиск" />
    <div class="acc">
      <button type="button" class="acc-head" data-action="acc" data-section="offices">Медофисы ${icon(openOffices ? "chevron" : "right", 16)}</button>
      ${openOffices ? officeButtons : ""}
    </div>
    <div class="acc">
      <button type="button" class="acc-head" data-action="acc" data-section="groups">Группы медофисов ${icon(openGroups ? "chevron" : "right", 16)}</button>
      ${openGroups ? groupButtons : ""}
    </div>
  </div></div>`;
}

function staffModal() {
  const rows = Array.from({ length: 8 }, () => `
    <div class="person">
      <div><b>Наталья Лаврентьева</b><span>nlavrenteva@invitro.ru</span></div>
      <button type="button" class="mail-btn" data-action="mail" aria-label="Написать сотруднику">${icon("mail", 16)}</button>
    </div>`).join("");
  return `<div class="overlay" data-action="close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="staff-title">
    <button class="x" data-action="close" aria-label="Закрыть">×</button>
    <h2 id="staff-title" style="text-align:left;font-size:24px;margin-bottom:8px">Сотрудники</h2>
    <p class="org">TEST-KK-MSK / Общество с ограниченной ответственностью «Независимая лаборатория ИНВИТРО»</p>
    ${rows}
  </div></div>`;
}

function modalHtml() {
  if (!state.modal) return "";
  if (state.modal === "details") {
    const order = findVisit(state.activeId);
    if (!order) return "";
    return `<div class="overlay" data-action="close">${detailsModal(order)}</div>`;
  }
  if (state.modal === "day") {
    const date = parseIso(state.dayIso);
    const visits = visitsOn(date);
    const items = visits.map((v) => {
      const st = statusMeta(v.status);
      return `<button type="button" data-action="details" data-id="${v.id}">
        <b>${fmtTime(v.visit)}–${v.visitTo}</b>
        <span>${v.type === "standing" ? icon("repeat", 14) : ""} ${esc(typeLabel(v))} · ${icon(st.icon, 14)} ${esc(st.text)}</span>
        <span class="help">Окно приезда</span>
      </button>`;
    }).join("");
    return `<div class="overlay" data-action="close"><div class="modal left" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 style="font-size:24px">Заявки ${fmtVisitDay(date)}</h2>
      <div class="day-list">${items || `<div class="help">Заявок нет</div>`}</div>
    </div></div>`;
  }
  if (state.modal === "cancel") {
    const order = findVisit(state.activeId);
    if (!order) return "";
    const standing = order.type === "standing";
    return `<div class="overlay" data-action="close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 id="cancel-title">${standing ? "Отменить этот приезд?" : "Отменить заявку?"}</h2>
      <p class="lead">${fmtVisitDay(order.visit)}<br>${fmtTime(order.visit)}–${order.visitTo}</p>
      ${standing ? `<p class="lead">Остальные приезды по постоянной заявке сохранятся.</p>` : ""}
      <div class="modal-actions">
        <button type="button" class="btn secondary" data-action="close">Не отменять</button>
        <button type="button" class="btn" data-action="confirm-cancel" data-autofocus>${standing ? "Отменить приезд" : "Отменить заявку"}</button>
      </div>
    </div></div>`;
  }
  if (state.modal === "cancelError") {
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 style="color:#e07826">Не удалось отменить заявку</h2>
      <p class="lead">Возможно, статус заявки уже изменился. Обновите страницу.</p>
      <div class="modal-actions"><button type="button" class="btn" data-action="refresh-after-error" data-autofocus>Обновить страницу</button></div>
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
      <p class="lead">Ожидайте курьера ${fmtDate(o.visit)} г.<br>Желаемое время: с ${fmtTime(o.visit)} до ${o.visitTo}<br>По адресу: ${esc(addressText(o.addressId))}</p>
      <div class="note">Чтобы внести изменения, отмените текущую заявку и создайте новую. Вы можете самостоятельно отменить заявку до её подтверждения.</div>
      <div class="modal-actions"><button type="button" class="btn" data-action="close" data-autofocus>Отлично</button></div>
    </div></div>`;
  }
  if (state.modal === "duplicate") {
    return `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">
      <button class="x" data-action="close" aria-label="Закрыть">×</button>
      <h2 style="color:#e07826">К сожалению, заявка не может быть создана</h2>
      <p class="lead">В выбранное время уже есть запись.<br>Выберите другое время или дату.</p>
      <div class="modal-actions"><button type="button" class="btn" data-action="close" data-autofocus>Назад</button></div>
    </div></div>`;
  }
  if (state.modal === "logout") {
    return `<div class="overlay" data-action="close"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="logout-title">
      <div class="heart">${icon("heart", 26)}</div>
      <h2 id="logout-title">Уже уходите?</h2>
      <p class="lead">Возвращайтесь в любое время</p>
      <div class="modal-actions">
        <button type="button" class="btn light" data-action="close">Остаться</button>
        <button type="button" class="btn" data-action="logout-yes">Выйти</button>
      </div>
    </div></div>`;
  }
  if (state.modal === "staff") return staffModal();
  if (state.modal === "office") return officeModal();
  return "";
}

function mainView() {
  if (state.view === "form") return formView();
  if (state.view === "settings") return settingsView();
  return scheduleView();
}

function render({ keepScroll = true } = {}) {
  const scroller = document.querySelector(".week-scroll");
  if (scroller && state.keepWeekScroll) state.weekScroll = scroller.scrollTop;
  state.keepWeekScroll = true;
  const y = window.scrollY;
  const focus = document.activeElement;
  const field = focus && focus.dataset ? focus.dataset.field : null;
  const fieldId = focus && focus.dataset ? focus.dataset.id : null;
  document.getElementById("app").innerHTML = `
    ${header()}
    <main class="page"><div class="container">${mainView()}</div></main>
    ${footer()}
    ${modalHtml()}
    ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""}`;
  if (keepScroll) window.scrollTo(0, y);
  const next = document.querySelector(".week-scroll");
  if (next) {
    if (state.weekScroll == null) state.weekScroll = Number(next.dataset.initialScroll || 0);
    next.scrollTop = state.weekScroll;
  }
  if (field === "officeQuery") {
    const el = document.querySelector('[data-field="officeQuery"]');
    if (el) {
      el.focus();
      const len = el.value.length;
      try { el.setSelectionRange(len, len); } catch (e) { /* ignore */ }
    }
  } else if (field) {
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
  if (!o || o.type !== "once" || (o.status !== "cancelled" && o.status !== "done")) return;
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

function movePeriod(dir) {
  if (state.calMode === "week") {
    state.anchor = addDays(state.anchor, 7 * dir);
  } else {
    const a = state.anchor;
    const next = new Date(a.getFullYear(), a.getMonth() + dir, 1);
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    state.anchor = new Date(next.getFullYear(), next.getMonth(), Math.min(a.getDate(), last));
  }
  state.weekScroll = null;
  state.keepWeekScroll = false;
}

function onAction(el, event) {
  const action = el.dataset.action;
  if (action === "close") {
    if (event.target !== el && !el.classList.contains("x") && !el.classList.contains("btn") && !el.classList.contains("secondary") && !el.classList.contains("light")) {
      if (event.target.closest(".modal")) return;
    }
    if (state.modal === "sending") return;
    state.modal = null;
    render();
    return;
  }
  if (action === "home" || (action === "menu-go" && el.dataset.id === "history")) {
    state.view = "list";
    state.modal = null;
    state.headerMenu = null;
    render({ keepScroll: false });
    return;
  }
  if (action === "nav") {
    const id = el.dataset.id;
    if (id === "courier" || id === "supplies") {
      state.headerMenu = state.headerMenu === id ? null : id;
      render();
      return;
    }
    state.headerMenu = null;
    showToast("В прототипе открыт раздел «Вызов курьера»");
    return;
  }
  if (action === "menu-go") {
    state.headerMenu = null;
    if (el.dataset.id === "new") { openForm(); return; }
    showToast("Раздел расходных материалов в этот прототип не входит");
    return;
  }
  if (action === "toast") {
    showToast(el.dataset.msg || "В прототипе открыт раздел «Вызов курьера»");
    return;
  }
  if (action === "toggle-bell") {
    state.headerMenu = state.headerMenu === "bell" ? null : "bell";
    render();
    return;
  }
  if (action === "open-profile") {
    state.view = "settings";
    state.modal = null;
    state.headerMenu = null;
    render({ keepScroll: false });
    return;
  }
  if (action === "open-staff") { state.headerMenu = null; state.modal = "staff"; render(); return; }
  if (action === "open-office") { state.headerMenu = null; state.modal = "office"; render(); return; }
  if (action === "open-logout") { state.headerMenu = null; state.modal = "logout"; render(); return; }
  if (action === "logout-yes") {
    state.modal = null;
    showToast("Выход в прототипе не выполняется");
    return;
  }
  if (action === "mail") { showToast("Отправка письма в прототипе не выполняется"); return; }
  if (action === "acc") {
    state.officeSection = state.officeSection === el.dataset.section ? "" : el.dataset.section;
    render();
    return;
  }
  if (action === "pick-office") {
    state.officeName = el.dataset.name;
    state.modal = null;
    state.officeQuery = "";
    render();
    return;
  }
  if (action === "create") { openForm(); return; }
  if (action === "cal-mode") {
    state.calMode = el.dataset.mode;
    render();
    return;
  }
  if (action === "cal-move") { movePeriod(Number(el.dataset.dir)); render(); return; }
  if (action === "cal-today") {
    state.anchor = startOfDay(new Date());
    state.weekScroll = null;
    state.keepWeekScroll = false;
    render();
    return;
  }
  if (action === "toggle-pending") { state.pendingExpanded = !state.pendingExpanded; render(); return; }
  if (action === "day-more") {
    state.dayIso = el.dataset.date;
    state.modal = "day";
    state.headerMenu = null;
    render();
    return;
  }
  if (action === "refresh") {
    state.refreshing = true;
    state.refreshLeft = 9 * 60 + 58;
    render();
    setTimeout(() => { state.refreshing = false; showToast("Данные на экране обновлены"); }, 700);
    return;
  }
  if (action === "details") {
    state.activeId = el.dataset.id;
    state.modal = "details";
    state.headerMenu = null;
    render();
    return;
  }
  if (action === "ask-cancel") {
    event.stopPropagation();
    state.activeId = el.dataset.id;
    state.modal = "cancel";
    render();
    return;
  }
  if (action === "confirm-cancel") {
    const visit = findVisit(state.activeId);
    if (visit?.cancelFails) {
      state.modal = "cancelError";
      render();
      return;
    }
    if (visit?.type === "standing") {
      const key = isoDate(visit.visit);
      if (!state.seriesCancelled.includes(key)) state.seriesCancelled.push(key);
      state.modal = null;
      showToast("Приезд отменён. Остальные приезды по постоянной заявке сохранены.");
      return;
    }
    if (visit) {
      visit.status = "cancelled";
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
    event.stopPropagation();
    repeatOrder(el.dataset.id);
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
  if (action === "cargo") { state.form.cargo = el.dataset.value; render(); return; }
  if (action === "add-pack") { state.form.packages.push({ id: uid("p"), regime: "", qty: 1 }); render(); return; }
  if (action === "remove-pack") { state.form.packages = state.form.packages.filter((p) => p.id !== el.dataset.id); render(); return; }
  if (action === "qty") {
    const row = state.form.packages.find((p) => p.id === el.dataset.id);
    if (row) row.qty = Math.max(1, Math.min(99, row.qty + Number(el.dataset.delta)));
    render();
    return;
  }
  if (action === "regime") return;
  if (action === "pick-filler") { state.form.fillerMode = "existing"; state.form.fillerId = el.dataset.id; render(); return; }
  if (action === "filler-new") { state.form.fillerMode = "new"; state.form.fillerId = ""; render(); return; }
  if (action === "meet-self") { state.form.meetMode = "self"; state.form.meetSub = ""; render(); return; }
  if (action === "meet-other") { state.form.meetMode = "other"; render(); return; }
  if (action === "pick-meet") {
    state.form.meetMode = "other";
    state.form.meetSub = "existing";
    state.form.meetId = el.dataset.id;
    render();
    return;
  }
  if (action === "meet-new") { state.form.meetMode = "other"; state.form.meetSub = "new"; state.form.meetId = ""; render(); return; }
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
      if (state.calOpen || state.openMenu || state.headerMenu) {
        state.calOpen = false;
        state.openMenu = null;
        state.headerMenu = null;
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
    if (event.target.dataset.field === "officeQuery") {
      state.officeQuery = event.target.value;
      render();
      return;
    }
    if (event.target.dataset.field && state.form) onField(event.target);
  });
  document.body.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.modal && state.modal !== "sending") {
      state.modal = null;
      render();
    } else if (state.headerMenu || state.calOpen || state.openMenu) {
      state.headerMenu = null;
      state.calOpen = false;
      state.openMenu = null;
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

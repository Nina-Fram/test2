const PATIENTS = [
  {
    name: "Дмитриева Нина Сергеевна",
    dob: "12.03.1997",
    phone: "+7 999 111-22-33",
    email: "n.dmitrieva@mail.ru",
  },
  {
    name: "Ильина Светлана Романовна",
    dob: "05.07.1989",
    phone: "+7 901 222-33-44",
    email: "s.ilina@sample.ru",
  },
  {
    name: "Петров Алексей Игоревич",
    dob: "21.11.1990",
    phone: "+7 903 310-55-66",
    email: "a.petrov@sample.ru",
  },
  {
    name: "Иванова Мария Петровна",
    dob: "30.01.1987",
    phone: "+7 905 700-11-22",
    email: "m.ivanova@sample.ru",
  },
  {
    name: "Сидорова Ольга Викторовна",
    dob: "14.06.1993",
    phone: "+7 916 400-88-55",
    email: "o.sidorova@sample.ru",
  },
  {
    name: "Смирнов Илья Олегович",
    dob: "02.02.1985",
    phone: "+7 926 555-20-30",
    email: "i.smirnov@sample.ru",
  },
];

const DOCTORS = [
  { name: "Смирнов Илья Олегович", specialty: "Терапевт" },
  { name: "Ильина Светлана Романовна", specialty: "Эндокринолог" },
  { name: "Ковалева Анастасия Петровна", specialty: "Кардиолог" },
  { name: "Орлов Павел Николаевич", specialty: "Гастроэнтеролог" },
];

const ANALYSES = [
  {
    code: "19Г",
    name: "Клинический анализ крови",
    biomaterial: "Кровь из вены",
    price: 1164,
    days: 1,
  },
  {
    code: "1463",
    name: "Биохимия",
    biomaterial: "Кровь из вены",
    price: 3400,
    days: 2,
  },
  {
    code: "410",
    name: "Глюкоза",
    biomaterial: "Кровь из вены",
    price: 520,
    days: 1,
  },
  {
    code: "782",
    name: "Общий белок",
    biomaterial: "Кровь из вены",
    price: 343,
    days: 1,
  },
  {
    code: "215",
    name: "Ферритин",
    biomaterial: "Кровь из вены",
    price: 690,
    days: 2,
  },
];

const MIN_CHARS = 2;
const COLLECTION_FEE = 268;

const state = {
  patient: null,
  doctor: null,
  analyses: [],
};

const matchesQuery = (patient, query) => {
  const needle = query.toLowerCase();
  return (
    patient.name.toLowerCase().includes(needle) ||
    patient.phone.replace(/\s+/g, "").includes(needle.replace(/\s+/g, "")) ||
    patient.email.toLowerCase().includes(needle)
  );
};

const matchesDoctor = (doctor, query) => {
  const needle = query.toLowerCase();
  return (
    doctor.name.toLowerCase().includes(needle) ||
    doctor.specialty.toLowerCase().includes(needle)
  );
};

const matchesAnalysis = (analysis, query) => {
  const needle = query.toLowerCase();
  return (
    analysis.name.toLowerCase().includes(needle) ||
    analysis.code.toLowerCase().includes(needle)
  );
};

const formatMoney = (value) =>
  `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;

const formatDate = (date) =>
  date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

const renderResults = (container, results, onSelect) => {
  container.innerHTML = "";

  results.forEach((patient) => {
    const row = document.createElement("div");
    row.className = "result-row clickable";

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = patient.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `Дата рождения: ${patient.dob} · ${patient.phone} · ${patient.email}`;

    info.appendChild(title);
    info.appendChild(meta);

    row.appendChild(info);
    row.addEventListener("click", () => onSelect(patient));
    container.appendChild(row);
  });
};

const setupPatientSearch = (root) => {
  const input = root.querySelector("[data-patient-input]");
  const results = root.querySelector("[data-patient-results]");
  const hint = root.querySelector("[data-patient-hint]");

  if (!input || !results || !hint) return;

  const selectedCard = root.querySelector("[data-patient-selected]");
  const selectedName = root.querySelector("[data-patient-name]");
  const selectedInfo = root.querySelector("[data-patient-info]");
  const clearButton = root.querySelector("[data-patient-clear]");

  const renderSelected = () => {
    if (!selectedCard || !selectedName || !selectedInfo) return;
    if (!state.patient) {
      selectedCard.classList.add("hidden");
      return;
    }
    selectedName.textContent = state.patient.name;
    selectedInfo.textContent = `Дата рождения: ${state.patient.dob} · ${state.patient.phone} · ${state.patient.email}`;
    selectedCard.classList.remove("hidden");
  };

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      state.patient = null;
      localStorage.removeItem("selectedPatient");
      renderSelected();
      updateSummary();
    });
  }

  const update = () => {
    const value = input.value.trim();

    if (value.length < MIN_CHARS) {
      results.innerHTML = "";
      results.classList.add("hidden");
      hint.classList.remove("hidden");
      hint.textContent = `Введите минимум ${MIN_CHARS} символа для поиска.`;
      return;
    }

    const filtered = PATIENTS.filter((patient) => matchesQuery(patient, value));
    if (filtered.length === 0) {
      results.innerHTML = "";
      results.classList.add("hidden");
      hint.classList.remove("hidden");
      hint.textContent = "Ничего не найдено. Проверьте запрос.";
      return;
    }

    results.classList.remove("hidden");
    hint.classList.remove("hidden");
    renderResults(results, filtered, (patient) => {
      state.patient = patient;
      localStorage.setItem("selectedPatient", JSON.stringify(patient));
      renderSelected();
      results.classList.add("hidden");
      input.value = "";
      updateSummary();
    });
    hint.textContent = "Пациент выбирается из базы и обязателен для перехода дальше.";
  };

  input.addEventListener("input", update);
  renderSelected();
};

const setupDoctorSearch = (root) => {
  const input = root.querySelector("[data-doctor-input]");
  const results = root.querySelector("[data-doctor-results]");
  const hint = root.querySelector("[data-doctor-hint]");
  const selected = document.querySelector("[data-doctor-selected]");

  if (!input || !results || !hint) return;

  const renderSelected = () => {
    if (!selected) return;
    if (!state.doctor) {
      selected.textContent = "Текущий выбор: не выбран.";
      selected.classList.add("hidden");
      return;
    }
    selected.textContent = `Текущий выбор: ${state.doctor.name} · ${state.doctor.specialty}`;
    selected.classList.remove("hidden");
  };

  const renderDoctorResults = (items) => {
    results.innerHTML = "";
    items.forEach((doctor) => {
      const row = document.createElement("div");
      row.className = "result-row clickable";

      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "result-title";
      title.textContent = doctor.name;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = doctor.specialty;

      info.appendChild(title);
      info.appendChild(meta);

      row.appendChild(info);
      row.addEventListener("click", () => {
        state.doctor = doctor;
        renderSelected();
        results.classList.add("hidden");
        input.value = "";
      });
      results.appendChild(row);
    });
  };

  const update = () => {
    const value = input.value.trim();

    if (value.length < MIN_CHARS) {
      results.innerHTML = "";
      results.classList.add("hidden");
      hint.classList.remove("hidden");
      hint.textContent = `Введите минимум ${MIN_CHARS} символа для поиска.`;
      return;
    }

    const filtered = DOCTORS.filter((doctor) => matchesDoctor(doctor, value));
    if (filtered.length === 0) {
      results.innerHTML = "";
      results.classList.add("hidden");
      hint.classList.remove("hidden");
      hint.textContent = "Ничего не найдено. Проверьте запрос.";
      return;
    }

    results.classList.remove("hidden");
    renderDoctorResults(filtered);
    hint.classList.remove("hidden");
    hint.textContent = "Выберите врача из списка.";
  };

  input.addEventListener("input", update);
  renderSelected();
};

const setupAnalysisSearch = (root) => {
  const input = root.querySelector("[data-analysis-input]");
  const results = root.querySelector("[data-analysis-results]");
  const hint = root.querySelector("[data-analysis-hint]");
  const list = root.querySelector("[data-analysis-list]");
  const empty = root.querySelector("[data-analyses-empty]");
  const count = root.querySelector("[data-analyses-count]");
  const clearButton = root.querySelector("[data-analyses-clear]");
  const countRow = root.querySelector("[data-analyses-row]");

  if (!input || !results || !hint || !list || !count) return;

  const renderSelected = () => {
    list.innerHTML = "";
    if (state.analyses.length === 0) {
      count.textContent = "0";
      if (empty) empty.classList.add("hidden");
      if (list) list.classList.add("hidden");
      if (countRow) countRow.classList.add("hidden");
      updateSummary();
      return;
    }

    if (empty) empty.classList.add("hidden");
    if (list) list.classList.remove("hidden");
    if (countRow) countRow.classList.remove("hidden");
    state.analyses.forEach((analysis) => {
      const item = document.createElement("div");
      item.className = "order-item";

      const row = document.createElement("div");
      row.className = "row";

      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "order-title";
      title.textContent = `${analysis.name} (${analysis.code})`;
      const meta = document.createElement("div");
      meta.className = "order-meta";
      meta.textContent = `Локализация: ${analysis.location || analysis.biomaterial} · Срок: ${analysis.days} дн.`;
      info.appendChild(title);
      info.appendChild(meta);

      const price = document.createElement("div");
      price.className = "price-block";
      const priceValue = document.createElement("div");
      priceValue.className = "price-now";
      priceValue.textContent = formatMoney(analysis.price);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "link-muted";
      remove.textContent = "Удалить";
      remove.addEventListener("click", () => {
        state.analyses = state.analyses.filter(
          (item) =>
            !(item.code === analysis.code && item.location === analysis.location)
        );
        renderSelected();
      });
      price.appendChild(priceValue);
      price.appendChild(remove);

      row.appendChild(info);
      row.appendChild(price);
      item.appendChild(row);
      list.appendChild(item);
    });

    count.textContent = String(state.analyses.length);
    updateSummary();
  };

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      state.analyses = [];
      renderSelected();
    });
  }

  const renderAnalysisResults = (items) => {
    results.innerHTML = "";
    items.forEach((analysis) => {
      const row = document.createElement("div");
      row.className = "result-row clickable";

      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "result-title";
      title.textContent = analysis.name;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `Код ${analysis.code} · ${analysis.biomaterial}`;

      info.appendChild(title);
      info.appendChild(meta);

      const price = document.createElement("div");
      price.className = "meta";
      price.textContent = formatMoney(analysis.price);

      const actionWrap = document.createElement("div");
      actionWrap.className = "row-wrap";
      actionWrap.appendChild(price);

      row.appendChild(info);
      row.appendChild(actionWrap);
      row.addEventListener("click", () => {
        const entry = { ...analysis, location: analysis.biomaterial };
        const exists = state.analyses.some(
          (item) => item.code === entry.code && item.location === entry.location
        );
        if (!exists) {
          state.analyses.push(entry);
        }
        renderSelected();
        results.classList.add("hidden");
        input.value = "";
      });
      results.appendChild(row);
    });
  };

  const update = () => {
    const value = input.value.trim();

    if (value.length < MIN_CHARS) {
      results.innerHTML = "";
      results.classList.add("hidden");
      hint.classList.remove("hidden");
      hint.textContent = `Введите минимум ${MIN_CHARS} символа для поиска.`;
      return;
    }

    const filtered = ANALYSES.filter((analysis) => matchesAnalysis(analysis, value));
    if (filtered.length === 0) {
      results.innerHTML = "";
      results.classList.add("hidden");
      hint.classList.remove("hidden");
      hint.textContent = "Ничего не найдено. Проверьте запрос.";
      return;
    }

    results.classList.remove("hidden");
    renderAnalysisResults(filtered);
    hint.classList.remove("hidden");
    hint.textContent = "Выберите анализ из списка.";
  };

  input.addEventListener("input", update);
  renderSelected();
};

const updateSummary = () => {
  const summaryCount = document.querySelector("[data-summary-count]");
  const summaryCountMeta = document.querySelector("[data-summary-count-meta]");
  const summaryResearch = document.querySelector("[data-summary-research]");
  const summaryCollection = document.querySelector("[data-summary-collection]");
  const summaryTotal = document.querySelector("[data-summary-total]");
  const summaryReady = document.querySelector("[data-summary-ready]");
  const summaryHint = document.querySelector("[data-summary-hint]");
  const nextButton = document.querySelector("[data-next-button]");

  if (
    !summaryCount ||
    !summaryCountMeta ||
    !summaryResearch ||
    !summaryCollection ||
    !summaryTotal ||
    !summaryReady ||
    !summaryHint ||
    !nextButton
  ) {
    return;
  }

  const count = state.analyses.length;
  const researchSum = state.analyses.reduce((sum, item) => sum + item.price, 0);
  const collectionSum = count > 0 ? COLLECTION_FEE : 0;
  const total = researchSum + collectionSum;

  summaryCount.textContent = String(count);
  summaryCountMeta.textContent = String(count);
  summaryResearch.textContent = formatMoney(researchSum);
  summaryCollection.textContent = formatMoney(collectionSum);
  summaryTotal.textContent = formatMoney(total);

  if (count === 0) {
    summaryReady.textContent = "-";
  } else {
    const maxDays = Math.max(...state.analyses.map((item) => item.days));
    const readyDate = new Date();
    readyDate.setDate(readyDate.getDate() + maxDays);
    summaryReady.textContent = formatDate(readyDate);
  }

  const canProceed = Boolean(state.patient) && count > 0;
  nextButton.classList.toggle("disabled", !canProceed);
  nextButton.setAttribute("aria-disabled", String(!canProceed));
  summaryHint.textContent = canProceed
    ? "Можно переходить к завершению заказа."
    : "Нужно выбрать пациента и анализы.";
};

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("[data-patient-search]")
    .forEach((root) => setupPatientSearch(root));
  document
    .querySelectorAll("[data-doctor-search]")
    .forEach((root) => setupDoctorSearch(root));
  document
    .querySelectorAll("[data-analysis-search]")
    .forEach((root) => setupAnalysisSearch(root));
  updateSummary();
});

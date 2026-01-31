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

const MIN_CHARS = 2;

const matchesQuery = (patient, query) => {
  const needle = query.toLowerCase();
  return (
    patient.name.toLowerCase().includes(needle) ||
    patient.phone.replace(/\s+/g, "").includes(needle.replace(/\s+/g, "")) ||
    patient.email.toLowerCase().includes(needle)
  );
};

const renderResults = (container, results) => {
  container.innerHTML = "";

  results.forEach((patient) => {
    const row = document.createElement("div");
    row.className = "result-row";

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = patient.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `Дата рождения: ${patient.dob} · ${patient.phone} · ${patient.email}`;

    info.appendChild(title);
    info.appendChild(meta);

    const action = document.createElement("a");
    action.className = "btn light";
    action.href = "screen1-order-filled.html";
    action.textContent = "Выбрать";

    row.appendChild(info);
    row.appendChild(action);
    container.appendChild(row);
  });
};

const setupPatientSearch = (root) => {
  const input = root.querySelector("[data-patient-input]");
  const results = root.querySelector("[data-patient-results]");
  const hint = root.querySelector("[data-patient-hint]");

  if (!input || !results || !hint) return;

  const update = () => {
    const value = input.value.trim();

    if (value.length < MIN_CHARS) {
      results.innerHTML = "";
      hint.textContent = `Введите минимум ${MIN_CHARS} символа для поиска.`;
      return;
    }

    const filtered = PATIENTS.filter((patient) => matchesQuery(patient, value));
    if (filtered.length === 0) {
      results.innerHTML = "";
      hint.textContent = "Ничего не найдено. Проверьте запрос.";
      return;
    }

    renderResults(results, filtered);
    hint.textContent = "Пациент выбирается из базы и обязателен для перехода дальше.";
  };

  input.addEventListener("input", update);
};

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("[data-patient-search]")
    .forEach((root) => setupPatientSearch(root));
});

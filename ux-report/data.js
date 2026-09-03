/**
 * Сводный UX-отчёт · ЛК корпоративного клиента ИНВИТРО
 * Источник: UX Feedback. Заполняется из выгрузки кампаний.
 *
 * dataStatus:
 *   "pending" — выгрузка не приложена, показываем каркас и методологию
 *   "ready"   — цифры из UX Feedback
 */
window.UX_REPORT = {
  meta: {
    product: "Личный кабинет корпоративного клиента",
    company: "ИНВИТРО",
    audience: "Корпоративные клиенты: администраторы клиник, медсёстры, врачи, управляющие",
    source: "UX Feedback",
    periodLabel: "После релиза «Заказы» и «Оформление заказа»",
    generatedAt: "3 сентября 2026",
    author: "Продуктовый дизайн · ЛК КК",
    dataStatus: "pending",
    dataNote:
      "Ссылка на выгрузку UX Feedback в задачу не попала. Отчёт свёрстан и готов к цифрам: пришлите CSV/XLSX, Google Sheet или шаринг кабинета — подставлю обращения, оценки и цитаты.",
  },

  methodology: {
    title: "Как считаем критичность",
    formula: "Критичность = Частота × Серьёзность × Вес сценария",
    factors: [
      {
        name: "Частота",
        detail: "Число обращений / негативных оценок по кампании. Нормализуем относительно самого «громкого» опроса.",
      },
      {
        name: "Серьёзность",
        detail:
          "P0 — нельзя завершить ключевой сценарий. P1 — есть обходной путь, но дорогой. P2 — трение, не блокирует. P3 — копия, визуал, пожелания.",
      },
      {
        name: "Вес сценария",
        detail:
          "Оформление заказа, штрих-коды, статусы и результаты = 1.0. Курьер, расходники, уведомления = 0.7. Баннеры и косметика = 0.4.",
      },
    ],
    levels: [
      { id: "p0", label: "P0 · Блокер", hint: "Ломает заказ, печать, получение результата" },
      { id: "p1", label: "P1 · Критично", hint: "Частый обходной путь, риск ошибок и обращений в поддержку" },
      { id: "p2", label: "P2 · Важно", hint: "Замедляет работу, но сценарий завершается" },
      { id: "p3", label: "P3 · Наблюдать", hint: "Пожелания, ясность текстов, визуал" },
    ],
  },

  surveys: [
    {
      id: "passive",
      name: "Пассивный виджет",
      type: "passive",
      area: "Весь ЛК",
      scenarioWeight: 0.9,
      question: "Кнопка обратной связи: оценка + свободный комментарий",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
    {
      id: "order-create",
      name: "Оформление заказа",
      type: "active",
      area: "Заказы",
      scenarioWeight: 1,
      question: "Насколько легко было оформить заказ?",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
    {
      id: "orders-list",
      name: "Раздел «Заказы»",
      type: "active",
      area: "Заказы",
      scenarioWeight: 1,
      question: "Удалось быстро найти заказ и понять статус?",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
    {
      id: "barcodes",
      name: "Печать штрих-кодов",
      type: "active",
      area: "Заказы",
      scenarioWeight: 1,
      question: "Печать этикеток и документов прошла без проблем?",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
    {
      id: "results",
      name: "Результаты исследований",
      type: "active",
      area: "Результаты",
      scenarioWeight: 1,
      question: "Насколько удобно найти и открыть результат?",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
    {
      id: "courier",
      name: "Вызов курьера",
      type: "active",
      area: "Логистика",
      scenarioWeight: 0.7,
      question: "Удалось вызвать курьера с первой попытки?",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
    {
      id: "supplies",
      name: "Расходные материалы",
      type: "active",
      area: "Снабжение",
      scenarioWeight: 0.7,
      question: "Понятно ли, чего не хватает в заказе расходников?",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
    {
      id: "nps",
      name: "NPS продукта",
      type: "active",
      area: "Весь ЛК",
      scenarioWeight: 0.8,
      question: "Какова вероятность, что вы порекомендуете ЛК коллегам?",
      responses: null,
      impressions: null,
      negativeShare: null,
      csat: null,
    },
  ],

  issues: [],
};

# local-agent

Минимальный “агент” (объект + сохранение на диск + CLI) без внешних зависимостей.

## Быстрый старт

Создать нового агента:

```bash
python -m local_agent create --name "Новый агент"
```

Посмотреть список:

```bash
python -m local_agent list
```

Показать агента:

```bash
python -m local_agent show --id <agent_id>
```

Отправить агенту сообщение (сохранит историю в файл агента):

```bash
python -m local_agent say --id <agent_id> --text "Привет!"
```

## Где хранятся агенты

По умолчанию агенты сохраняются в папку `./agents/` рядом с `README.md` (создаётся автоматически).

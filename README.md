# Word-like Document View

Локальный плагин Obsidian, который делает редактирование и чтение Markdown ближе к виду листа Word/Docxer: страница, поля, масштабирование и варианты оформления рабочей области.

## Статус

Рабочий локальный плагин. Репозиторий вынесен отдельно от Obsidian Vault, чтобы стили и логика плагина не смешивались с заметками.

## Установка

Папка плагина должна находиться в:

```text
.obsidian/plugins/word-like-document-view
```

В текущем хранилище Obsidian эта папка подключена через junction-ссылку на отдельный репозиторий:

```text
S:/Users/HiDespondency/Documents/Obsidian Plugins/word-like-document-view
```

## Состав

- `manifest.json` - описание плагина для Obsidian.
- `main.js` - рабочий код плагина и настройки.
- `styles.css` - стили страницы, панелей, подсветок и режимов оформления.

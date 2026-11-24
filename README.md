# Vsluh

**Vsluh** — десктоп-приложение для локальной голосовой диктовки и заметок встреч (macOS, Windows, Linux). Нажал хоткей → говоришь → текст появляется в активном приложении. Транскрипция выполняется на устройстве: аудио не покидает компьютер.

Проект является форком [OpenWhispr](https://github.com/OpenWhispr/openwhispr) (MIT) и находится на стадии ребрендинга и перевода в local-only продукт. Текущая версия — **1.11.0** (соответствует апстриму).

---

## Технологический стек

| Слой | Технологии |
|---|---|
| Desktop-оболочка | Electron 43, Node.js 24+, context isolation, IPC |
| UI | React 19, TypeScript, Vite 8, Tailwind CSS v4, shadcn/ui (Radix), Zustand, TipTap |
| Локальный STT | whisper.cpp (GGML-модели), sherpa-onnx (NVIDIA Parakeet, Cohere Transcribe), ONNX Runtime |
| Локальные LLM | llama.cpp server (GGUF: Qwen, Llama, Mistral, GPT-OSS, Gemma) |
| Хранение | better-sqlite3 (история, заметки, FTS5), localStorage (настройки) |
| Семантический поиск | Qdrant (sidecar) + all-MiniLM-L6-v2 (384-dim, ONNX) |
| Аудио | ffmpeg-static, MediaRecorder → PCM-tap 16 кГц |
| Нативные хелперы | Swift (macOS: Globe-клавиша, mic-listener, window-bounds, calendar), C (Windows/Linux: key/mic listeners, system audio), C++ (AEC для встреч) |
| i18n | react-i18next, 11 локалей (включая полный русский) |
| Мобильное приложение | `openwhispr-mobile/` — Expo (унаследовано из апстрима, не интегрировано) |

## Что уже сделано в форке

- **Local-only режим** — `src/config/capabilities.js`: все облачные флаги (`cloud`, `aiAgent`, `teamSpaces`, `calendar`, `audioImport` и др.) выключены. UI, авторизация и навигация скрывают облачные функции; `migrateLocalOnlyMode()` в `src/stores/settingsStore.ts` одноразово переводит профили, мигрировавшие из облачных сборок, на локальный STT.
- **Ребрендинг**: `productName: Vsluh`, `appId: com.vsluh.app`, deep-link протокол `vsluh://`, новая иконка (`src/assets/vsluh.icon` → `Assets.car` через `scripts/compile-macos-icon.js`), новый логотип, заголовки окон, бренд-строки во всех 11 локалях (0 остаточных «OpenWhispr» в отображаемых строках).
- **Новый домашний экран** — `src/components/VsluhHomeView.tsx`: hero-блок «диктовка локально и бесплатно», шаги «как это работает», последние транскрипции. Навигация сокращена до Home / Meetings / Library / Dictionary (`src/components/controlPanelNav.ts`).
- **Локализация**: русский и остальные 10 языков полные (0 пропущенных ключей относительно `en`); секция `vsluh.*` переведена везде.
- **Сборки 1.11.0**: macOS arm64 (dmg + zip) и Windows arm64 (unpacked) — в `dist/` (в git не коммитятся).
- **Тесты форка**: `test/config/capabilities.test.js`, `test/stores/localOnlyModeMigration.test.js`. Весь апстримный набор сохранён: **965 тестовых файлов, ~7200 тестов**, линт, typecheck, `i18n:check`.

## Что осталось сделать

### Критично

1. **Автообновления указывают на чужой репозиторий.** `src/updater.js:34-39` жёстко вызывает `setFeedURL({ owner: "OpenWhispr", repo: "openwhispr" })`, что переопределяет `app-update.yml`. Собранное приложение проверяет релизы OpenWhispr и может **установить чужую сборку поверх себя**. При этом `publish` в `electron-builder.json:275-281` указывает на `Vsluh/vsluh`, а реальный remote — `Anechaev06/vsluh`. Нужно привести все три места к одному репозиторию.
2. **Нет CI/CD.** Каталог `.github` удалён, релизы собираются только локально. Нужен пайплайн: тесты + линт + сборка mac/win + draft-релиз.

### Продукт и бренд

3. **Облачные endpoint'ы остались openwhispr.com** (`src/lib/auth.ts`: `auth.openwhispr.com`, `admin.openwhispr.com`; коннекторы, MCP, docs). Код «спит» при `cloud: false`, но живой. Решить: поднимать свою инфраструктуру или удалять облачный код окончательно.
4. **Ассистент по-прежнему зовётся «OpenWhispr»** — `src/utils/agentName.ts` (`DEFAULT_AGENT_NAME`) и `src/config/prompts.ts`. Wake-word и системный промпт требуют замены.
5. **Пользовательские ссылки ведут на OpenWhispr**: `support@openwhispr.com` и `docs.openwhispr.com` в локалях (`translation.json`) и `src/components/ui/SupportDropdown.tsx`.
6. **Судьба `openwhispr-mobile/`** — полноценное Expo-приложение, но без ребрендинга, со своим lockfile, не связано с корневым tooling. Интегрировать или удалить.
7. **Апстримные тексты**: `CLAUDE.md` (заголовок «OpenWhispr Technical Reference»), `SECURITY.md` (supported-версия 1.10.x при текущей 1.11.0), README мобильного приложения.
8. **Внутренний нейминг OpenWhispr** (не горит, wire-совместимость): env-переменные `OPENWHISPR_*`, cookie `openwhispr.session_token`, функции `registerOpenWhisprProtocol()` и т.п.

### Техдолг

9. Три TODO об удалении legacy-fallback'ов env-переменных: `main.js:1480`, `src/helpers/ipcHandlers.js:5900`, `src/helpers/environment.js:294`.
10. Открытые приёмочные пункты из `docs/product-help-qa-2026-10-07.md` и `docs/validation/local-selection-edit/`: нативная валидация saved-text/undo, качество правок локальных моделей, packaged-поведение на всех платформах.
11. Удалить устаревший артефакт `dist/.tempffgkdnhxOpenWhispr-1.11.0-arm64.dmg` (1,25 ГБ, остаток апстримной сборки).

---

## Разработка

### Требования

- **Node.js 24+** (см. `engines` в `package.json`; не регенерировать `package-lock.json` другой мажорной версией)
- macOS: Xcode Command Line Tools (компиляция Swift-хелперов)
- Windows: MSVC или MinGW (key-listener собирается из C-исходников)
- Linux: gcc, wl-clipboard для Wayland-вставки

### Запуск

```bash
npm install        # postinstall: electron-builder install-app-deps
npm run dev        # Vite (renderer) + Electron с hot-reload
```

`predev:main` автоматически компилирует нативные хелперы и скачивает бинарники: whisper.cpp, llama-server, sherpa-onnx, yt-dlp, Qdrant, VAD-модель, шрифты. Модель эмбеддингов (~22 МБ) докачивается при первом семантическом поиске.

### Проверки качества

```bash
npm test              # весь набор (node --test + tsx; пересобирает better-sqlite3 под Node ABI)
npm run lint          # ESLint (корень и src/)
npm run typecheck     # tsc --noEmit в src/
npm run format:check  # ESLint + Prettier
npm run i18n:check    # полнота локалей
npm run quality-check # format:check + typecheck
```

Один тестовый файл: `node --import tsx --test test/config/capabilities.test.js`.

### Сборка

```bash
npm run build:mac          # macOS (dmg + zip), текущая архитектура
npm run build:mac:arm64    # macOS Apple Silicon
npm run build:win          # Windows (на Windows-хосте)
npm run build:linux        # Linux (AppImage/deb/rpm/tar.gz — отдельные таргеты)
npm run pack               # распакованное приложение без установщика (быстрая проверка)
```

`prebuild:*` цепочки скачивают все бинарники и модели. Публикация — draft-релизы на GitHub (см. пункт 1 «Что осталось» — конфиг пока противоречив).

### Как устроен local-only режим

Единственный переключатель — `src/config/capabilities.js` (замороженный объект, все флаги `false`). Потребители: `src/lib/auth.ts` (authClient = null), `src/AppRouter.jsx`, `src/components/SettingsModal.tsx`, `controlPanelNav.ts`, `OnboardingFlow.tsx`, `src/helpers/tray.js`. Поведение закреплено тестами `test/config/capabilities.test.js` и `test/stores/localOnlyModeMigration.test.js` — при изменении флагов обновляйте их.

### Структура репозитория

```
main.js, preload.js      # Electron main-процесс и IPC-мост
src/                     # renderer (React): components/, hooks/, stores/, services/, helpers/ (main-процесс), locales/
src/helpers/             # менеджеры main-процесса: аудио, hotkeys, whisper, parakeet, календари, коннекторы, skills
resources/               # нативные исходники (Swift/C), скрипты сборки, bin/ для скачанных бинарников
scripts/                 # build-*/download-* скрипты, run-tests.cjs, afterPack.js
test/                    # 965 файлов тестов (node --test), зеркалит src/
native/meeting-aec-helper/  # C++ AEC для записи встреч
openwhispr-mobile/       # Expo-приложение (апстрим, не интегрировано)
examples/custom-asr-shim/   # прокси-шим для self-hosted ASR
docs/                    # runbook'и, QA-отчёты, бенчмарки, планы
dist/                    # артефакты electron-builder (git-ignored)
```

### Документация

- `CLAUDE.md` — **главный технический справочник** по архитектуре (оконная модель, аудио-пайплайн, модели, коннекторы, skills). Читать первым.
- `DEBUG.md` — отладочное логирование (`--log-level=debug`).
- `TROUBLESHOOTING.md` — диагностика типовых проблем.
- `LOCAL_WHISPER_SETUP.md` — настройка whisper.cpp.
- `docs/` — enterprise-аудио runbook, сетевой allowlist, бенчмарки Orukeet, QA-отчёты, планы (`superpowers/`).

## Лицензия

[MIT](LICENSE). Основано на [OpenWhispr](https://github.com/OpenWhispr/openwhispr) — спасибо авторам upstream-проекта.

'use strict';

const { Notice, Plugin, PluginSettingTab, Setting, MarkdownView, setIcon } = require('obsidian');

const PLUGIN_ID = 'word-like-document-view';
const PLUGIN_VERSION = '2026-08-30-editor-tools';
const OPEN_QUOTE = '\u00AB';
const CLOSE_QUOTE = '\u00BB';
const EM_DASH = '\u2014';
const EN_DASH = '\u2013';
const DEFAULT_SETTINGS = {
	enabled: true,
	toolbarEnabled: true,
	toolbarCommands: ['undo','redo','format-brush','clear-format','bold','italic','underline','strikethrough','highlight','font-color','background-color','heading-1','heading-2','heading-3','heading-4','heading-5','heading-6','ordered-list','bullet-list','outdent','indent','left','center','right','justify','table','link','blockquote','superscript','subscript','cut','copy','paste'],
	environmentTheme: 'none',
	documentTheme: 'light',
	canvasTheme: 'default',
	fixDarkThemeContrast: true,
	disableReadableLineLength: false,
	scalePageWithZoom: true,
	pageWidth: 800,
	pageMinHeight: 1123,
	marginTop: 28,
	marginBottom: 42,
	paddingTop: 82,
	paddingRight: 64,
	paddingBottom: 82,
	paddingLeft: 72,
	fontSize: 16,
	lineHeight: 1.35,
	hideInnerScrollbar: true,
	zoomEnabled: true,
	zoomPercent: 100,
	zoomMinPercent: 70,
	zoomMaxPercent: 180,
	zoomStepPercent: 10,
	guillemetsEnabled: true
};

const NUMERIC_SETTINGS = [
	'pageWidth',
	'pageMinHeight',
	'marginTop',
	'marginBottom',
	'paddingTop',
	'paddingRight',
	'paddingBottom',
	'paddingLeft',
	'fontSize',
	'lineHeight',
	'zoomPercent',
	'zoomMinPercent',
	'zoomMaxPercent',
	'zoomStepPercent'
];

const BODY_CLASS = Object.freeze({
	enabled: 'word-like-document-view-enabled',
	staticPage: 'word-like-document-view-static-page',
	compatDark: 'word-like-document-view-compat-dark',
	showInnerScrollbar: 'word-like-document-view-show-inner-scrollbar',
	documentLight: 'word-like-document-view-document-light',
	documentDark: 'word-like-document-view-document-dark',
	environmentFocusDark: 'word-like-document-view-env-focus-dark',
	environmentWord2019Blue: 'word-like-document-view-env-word2019-blue',
	environmentWord2000Blue: 'word-like-document-view-env-word2000-blue'
});
const BODY_CLASSES = Object.values(BODY_CLASS);

// DOM hooks used by the small Obsidian compatibility adapter.  The CSS can
// target these stable plugin-owned hooks while this registry keeps Obsidian's
// view selectors in one place for future updates.
const VIEW_ADAPTER_SELECTOR = Object.freeze({
	leaf: '.workspace-leaf-content',
	markdown: '[data-type="markdown"]',
	pdf: '[data-type="pdf"]'
});
const VIEW_HOST_CLASS = Object.freeze({
	markdown: 'word-like-document-view-host-markdown',
	pdf: 'word-like-document-view-host-pdf'
});
const VIEW_HOST_CLASSES = Object.values(VIEW_HOST_CLASS);

const CSS_VARIABLES = [
	'--docxer-md-canvas',
	'--docxer-md-page',
	'--docxer-md-ink',
	'--docxer-md-muted',
	'--docxer-md-faint',
	'--docxer-md-link',
	'--docxer-md-secondary-bg',
	'--docxer-md-alt-bg',
	'--docxer-md-border',
	'--docxer-md-shadow',
	'--docxer-md-callout-text',
	'--docxer-md-callout-title',
	'--docxer-md-callout-bg-opacity',
	'--docxer-md-cursor',
	'--docxer-md-selection-bg',
	'--docxer-md-selection-text',
	'--docxer-md-search-bg',
	'--docxer-md-search-text',
	'--docxer-md-search-border',
	'--docxer-md-search-current-bg',
	'--docxer-md-search-current-text',
	'--docxer-md-search-preview-bg',
	'--docxer-md-search-preview-current-bg',
	'--docxer-md-toolbar-bg',
	'--docxer-md-toolbar-text',
	'--docxer-md-toolbar-border',
	'--docxer-md-toolbar-hover',
	'--docxer-md-code-bg',
	'--docxer-md-code-text',
	'--docxer-md-code-border',
	'--docxer-md-page-width-base',
	'--docxer-md-page-min-height-base',
	'--docxer-md-margin-top-base',
	'--docxer-md-margin-bottom-base',
	'--docxer-md-padding-top-base',
	'--docxer-md-padding-right-base',
	'--docxer-md-padding-bottom-base',
	'--docxer-md-padding-left-base',
	'--docxer-md-font-size-base',
	'--docxer-md-line-height',
	'--word-like-zoom-factor'
];

const TOOLBAR_COMMANDS = {
	undo:{name:'Отменить',icon:'undo',core:'editor:undo'}, redo:{name:'Повторить',icon:'redo',core:'editor:redo'},
	'format-brush':{name:'Форматная кисть',icon:'paintbrush'}, 'clear-format':{name:'Очистить форматирование',icon:'eraser'},
	bold:{name:'Полужирный',icon:'bold',core:'editor:toggle-bold'}, italic:{name:'Курсив',icon:'italic',core:'editor:toggle-italics'}, underline:{name:'Подчёркивание',icon:'underline'}, strikethrough:{name:'Зачёркивание',icon:'strikethrough'}, highlight:{name:'Выделение',icon:'highlighter'}, 'font-color':{name:'Цвет текста',icon:'type'}, 'background-color':{name:'Цвет выделения',icon:'paint-bucket'},
	'heading-1':{name:'Заголовок 1',icon:'heading-1'},'heading-2':{name:'Заголовок 2',icon:'heading-2'},'heading-3':{name:'Заголовок 3',icon:'heading-3'},'heading-4':{name:'Заголовок 4',icon:'heading-4'},'heading-5':{name:'Заголовок 5',icon:'heading-5'},'heading-6':{name:'Заголовок 6',icon:'heading-6'},
	'ordered-list':{name:'Нумерованный список',icon:'list-ordered',core:'editor:toggle-numbered-list'},'bullet-list':{name:'Маркированный список',icon:'list',core:'editor:toggle-bullet-list'},outdent:{name:'Уменьшить отступ',icon:'indent-decrease',core:'editor:unindent-list'},indent:{name:'Увеличить отступ',icon:'indent-increase',core:'editor:indent-list'},
	left:{name:'По левому краю',icon:'align-left'},center:{name:'По центру',icon:'align-center'},right:{name:'По правому краю',icon:'align-right'},justify:{name:'По ширине',icon:'align-justify'},table:{name:'Таблица',icon:'table',core:'editor:insert-table'},link:{name:'Ссылка',icon:'link',core:'editor:insert-link'},blockquote:{name:'Цитата',icon:'quote',core:'editor:toggle-blockquote'},
	superscript:{name:'Верхний индекс',icon:'superscript'},subscript:{name:'Нижний индекс',icon:'subscript'},cut:{name:'Вырезать',icon:'scissors',core:'editor:cut'},copy:{name:'Копировать',icon:'copy',core:'editor:copy'},paste:{name:'Вставить',icon:'clipboard',core:'editor:paste'}
};

const TOOLBAR_GROUPS = [
	['Панель инструментов', ['undo','redo','format-brush','clear-format','bold','italic','underline','strikethrough','highlight','font-color','background-color','heading-1','heading-2','heading-3','heading-4','heading-5','heading-6','ordered-list','bullet-list','outdent','indent','left','center','right','justify','table','link','blockquote','superscript','subscript','cut','copy','paste']]
];

class WordLikeDocumentViewPlugin extends Plugin {
	async onload() {
		await this.loadSettings();
		this.applySettings();
		this.refreshToolbar();
		this.setupZoom();
		this.setupGuillemets();
		this.applyViewAdapters();

		this.registerEvent(this.app.workspace.on('layout-change', () => {
			this.applyViewAdapters();
			this.queueApplySettings();
			this.refreshToolbar();
		}));
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			this.applyViewAdapters();
			this.queueApplySettings();
			this.refreshToolbar();
		}));

		this.addSettingTab(new WordLikeDocumentSettingTab(this.app, this));
		this.addCommands();
	}

	onunload() {
		this.removeToolbar();
		this.clearViewAdapters();
		if (this.applyFrame) {
			window.cancelAnimationFrame(this.applyFrame);
			this.applyFrame = null;
		}
		this.clearBodyState();
		if (this.zoomNotice) this.zoomNotice.hide();
	}

	addCommands() {
		this.addCommand({
			id: 'toggle-word-like-document-view',
			name: 'Включить/выключить Word-like вид документа',
			callback: async () => {
				this.settings.enabled = !this.settings.enabled;
				await this.saveSettings();
				this.applySettings();
				new Notice(this.settings.enabled ? 'Word-like вид включён' : 'Word-like вид выключен');
			}
		});

		this.addCommand({
			id: 'show-word-like-document-view-status',
			name: 'Показать состояние Word-like вида',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile()?.path ?? 'нет активного файла';
				const state = [
					`Word-like: ${this.settings.enabled ? 'включён' : 'выключен'}`,
					`версия: ${PLUGIN_VERSION}`,
					`файл: ${activeFile}`,
					`line-height: ${this.settings.lineHeight}`,
					`readable line length: ${this.settings.disableReadableLineLength ? 'отключается плагином' : 'не трогается'}`
				].join('\n');
				console.info(`[${PLUGIN_ID}] ${state}`);
				new Notice(state, 7000);
			}
		});

		this.addCommand({
			id: 'reset-word-like-document-view',
			name: 'Сбросить настройки Word-like вида',
			callback: async () => {
				this.settings = { ...DEFAULT_SETTINGS };
				await this.saveSettings();
				this.applySettings();
				new Notice('Настройки Word-like вида сброшены');
			}
		});

		this.addCommand({
			id: 'editor-zoom-in',
			name: 'Увеличить текст редактора',
			callback: async () => this.changeZoom(this.settings.zoomStepPercent, true)
		});

		this.addCommand({
			id: 'editor-zoom-out',
			name: 'Уменьшить текст редактора',
			callback: async () => this.changeZoom(-this.settings.zoomStepPercent, true)
		});

		this.addCommand({
			id: 'editor-zoom-reset',
			name: 'Сбросить масштаб текста редактора',
			callback: async () => {
				this.settings.zoomPercent = DEFAULT_SETTINGS.zoomPercent;
				this.applyZoom();
				await this.saveSettings();
				new Notice('Масштаб текста: 100%');
			}
		});

		this.addCommand({
			id: 'convert-straight-quotes',
			name: 'Заменить прямые кавычки на «ёлочки»',
			editorCallback: (editor) => this.convertQuotesInEditor(editor)
		});
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
		this.normalizeSettings();
	}

	async saveSettings() {
		this.normalizeSettings();
		await this.saveData(this.settings);
	}

	normalizeSettings() {
		for (const key of NUMERIC_SETTINGS) {
			const fallback = DEFAULT_SETTINGS[key];
			const value = Number(this.settings[key]);
			this.settings[key] = Number.isFinite(value) ? value : fallback;
		}

		this.settings.enabled = Boolean(this.settings.enabled);
		this.settings.toolbarEnabled = Boolean(this.settings.toolbarEnabled);
		if (!Array.isArray(this.settings.toolbarCommands)) this.settings.toolbarCommands = [...DEFAULT_SETTINGS.toolbarCommands];
		this.settings.disableReadableLineLength = Boolean(this.settings.disableReadableLineLength);
		this.settings.scalePageWithZoom = Boolean(this.settings.scalePageWithZoom);
		this.settings.hideInnerScrollbar = Boolean(this.settings.hideInnerScrollbar);
		this.settings.fixDarkThemeContrast = Boolean(this.settings.fixDarkThemeContrast);
		this.settings.zoomEnabled = Boolean(this.settings.zoomEnabled);
		this.settings.guillemetsEnabled = Boolean(this.settings.guillemetsEnabled);
		this.settings.zoomMinPercent = Math.max(25, Math.min(400, this.settings.zoomMinPercent));
		this.settings.zoomMaxPercent = Math.max(this.settings.zoomMinPercent, Math.min(400, this.settings.zoomMaxPercent));
		this.settings.zoomStepPercent = Math.max(1, Math.min(50, this.settings.zoomStepPercent));
		this.settings.zoomPercent = this.clampZoom(this.settings.zoomPercent);

		if (!['none', 'focusDark', 'word2019Blue', 'word2000Blue'].includes(this.settings.environmentTheme)) {
			this.settings.environmentTheme = DEFAULT_SETTINGS.environmentTheme;
		}
		if (!['light', 'dark'].includes(this.settings.documentTheme)) {
			this.settings.documentTheme = DEFAULT_SETTINGS.documentTheme;
		}
		if (!['default', 'softGray', 'warmBeige', 'coolWhite', 'darkGray'].includes(this.settings.canvasTheme)) {
			this.settings.canvasTheme = DEFAULT_SETTINGS.canvasTheme;
		}
	}

	setupZoom() {
		this.zoomNotice = null;
		this.wheelHandler = (event) => this.handleWheel(event);
		document.addEventListener('wheel', this.wheelHandler, { capture: true, passive: false });
		this.register(() => document.removeEventListener('wheel', this.wheelHandler, { capture: true }));
		this.applyZoom();
	}

	clampZoom(value) {
		const min = this.settings?.zoomMinPercent ?? DEFAULT_SETTINGS.zoomMinPercent;
		const max = this.settings?.zoomMaxPercent ?? DEFAULT_SETTINGS.zoomMaxPercent;
		return Math.min(max, Math.max(min, value));
	}

	isMarkdownWorkAreaTarget(target) {
		if (!(target instanceof Element)) return false;
		if (target.closest('.modal, .menu, .suggestion-container, .prompt, .popover')) return false;
		return Boolean(target.closest('.markdown-source-view, .markdown-preview-view, .cm-editor'));
	}

	handleWheel(event) {
		if (!this.settings?.enabled || !this.settings.zoomEnabled || !event.ctrlKey || !this.isMarkdownWorkAreaTarget(event.target)) return;
		event.preventDefault();
		event.stopPropagation();
		const direction = event.deltaY < 0 ? 1 : -1;
		void this.changeZoom(direction * this.settings.zoomStepPercent, true);
	}

	async changeZoom(delta, showNotice) {
		if (!this.settings.zoomEnabled) return;
		const next = this.clampZoom(this.settings.zoomPercent + delta);
		if (next === this.settings.zoomPercent) return;
		this.settings.zoomPercent = next;
		this.applyZoom();
		await this.saveSettings();
		if (showNotice) this.showZoomNotice();
	}

	applyZoom() {
		if (!this.settings?.enabled || !this.settings.zoomEnabled) {
			document.body.style.removeProperty('--word-like-zoom-factor');
			return;
		}
		document.body.style.setProperty('--word-like-zoom-factor', `${this.settings.zoomPercent / 100}`);
	}

	showZoomNotice() {
		if (this.zoomNotice) this.zoomNotice.hide();
		this.zoomNotice = new Notice(`Масштаб текста: ${this.settings.zoomPercent}%`, 1200);
	}

	setupGuillemets() {
		this.quoteKeydownHandler = (event) => this.handleQuoteKeydown(event);
		document.addEventListener('keydown', this.quoteKeydownHandler, true);
		this.register(() => document.removeEventListener('keydown', this.quoteKeydownHandler, true));

		this.quoteBeforeInputHandler = (event) => {
			if (!this.settings?.enabled || !this.settings.guillemetsEnabled || event.inputType !== 'insertText' || event.data !== '"') return;
			this.replaceInActiveTextField(event);
		};
		document.addEventListener('beforeinput', this.quoteBeforeInputHandler, true);
		this.register(() => document.removeEventListener('beforeinput', this.quoteBeforeInputHandler, true));
	}

	handleQuoteKeydown(event) {
		if (!this.settings?.enabled || !this.settings.guillemetsEnabled || !this.isStraightQuoteKey(event)) return;
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if (this.replaceInMarkdownEditor(event)) return;
		this.replaceInActiveTextField(event);
	}

	isStraightQuoteKey(event) {
		return event.key === '"' || event.key === 'Quote' || (event.code === 'Quote' && event.shiftKey);
	}

	replaceInMarkdownEditor(event) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.editor;
		if (!editor || !view.containerEl.contains(event.target)) return false;
		const cursor = editor.getCursor();
		if (!cursor) return false;
		const line = editor.getLine(cursor.line) ?? '';
		const replacement = this.chooseReplacement(line.slice(0, cursor.ch));
		event.preventDefault();
		editor.replaceRange(replacement, cursor, cursor);
		editor.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
		return true;
	}

	replaceInActiveTextField(event) {
		const target = event.target;
		if (this.isEditableInput(target)) {
			this.replaceInInputLikeElement(event, target);
			return true;
		}
		const editable = target?.closest?.('[contenteditable="true"]');
		if (editable) return this.replaceInContentEditable(event, editable);
		return false;
	}

	isEditableInput(element) {
		if (!element) return false;
		if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
		if (!(element instanceof HTMLInputElement) || element.disabled || element.readOnly) return false;
		return ['text', 'search', 'url', 'email', 'tel', ''].includes((element.type || 'text').toLowerCase());
	}

	replaceInInputLikeElement(event, element) {
		const start = element.selectionStart ?? element.value.length;
		const end = element.selectionEnd ?? start;
		const replacement = this.chooseReplacement(element.value.slice(0, start));
		event.preventDefault();
		element.setRangeText(replacement, start, end, 'end');
		element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: replacement }));
	}

	replaceInContentEditable(event, root) {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return false;
		const range = selection.getRangeAt(0);
		if (!root.contains(range.commonAncestorContainer)) return false;
		const prefixRange = range.cloneRange();
		prefixRange.selectNodeContents(root);
		prefixRange.setEnd(range.startContainer, range.startOffset);
		const replacement = this.chooseReplacement(prefixRange.toString());
		event.preventDefault();
		range.deleteContents();
		const textNode = document.createTextNode(replacement);
		range.insertNode(textNode);
		range.setStartAfter(textNode);
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
		root.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: replacement }));
		return true;
	}

	shouldUseOpeningQuote(prevChar) {
		if (!prevChar) return true;
		return /[\s([{-]/.test(prevChar) || prevChar === EM_DASH || prevChar === EN_DASH;
	}

	countUnmatchedOpeningQuotes(text) {
		let openings = 0;
		let closings = 0;
		for (const char of text) {
			if (char === OPEN_QUOTE) openings += 1;
			if (char === CLOSE_QUOTE) closings += 1;
		}
		return openings - closings;
	}

	chooseReplacement(linePrefix) {
		if (this.countUnmatchedOpeningQuotes(linePrefix) > 0) return CLOSE_QUOTE;
		const prevChar = linePrefix.length > 0 ? linePrefix[linePrefix.length - 1] : '';
		return this.shouldUseOpeningQuote(prevChar) ? OPEN_QUOTE : CLOSE_QUOTE;
	}

	convertQuotesInText(text) {
		return text.split('\n').map((line) => {
			let result = '';
			for (const char of line) result += char === '"' ? this.chooseReplacement(result) : char;
			return result;
		}).join('\n');
	}

	convertQuotesInEditor(editor) {
		const selection = editor.getSelection();
		if (selection && selection.length > 0) {
			editor.replaceSelection(this.convertQuotesInText(selection));
			new Notice('Прямые кавычки заменены в выделении.');
			return;
		}
		editor.setValue(this.convertQuotesInText(editor.getValue()));
		new Notice('Прямые кавычки заменены в текущей заметке.');
	}

	removeToolbar() { this.toolbarEl?.remove(); this.toolbarEl = null; }

	applyViewAdapters() {
		this.clearViewAdapters();
		if (!this.settings?.enabled) return;
		for (const leaf of document.querySelectorAll(VIEW_ADAPTER_SELECTOR.leaf)) {
			if (leaf.matches(VIEW_ADAPTER_SELECTOR.markdown)) leaf.classList.add(VIEW_HOST_CLASS.markdown);
			if (leaf.matches(VIEW_ADAPTER_SELECTOR.pdf)) leaf.classList.add(VIEW_HOST_CLASS.pdf);
		}
	}

	clearViewAdapters() {
		document.querySelectorAll(VIEW_ADAPTER_SELECTOR.leaf).forEach((leaf) => leaf.classList.remove(...VIEW_HOST_CLASSES));
	}

	refreshToolbar() {
		this.removeToolbar();
		if (!this.settings?.enabled || !this.settings.toolbarEnabled) return;
		const view = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
		const host = view?.containerEl?.querySelector('.markdown-source-view');
		if (!host) return;
		const toolbar = document.createElement('div');
		toolbar.className = 'word-like-toolbar';
		toolbar.setAttribute('aria-label', 'Панель инструментов');
		for (const id of this.settings.toolbarCommands) {
			const spec = TOOLBAR_COMMANDS[id]; if (!spec) continue;
			const button = toolbar.createEl('button', { cls: 'word-like-toolbar-button', attr: { type: 'button', title: spec.name, 'aria-label': spec.name } });
			setIcon(button, spec.icon);
			button.addEventListener('click', () => this.runToolbarCommand(id));
		}
		host.prepend(toolbar); this.toolbarEl = toolbar;
	}

	runToolbarCommand(id) {
		const view = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView); const editor = view?.editor; if (!editor) return;
		if (id === 'format-brush') {
			const selected = editor.getSelection();
			if (!selected) { new Notice('Сначала выделите фрагмент с нужным форматированием.'); return; }
			if (this.formatBrush) { editor.replaceSelection(this.formatBrush[0] + selected + this.formatBrush[1]); this.formatBrush = null; new Notice('Формат применён.'); return; }
			const match = selected.match(/^(\*\*|__|~~|==|<u>|<sup>|<sub>)([\s\S]+)(\*\*|__|~~|==|<\/u>|<\/sup>|<\/sub>)$/);
			this.formatBrush = match ? [match[1], match[3]] : null;
			new Notice(this.formatBrush ? 'Формат скопирован. Выделите текст и нажмите кисть ещё раз.' : 'Не удалось определить формат выделения.');
			return;
		}
		const core = TOOLBAR_COMMANDS[id]?.core;
		if (core && this.app.commands.findCommand(core)) { this.app.commands.executeCommandById(core); return; }
		const text = editor.getSelection() || 'текст';
		const wrap = { bold:['**','**'], italic:['*','*'], underline:['<u>','</u>'], strikethrough:['~~','~~'], highlight:['==','=='], superscript:['<sup>','</sup>'], subscript:['<sub>','</sub>'] }[id];
		if (wrap) { editor.replaceSelection(wrap[0] + text + wrap[1]); return; }
		if (id === 'clear-format') { editor.replaceSelection(text.replace(/\*\*|__|~~|==|<\/?u>|<\/?sup>|<\/?sub>/g, '')); return; }
		if (/^heading-[1-6]$/.test(id)) { const n=Number(id.slice(-1)); const line=editor.getLine(editor.getCursor().line); editor.replaceRange(line.replace(/^\s*#+\s*/, '') ? `${'#'.repeat(n)} ${line.replace(/^\s*#+\s*/, '')}` : `${'#'.repeat(n)} `, {line:editor.getCursor().line,ch:0}, {line:editor.getCursor().line,ch:line.length}); }
		if (['left','center','right','justify'].includes(id)) { const align={left:'left',center:'center',right:'right',justify:'justify'}[id]; editor.replaceSelection(`<div style="text-align: ${align}">\n${text}\n</div>`); return; }
		if (id === 'font-color' || id === 'background-color') { const value=window.prompt(id === 'font-color' ? 'Цвет текста (например #1e66f5):' : 'Цвет выделения (например #fff2a8):', id === 'font-color' ? '#1e66f5' : '#fff2a8'); if (value) { const style=id === 'font-color' ? `color:${value}` : `background-color:${value}`; editor.replaceSelection(`<span style="${style}">${text}</span>`); } }
	}

	applySettings() {
		document.body.dataset.wordLikeDocumentViewVersion = PLUGIN_VERSION;
		if (!this.settings.enabled) {
			this.clearBodyState();
			this.clearViewAdapters();
			document.body.dataset.wordLikeDocumentViewVersion = PLUGIN_VERSION;
			return;
		}

		document.body.classList.add(BODY_CLASS.enabled);
		document.body.classList.toggle(BODY_CLASS.staticPage, !this.settings.scalePageWithZoom);
		document.body.classList.toggle(BODY_CLASS.showInnerScrollbar, !this.settings.hideInnerScrollbar);
		document.body.classList.toggle(BODY_CLASS.compatDark, this.settings.fixDarkThemeContrast);
		document.body.classList.toggle(BODY_CLASS.documentLight, this.settings.documentTheme === 'light');
		document.body.classList.toggle(BODY_CLASS.documentDark, this.settings.documentTheme === 'dark');
		document.body.classList.toggle(BODY_CLASS.environmentFocusDark, this.settings.environmentTheme === 'focusDark');
		document.body.classList.toggle(BODY_CLASS.environmentWord2019Blue, this.settings.environmentTheme === 'word2019Blue');
		document.body.classList.toggle(BODY_CLASS.environmentWord2000Blue, this.settings.environmentTheme === 'word2000Blue');

		this.setCssVariables();
		this.applyViewAdapters();
		this.applyZoom();
		if (this.settings.disableReadableLineLength) this.disableReadableLineLength();
	}

	queueApplySettings() {
		if (this.applyFrame) return;
		this.applyFrame = window.requestAnimationFrame(() => {
			this.applyFrame = null;
			this.applySettings();
		});
	}

	clearBodyState() {
		document.body.classList.remove(...BODY_CLASSES);
		document.body.removeAttribute('data-word-like-document-view-version');
		for (const name of CSS_VARIABLES) {
			document.body.style.removeProperty(name);
		}
	}

	setCssVariables() {
		const documentColors = this.getDocumentColors();
		const canvasColor = this.getCanvasColor(documentColors['--docxer-md-canvas']);
		const toolbarColors = this.getToolbarColors(canvasColor);
		const values = {
			...documentColors,
			'--docxer-md-canvas': canvasColor,
			'--docxer-md-toolbar-bg': canvasColor,
			...toolbarColors,
			'--docxer-md-page-width-base': `${this.settings.pageWidth}px`,
			'--docxer-md-page-min-height-base': `${this.settings.pageMinHeight}px`,
			'--docxer-md-margin-top-base': `${this.settings.marginTop}px`,
			'--docxer-md-margin-bottom-base': `${this.settings.marginBottom}px`,
			'--docxer-md-padding-top-base': `${this.settings.paddingTop}px`,
			'--docxer-md-padding-right-base': `${this.settings.paddingRight}px`,
			'--docxer-md-padding-bottom-base': `${this.settings.paddingBottom}px`,
			'--docxer-md-padding-left-base': `${this.settings.paddingLeft}px`,
			'--docxer-md-font-size-base': `${this.settings.fontSize}px`,
			'--docxer-md-line-height': `${this.settings.lineHeight}`
		};

		for (const [name, value] of Object.entries(values)) {
			if (document.body.style.getPropertyValue(name).trim() !== value) {
				document.body.style.setProperty(name, value);
			}
		}
	}

	getCanvasColor(defaultColor) {
		const colors = {
			default: defaultColor,
			softGray: '#f3f3f3',
			warmBeige: '#eee8dc',
			coolWhite: '#fafafa',
			darkGray: '#2f2f2f'
		};
		return colors[this.settings.canvasTheme] ?? defaultColor;
	}

	getToolbarColors(backgroundColor) {
		const isDark = this.isDarkHexColor(backgroundColor);
		return {
			'--docxer-md-toolbar-text': isDark ? '#ffffff' : '#222222',
			'--docxer-md-toolbar-border': isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)',
			'--docxer-md-toolbar-hover': isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
		};
	}

	isDarkHexColor(color) {
		const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color || '');
		if (!match) return this.settings.documentTheme === 'dark';

		const red = parseInt(match[1], 16);
		const green = parseInt(match[2], 16);
		const blue = parseInt(match[3], 16);
		const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
		return luminance < 0.48;
	}

	getDocumentColors() {
		if (this.settings.documentTheme === 'dark') {
			return {
				'--docxer-md-canvas': '#111111',
				'--docxer-md-page': '#1f1f1f',
				'--docxer-md-ink': '#ffffff',
				'--docxer-md-muted': '#d6d6d6',
				'--docxer-md-faint': '#b8b8b8',
				'--docxer-md-link': '#8ab4f8',
				'--docxer-md-secondary-bg': '#2a2a2a',
				'--docxer-md-alt-bg': '#262626',
				'--docxer-md-border': '#555555',
				'--docxer-md-shadow': '0 0 10px rgba(0, 0, 0, 0.55)',
				'--docxer-md-callout-text': '#ffffff',
				'--docxer-md-callout-title': '#f0a64a',
				'--docxer-md-callout-bg-opacity': '0.18',
				'--docxer-md-code-bg': '#2a2a2a',
				'--docxer-md-code-text': '#f1f1f1',
				'--docxer-md-code-border': '#555555',
				'--docxer-md-cursor': '#ffffff',
				'--docxer-md-selection-bg': 'rgba(138, 180, 248, 0.42)',
				'--docxer-md-selection-text': '#ffffff',
				'--docxer-md-search-bg': '#7a5a00',
				'--docxer-md-search-text': '#ffffff',
				'--docxer-md-search-border': '#f0c75e',
				'--docxer-md-search-current-bg': '#d9822b',
				'--docxer-md-search-current-text': '#ffffff',
				'--docxer-md-search-preview-bg': 'rgba(240, 199, 94, 0.38)',
				'--docxer-md-search-preview-current-bg': 'rgba(217, 130, 43, 0.48)'
			};
		}

		return {
			'--docxer-md-canvas': '#f3f3f3',
			'--docxer-md-page': '#ffffff',
			'--docxer-md-ink': '#000000',
			'--docxer-md-muted': '#242424',
			'--docxer-md-faint': '#555555',
			'--docxer-md-link': '#0056c1',
			'--docxer-md-secondary-bg': '#f6f6f6',
			'--docxer-md-alt-bg': '#f2f2f2',
			'--docxer-md-border': '#c8c8c8',
			'--docxer-md-shadow': '0 0 8px rgba(0, 0, 0, 0.24)',
			'--docxer-md-callout-text': '#1f1f1f',
			'--docxer-md-callout-title': 'rgb(var(--callout-color))',
			'--docxer-md-callout-bg-opacity': '0.12',
			'--docxer-md-code-bg': '#f2f2f2',
			'--docxer-md-code-text': '#202020',
			'--docxer-md-code-border': '#c8c8c8',
			'--docxer-md-cursor': '#003f8f',
			'--docxer-md-selection-bg': '#b8d7ff',
			'--docxer-md-selection-text': '#000000',
			'--docxer-md-search-bg': '#ffe066',
			'--docxer-md-search-text': '#000000',
			'--docxer-md-search-border': '#9a6a00',
			'--docxer-md-search-current-bg': '#ffb000',
			'--docxer-md-search-current-text': '#000000',
			'--docxer-md-search-preview-bg': 'rgba(255, 224, 102, 0.42)',
			'--docxer-md-search-preview-current-bg': 'rgba(255, 176, 0, 0.46)'
		};
	}

	disableReadableLineLength() {
		if (!this.app.vault?.config) return;
		if (this.app.vault.config.readableLineLength === false) return;
		this.app.vault.config.readableLineLength = false;
		void this.app.vault.saveConfig();
	}
}

class WordLikeDocumentSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Word-like' });
		const displayDetails = containerEl.createEl('details', { cls: 'word-like-toolbar-settings-group' });
		const displaySummary = displayDetails.createEl('summary');
		displaySummary.createSpan({ text: 'Параметры интерфейса и отображения' });
		const displayReset = displaySummary.createEl('button', { text: 'Сбросить', cls: 'word-like-summary-reset', attr: { type: 'button' } });
		displayReset.addEventListener('click', async (event) => { event.preventDefault(); event.stopPropagation(); const currentTools = this.plugin.settings.toolbarCommands; this.plugin.settings = { ...DEFAULT_SETTINGS, toolbarCommands: currentTools }; await this.plugin.saveSettings(); this.plugin.applySettings(); this.display(); });

		new Setting(displayDetails)
			.setName('Включить Word-like вид')
			.setDesc('Оформляет только markdown-область как лист Word/Docxer. Не переписывает Obsidian целиком.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enabled)
				.onChange((value) => this.updateSetting('enabled', value)));

		new Setting(displayDetails)
			.setName('Окружение вокруг документа')
			.setDesc('Экспериментально. Самый безопасный вариант - не менять панели Obsidian.')
			.addDropdown((dropdown) => dropdown
				.addOption('none', 'Не менять панели')
				.addOption('focusDark', 'Тёмно-серый фокус')
				.addOption('word2019Blue', 'Word 2019 синий')
				.addOption('word2000Blue', 'Word 2000 синий')
				.setValue(this.plugin.settings.environmentTheme)
				.onChange((value) => this.updateSetting('environmentTheme', value)));

		new Setting(displayDetails)
			.setName('Цвет документа')
			.setDesc('Белый лист ближе к Word; тёмный лист остаётся отдельным вариантом для тёмной темы Obsidian.')
			.addDropdown((dropdown) => dropdown
				.addOption('light', 'Белый лист Word')
				.addOption('dark', 'Тёмный лист Obsidian')
				.setValue(this.plugin.settings.documentTheme)
				.onChange((value) => this.updateSetting('documentTheme', value)));

		new Setting(displayDetails)
			.setName('Фон вокруг листа')
			.setDesc('Меняет только поле вокруг документа в центральной области, не цвет самого листа и не панели Obsidian.')
			.addDropdown((dropdown) => dropdown
				.addOption('default', 'По цвету документа')
				.addOption('softGray', 'Светло-серый')
				.addOption('warmBeige', 'Тёплый бежевый')
				.addOption('coolWhite', 'Почти белый')
				.addOption('darkGray', 'Тёмно-серый')
				.setValue(this.plugin.settings.canvasTheme)
				.onChange((value) => this.updateSetting('canvasTheme', value)));

		new Setting(displayDetails)
			.setName('Масштабировать страницу целиком')
			.setDesc('Ctrl+колёсико увеличивает лист, поля и текст вместе.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.scalePageWithZoom)
				.onChange((value) => this.updateSetting('scalePageWithZoom', value)));

		new Setting(displayDetails)
			.setName('Масштаб текста Ctrl+колёсиком')
			.setDesc('Изменяет масштаб текста в редакторе и режиме чтения. Диапазон: 70–180%.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.zoomEnabled)
				.onChange((value) => this.updateSetting('zoomEnabled', value)));

		this.addSliderTo(displayDetails, 'Текущий масштаб текста', 'Масштаб, который используется при Ctrl+колёсике.', 'zoomPercent', 70, 180, 10, '%');
		this.addSliderTo(displayDetails, 'Шаг масштаба', 'Изменение масштаба за один шаг Ctrl+колёсика.', 'zoomStepPercent', 5, 25, 5, '%');

		new Setting(displayDetails)
			.setName('Автоматические кавычки «ёлочки»')
			.setDesc('Заменяет прямые кавычки при вводе в редакторе, полях и редактируемых элементах.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.guillemetsEnabled)
				.onChange((value) => this.updateSetting('guillemetsEnabled', value)));

		new Setting(displayDetails)
			.setName('Отключать readable line length')
			.setDesc('Не рекомендуется. Меняет глобальную настройку Obsidian; включать только если ограничение ширины явно мешает листу.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.disableReadableLineLength)
				.onChange((value) => this.updateSetting('disableReadableLineLength', value)));

		new Setting(displayDetails)
			.setName('Скрывать внутренний scrollbar редактора')
			.setDesc('Убирает второй scrollbar внутри редактора, но не меняет прокрутку документа.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.hideInnerScrollbar)
				.onChange((value) => this.updateSetting('hideInnerScrollbar', value)));

		new Setting(displayDetails)
			.setName('Исправить контраст ссылок в тёмной теме')
			.setDesc('Только для ссылок и сносок в редакторе; не меняет popover, callout и свойства.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.fixDarkThemeContrast)
				.onChange((value) => this.updateSetting('fixDarkThemeContrast', value)));

		this.addSliderTo(displayDetails, 'Ширина листа', 'Базовая ширина листа при 100% масштабе.', 'pageWidth', 600, 1100, 10, 'px');
		this.addSliderTo(displayDetails, 'Размер шрифта', 'Базовый размер основного текста.', 'fontSize', 12, 22, 1, 'px');
		this.addSliderTo(displayDetails, 'Межстрочный интервал', 'Плотность строк основного текста.', 'lineHeight', 1, 1.8, 0.01, '');
		this.addSliderTo(displayDetails, 'Верхнее поле', 'Внутреннее верхнее поле листа.', 'paddingTop', 20, 140, 2, 'px');
		this.addSliderTo(displayDetails, 'Правое поле', 'Внутреннее правое поле листа.', 'paddingRight', 20, 140, 2, 'px');
		this.addSliderTo(displayDetails, 'Нижнее поле', 'Внутреннее нижнее поле листа.', 'paddingBottom', 20, 140, 2, 'px');
		this.addSliderTo(displayDetails, 'Левое поле', 'Внутреннее левое поле листа.', 'paddingLeft', 20, 140, 2, 'px');
		containerEl.createEl('h3', { text: 'Настройка инструментов и функциональности' });
		for (const [groupName, ids] of TOOLBAR_GROUPS) {
			const details = containerEl.createEl('details', { cls: 'word-like-toolbar-settings-group' });
			const summary = details.createEl('summary');
		 summary.createSpan({ text: groupName });
		if (groupName === 'Панель инструментов') { const reset = summary.createEl('button', { text: 'Сбросить', cls: 'word-like-summary-reset', attr: { type: 'button' } }); reset.addEventListener('click', async (event) => { event.preventDefault(); event.stopPropagation(); this.plugin.settings.toolbarCommands = [...DEFAULT_SETTINGS.toolbarCommands]; this.plugin.settings.toolbarEnabled = true; await this.plugin.saveSettings(); this.plugin.refreshToolbar(); this.display(); }); }
			if (groupName === 'Панель инструментов') new Setting(details)
				.setName('Использовать панель инструментов')
				.setDesc('Компактная верхняя панель с выбранными Word-подобными действиями.')
				.addToggle((toggle) => toggle.setValue(this.plugin.settings.toolbarEnabled).onChange(async (value) => { this.plugin.settings.toolbarEnabled = value; await this.plugin.saveSettings(); this.plugin.refreshToolbar(); }));
			for (const id of ids) {
				const spec = TOOLBAR_COMMANDS[id];
				const commandSetting = new Setting(details).setName(spec.name);
				setIcon(commandSetting.nameEl.createSpan({ cls: 'word-like-setting-icon' }), spec.icon);
				commandSetting.addToggle((toggle) => toggle.setValue(this.plugin.settings.toolbarCommands.includes(id)).onChange(async (value) => {
						const list = new Set(this.plugin.settings.toolbarCommands); value ? list.add(id) : list.delete(id);
						this.plugin.settings.toolbarCommands = [...list]; await this.plugin.saveSettings(); this.plugin.refreshToolbar();
					}));
			}
		}

	}

	addSliderTo(target, name, desc, key, min, max, step, suffix) {
		new Setting(target)
			.setName(name)
			.setDesc(desc)
			.addSlider((slider) => slider
				.setLimits(min, max, step)
				.setValue(this.plugin.settings[key])
				.setDynamicTooltip()
				.onChange((value) => this.updateSetting(key, value)))
			.addExtraButton((button) => button
				.setIcon('reset')
				.setTooltip(`Сбросить: ${DEFAULT_SETTINGS[key]}${suffix}`)
				.onClick(() => this.updateSetting(key, DEFAULT_SETTINGS[key])));
	}

	async updateSetting(key, value) {
		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
		this.plugin.applySettings();
	}
}

module.exports = WordLikeDocumentViewPlugin;



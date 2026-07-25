'use strict';

const { Notice, Plugin, PluginSettingTab, Setting } = require('obsidian');

const PLUGIN_ID = 'word-like-document-view';
const PLUGIN_VERSION = '2026-07-18-caret-search-contrast';
const DEFAULT_SETTINGS = {
	enabled: true,
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
	hideInnerScrollbar: true
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
	'lineHeight'
];

const BODY_CLASSES = [
	'word-like-document-view-enabled',
	'word-like-document-view-static-page',
	'word-like-document-view-compat-dark',
	'word-like-document-view-show-inner-scrollbar',
	'word-like-document-view-document-light',
	'word-like-document-view-document-dark',
	'word-like-document-view-env-focus-dark',
	'word-like-document-view-env-word2019-blue',
	'word-like-document-view-env-word2000-blue'
];

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
	'--docxer-md-page-width-base',
	'--docxer-md-page-min-height-base',
	'--docxer-md-margin-top-base',
	'--docxer-md-margin-bottom-base',
	'--docxer-md-padding-top-base',
	'--docxer-md-padding-right-base',
	'--docxer-md-padding-bottom-base',
	'--docxer-md-padding-left-base',
	'--docxer-md-font-size-base',
	'--docxer-md-line-height'
];

class WordLikeDocumentViewPlugin extends Plugin {
	async onload() {
		await this.loadSettings();
		this.applySettings();

		this.registerEvent(this.app.workspace.on('layout-change', () => this.queueApplySettings()));
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.queueApplySettings()));

		this.addSettingTab(new WordLikeDocumentSettingTab(this.app, this));
		this.addCommands();
	}

	onunload() {
		if (this.applyFrame) {
			window.cancelAnimationFrame(this.applyFrame);
			this.applyFrame = null;
		}
		this.clearBodyState();
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
		this.settings.disableReadableLineLength = Boolean(this.settings.disableReadableLineLength);
		this.settings.scalePageWithZoom = Boolean(this.settings.scalePageWithZoom);
		this.settings.hideInnerScrollbar = Boolean(this.settings.hideInnerScrollbar);
		this.settings.fixDarkThemeContrast = Boolean(this.settings.fixDarkThemeContrast);

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

	applySettings() {
		document.body.dataset.wordLikeDocumentViewVersion = PLUGIN_VERSION;
		if (!this.settings.enabled) {
			this.clearBodyState();
			document.body.dataset.wordLikeDocumentViewVersion = PLUGIN_VERSION;
			return;
		}

		document.body.classList.add('word-like-document-view-enabled');
		document.body.classList.toggle('word-like-document-view-static-page', !this.settings.scalePageWithZoom);
		document.body.classList.toggle('word-like-document-view-show-inner-scrollbar', !this.settings.hideInnerScrollbar);
		document.body.classList.toggle('word-like-document-view-compat-dark', this.settings.fixDarkThemeContrast);
		document.body.classList.toggle('word-like-document-view-document-light', this.settings.documentTheme === 'light');
		document.body.classList.toggle('word-like-document-view-document-dark', this.settings.documentTheme === 'dark');
		document.body.classList.toggle('word-like-document-view-env-focus-dark', this.settings.environmentTheme === 'focusDark');
		document.body.classList.toggle('word-like-document-view-env-word2019-blue', this.settings.environmentTheme === 'word2019Blue');
		document.body.classList.toggle('word-like-document-view-env-word2000-blue', this.settings.environmentTheme === 'word2000Blue');

		this.setCssVariables();
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
		containerEl.createEl('h2', { text: 'Word-like Document View' });

		new Setting(containerEl)
			.setName('Включить Word-like вид')
			.setDesc('Оформляет только markdown-область как лист Word/Docxer. Не переписывает Obsidian целиком.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enabled)
				.onChange((value) => this.updateSetting('enabled', value)));

		new Setting(containerEl)
			.setName('Окружение вокруг документа')
			.setDesc('Экспериментально. Самый безопасный вариант - не менять панели Obsidian.')
			.addDropdown((dropdown) => dropdown
				.addOption('none', 'Не менять панели')
				.addOption('focusDark', 'Тёмно-серый фокус')
				.addOption('word2019Blue', 'Word 2019 синий')
				.addOption('word2000Blue', 'Word 2000 синий')
				.setValue(this.plugin.settings.environmentTheme)
				.onChange((value) => this.updateSetting('environmentTheme', value)));

		new Setting(containerEl)
			.setName('Цвет документа')
			.setDesc('Белый лист ближе к Word; тёмный лист остаётся отдельным вариантом для тёмной темы Obsidian.')
			.addDropdown((dropdown) => dropdown
				.addOption('light', 'Белый лист Word')
				.addOption('dark', 'Тёмный лист Obsidian')
				.setValue(this.plugin.settings.documentTheme)
				.onChange((value) => this.updateSetting('documentTheme', value)));

		new Setting(containerEl)
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

		new Setting(containerEl)
			.setName('Масштабировать страницу целиком')
			.setDesc('Ctrl+колёсико увеличивает лист, поля и текст вместе.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.scalePageWithZoom)
				.onChange((value) => this.updateSetting('scalePageWithZoom', value)));

		new Setting(containerEl)
			.setName('Отключать readable line length')
			.setDesc('Не рекомендуется. Меняет глобальную настройку Obsidian; включать только если ограничение ширины явно мешает листу.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.disableReadableLineLength)
				.onChange((value) => this.updateSetting('disableReadableLineLength', value)));

		new Setting(containerEl)
			.setName('Скрывать внутренний scrollbar редактора')
			.setDesc('Убирает второй scrollbar внутри редактора, но не меняет прокрутку документа.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.hideInnerScrollbar)
				.onChange((value) => this.updateSetting('hideInnerScrollbar', value)));

		new Setting(containerEl)
			.setName('Исправить контраст ссылок в тёмной теме')
			.setDesc('Только для ссылок и сносок в редакторе; не меняет popover, callout и свойства.')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.fixDarkThemeContrast)
				.onChange((value) => this.updateSetting('fixDarkThemeContrast', value)));

		this.addSlider('Ширина листа', 'Базовая ширина листа при 100% масштабе.', 'pageWidth', 600, 1100, 10, 'px');
		this.addSlider('Размер шрифта', 'Базовый размер основного текста.', 'fontSize', 12, 22, 1, 'px');
		this.addSlider('Межстрочный интервал', 'Плотность строк основного текста.', 'lineHeight', 1, 1.8, 0.01, '');
		this.addSlider('Верхнее поле', 'Внутреннее верхнее поле листа.', 'paddingTop', 20, 140, 2, 'px');
		this.addSlider('Правое поле', 'Внутреннее правое поле листа.', 'paddingRight', 20, 140, 2, 'px');
		this.addSlider('Нижнее поле', 'Внутреннее нижнее поле листа.', 'paddingBottom', 20, 140, 2, 'px');
		this.addSlider('Левое поле', 'Внутреннее левое поле листа.', 'paddingLeft', 20, 140, 2, 'px');

		new Setting(containerEl)
			.setName('Сбросить настройки')
			.setDesc('Вернуть безопасные значения текущей версии.')
			.addButton((button) => button
				.setButtonText('Сбросить')
				.onClick(async () => {
					this.plugin.settings = { ...DEFAULT_SETTINGS };
					await this.plugin.saveSettings();
					this.plugin.applySettings();
					this.display();
				}));
	}

	addSlider(name, desc, key, min, max, step, suffix) {
		new Setting(this.containerEl)
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

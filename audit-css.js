'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const modules = [
	'00-tokens.css',
	'10-document.css',
	'20-adapter.css',
	'30-tables.css',
	'40-properties.css',
	'50-previews.css',
	'60-links.css',
	'70-callouts.css',
	'80-theme-compat.css',
	'90-toolbar.css',
	'95-compat-tail.css'
];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const source = modules.map((file) => read(path.join('styles', file))).join('\n');
const bundle = read('styles.css');
const toolbarSource = read(path.join('styles', '90-toolbar.css')).replace(/\/\*[\s\S]*?\*\//g, '');
const unscopedMarkdownSelectors = bundle.split(/\r?\n/).filter((line) =>
	line.includes('body.word-like-document-view-enabled .markdown-') ||
	line.includes('body.word-like-document-view-enabled :is(.markdown-')
);
const checks = [
	['styles.css собран из всех CSS-модулей', source === bundle],
	['в CSS нет несбалансированных фигурных скобок', (bundle.match(/{/g) || []).length === (bundle.match(/}/g) || []).length],
	['в bundle нет прямых селекторов нативных leaf-контейнеров', !bundle.includes('workspace-leaf-content[data-type=') && !bundle.includes('workspace-leaf-content[data-type="')],
	['панель инструментов не требует !important', !toolbarSource.includes('!important')],
	['нативные Markdown-селекторы проходят через host-адаптер', unscopedMarkdownSelectors.length === 0],
	['есть собственные точки подключения Markdown и PDF', bundle.includes('word-like-document-view-host-markdown') && bundle.includes('word-like-document-view-host-pdf')],
	['есть общий контракт визуальных токенов', bundle.includes('--docxer-md-canvas') && bundle.includes('--docxer-md-page') && bundle.includes('--docxer-md-ink')]
];

let failed = 0;
for (const [label, ok] of checks) {
	console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
	if (!ok) failed += 1;
}

console.log(`INFO !important в bundle: ${(bundle.match(/!important/g) || []).length}`);
console.log(`INFO модулей: ${modules.length}`);
if (failed > 0) process.exitCode = 1;

const state = { entries: [], selected: null };
const $ = id => document.getElementById(id);
const cards = $('cards');
const dialog = $('reader');

function renderCards() {
  const q = $('search').value.trim().toLocaleLowerCase();
  const course = $('course').value;
  const matches = state.entries.filter(e => (!course || e.course === course) && [e.title,e.course,e.summary,e.author,e.path].join(' ').toLocaleLowerCase().includes(q));
  cards.replaceChildren();
  if (!matches.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = state.entries.length ? '没有找到匹配的题解，试试其他关键词。' : '暂无题解，欢迎从 GitHub 添加第一份。'; cards.append(empty); return; }
  for (const e of matches) {
    const card = document.createElement('article'); card.className = 'card';
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = e.course;
    const title = document.createElement('h3'); title.textContent = e.title;
    const description = document.createElement('p'); description.textContent = e.summary || '打开题解，阅读推导过程与 LaTeX 源码。';
    const bottom = document.createElement('div'); bottom.className = 'card-bottom';
    const author = document.createElement('span'); author.textContent = e.author || '开放题解';
    const button = document.createElement('button'); button.textContent = '阅读解析 ↗'; button.addEventListener('click', () => openReader(e));
    bottom.append(author, button); card.append(tag,title,description,bottom); cards.append(card);
  }
}

async function openReader(e) {
  state.selected = e;
  $('readerTitle').textContent = e.title;
  $('readerCourse').textContent = e.course;
  $('renderFrame').src = e.html || 'about:blank';
  $('renderFrame').hidden = !e.html;
  $('renderEmpty').hidden = !!e.html;
  $('pdfLink').hidden = !e.pdf;
  if (e.pdf) $('pdfLink').href = e.pdf;
  $('sourceCode').textContent = '正在加载源码…';
  selectTab('render');
  dialog.showModal();
  try { const r = await fetch(e.source); if (!r.ok) throw new Error(); const source = await r.text(); if (state.selected === e) $('sourceCode').textContent = source; }
  catch { $('sourceCode').textContent = '源码加载失败，请稍后重试。'; }
}

function selectTab(name) {
  $('renderPanel').hidden = name !== 'render';
  $('sourcePanel').hidden = name !== 'source';
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
}

document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));
$('close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { $('renderFrame').src = 'about:blank'; state.selected = null; });
$('search').addEventListener('input', renderCards);
$('course').addEventListener('change', renderCards);

fetch('catalog.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(entries => {
  state.entries = entries;
  $('count').textContent = `${entries.length} 份题解`;
  for (const name of [...new Set(entries.map(e => e.course))].sort()) { const option = document.createElement('option'); option.value = name; option.textContent = name; $('course').append(option); }
  renderCards();
}).catch(() => { $('count').textContent = '目录加载失败'; cards.innerHTML = '<div class="empty">题解目录暂时无法加载，请刷新页面。</div>'; });

// GitHub Pages project sites use /owner/repository; resolve the repository from the published path.
const parts = location.pathname.split('/').filter(Boolean);
if (location.hostname.endsWith('.github.io') && parts[0]) $('repoLink').href = `https://github.com/${location.hostname.split('.')[0]}/${encodeURIComponent(parts[0])}`;
else $('repoLink').href = 'https://github.com';

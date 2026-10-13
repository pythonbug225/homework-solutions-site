const state = { entries: [], selected: null };
const $ = id => document.getElementById(id);
const tree = $('tree');
const dialog = $('reader');

function renderTree() {
  const q = $('search').value.trim().toLocaleLowerCase();
  const entries = state.entries.filter(e => [e.title,e.course,e.summary,e.author,e.path].join(' ').toLocaleLowerCase().includes(q));
  tree.replaceChildren();
  if (!entries.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = state.entries.length ? '没有找到匹配的题解，试试其他关键词。' : '暂无题解，欢迎从 GitHub 添加第一份。'; tree.append(empty); return; }
  const root = { folders: new Map(), files: [] };
  for (const e of entries) {
    let node = root;
    for (const folder of e.folders) {
      if (!node.folders.has(folder)) node.folders.set(folder, { folders: new Map(), files: [] });
      node = node.folders.get(folder);
    }
    node.files.push(e);
  }
  function draw(node, parent, depth) {
    for (const [name, child] of node.folders) {
      const details = document.createElement('details'); details.className = 'folder'; details.open = depth === 0 || !!q;
      const summary = document.createElement('summary'); summary.textContent = name;
      details.append(summary); draw(child, details, depth + 1); parent.append(details);
    }
    for (const e of node.files) {
      const button = document.createElement('button'); button.className = 'file'; button.type = 'button';
      const icon = document.createElement('span'); icon.textContent = 'TEX'; icon.className = 'file-icon';
      const words = document.createElement('span'); words.className = 'file-words';
      const title = document.createElement('strong'); title.textContent = e.title;
      const description = document.createElement('small'); description.textContent = e.summary || e.path.split('/').at(-1);
      words.append(title, description); button.append(icon, words); button.addEventListener('click', () => openReader(e)); parent.append(button);
    }
  }
  draw(root, tree, 0);
}

async function openReader(e) {
  state.selected = e;
  $('readerTitle').textContent = e.title;
  $('readerCourse').textContent = e.folders.join(' / ');
  $('renderFrame').src = e.html || 'about:blank';
  $('renderFrame').hidden = !e.html;
  $('renderEmpty').hidden = !!e.html;
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
$('search').addEventListener('input', renderTree);
fetch('catalog.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(entries => {
  state.entries = entries;
  $('count').textContent = `${entries.length} 份题解`;
  renderTree();
}).catch(() => { $('count').textContent = '目录加载失败'; tree.innerHTML = '<div class="empty">题解目录暂时无法加载，请刷新页面。</div>'; });

const parts = location.pathname.split('/').filter(Boolean);
if (location.hostname.endsWith('.github.io') && parts[0]) $('repoLink').href = `https://github.com/${location.hostname.split('.')[0]}/${encodeURIComponent(parts[0])}`;
else $('repoLink').href = 'https://github.com';

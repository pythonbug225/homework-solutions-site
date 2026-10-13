const catalog = document.getElementById('catalog');
const search = document.getElementById('search');
let data = [];
function draw() {
  const q = search.value.trim().toLocaleLowerCase();
  catalog.replaceChildren();
  let shown = 0;
  for (const category of data) {
    const courses = category.courses.map(course => ({ ...course, resources: course.resources.filter(resource => [category.name,course.name,resource.name].join(' ').toLocaleLowerCase().includes(q)) })).filter(course => course.resources.length);
    if (!courses.length) continue;
    const section = document.createElement('section'); section.className = 'category'; section.id = category.name;
    const heading = document.createElement('h2'); heading.textContent = category.name; section.append(heading);
    const grid = document.createElement('div'); grid.className = 'course-grid';
    for (const course of courses) {
      const block = document.createElement('div'); block.className = 'course';
      const name = document.createElement('h3'); name.textContent = course.name; block.append(name);
      const list = document.createElement('div'); list.className = 'resource-list';
      for (const resource of course.resources) {
        const link = document.createElement('a'); link.href = resource.url; link.className = 'resource-link';
        const title = document.createElement('span'); title.textContent = resource.name;
        const arrow = document.createElement('span'); arrow.textContent = '›'; arrow.setAttribute('aria-hidden','true');
        link.append(title,arrow); list.append(link); shown++;
      }
      block.append(list); grid.append(block);
    }
    section.append(grid); catalog.append(section);
  }
  if (!shown) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = data.length ? '没有找到匹配的资源。' : '暂无资源，请从仓库上传题解。'; catalog.append(empty); }
}
search.addEventListener('input', draw);
fetch('catalog.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(value => { data = value; draw(); }).catch(() => { catalog.textContent = '资源目录暂时无法加载，请稍后刷新。'; });

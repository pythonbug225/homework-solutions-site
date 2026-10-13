const catalog = document.getElementById('catalogSections');
const categoryNav = document.getElementById('categoryNav');
const search = document.getElementById('search');
const stats = document.getElementById('stats');
let data = [];

function resourceKind(name) {
  if (/期末|期中|考试|试卷|试题/.test(name)) return '试卷';
  if (/讲义|笔记/.test(name)) return '讲义';
  if (/习题|作业|题解/.test(name)) return '习题';
  return '资料';
}

function draw() {
  const q = search.value.trim().toLocaleLowerCase();
  catalog.replaceChildren();
  categoryNav.replaceChildren();
  let shown = 0;
  for (const category of data) {
    const courses = category.courses.map(course => ({ ...course, resources: course.resources.filter(resource => [category.name, course.name, resource.name, resource.summary || ''].join(' ').toLocaleLowerCase().includes(q)) })).filter(course => course.resources.length);
    if (!courses.length) continue;
    const section = document.createElement('section');
    section.className = 'category'; section.id = category.name;
    const heading = document.createElement('div'); heading.className = 'category-heading';
    const label = document.createElement('h3'); label.textContent = category.name;
    const count = document.createElement('span'); count.textContent = `${courses.length} 门课程`;
    heading.append(label, count); section.append(heading);
    const nav = document.createElement('a'); nav.href = `#${encodeURIComponent(category.name)}`;
    const navName = document.createElement('span'); navName.textContent = category.name;
    const navCount = document.createElement('small'); navCount.textContent = courses.reduce((n, course) => n + course.resources.length, 0);
    nav.append(navName, navCount); categoryNav.append(nav);
    for (const course of courses) {
      const block = document.createElement('div'); block.className = 'course';
      const name = document.createElement('h4'); name.textContent = course.name;
      const resources = document.createElement('div'); resources.className = 'resource-list';
      for (const resource of course.resources) {
        const link = document.createElement('a'); link.href = resource.url; link.className = 'resource-link';
        const type = document.createElement('span'); type.className = 'resource-kind'; type.textContent = resourceKind(resource.name);
        const title = document.createElement('span'); title.className = 'resource-title'; title.textContent = resource.name;
        const arrow = document.createElement('span'); arrow.className = 'resource-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden','true');
        link.append(type, title, arrow); resources.append(link); shown++;
      }
      block.append(name, resources); section.append(block);
    }
    catalog.append(section);
  }
  if (!shown) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = data.length ? '没有找到匹配的资源。' : '暂无资源，请从仓库上传题解。'; catalog.append(empty); }
}
search.addEventListener('input', draw);
fetch('catalog.json?v=20261013b').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(value => {
  data = value;
  const courses = data.reduce((n, category) => n + category.courses.length, 0);
  const resources = data.reduce((n, category) => n + category.courses.reduce((m, course) => m + course.resources.length, 0), 0);
  stats.textContent = `${courses} 门课程 · ${resources} 份资源`;
  draw();
}).catch(() => { catalog.textContent = '资源目录暂时无法加载，请稍后刷新。'; stats.textContent = '目录加载失败'; });

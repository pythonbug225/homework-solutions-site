#!/usr/bin/env python3
"""Build the course catalog, reusing rendered fragments and unchanged pages."""
import argparse
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import unicodedata
import urllib.request
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SOLUTIONS = ROOT / "solutions"
ORDER = ["公共课", "分析", "代数", "微分几何", "拓扑", "代数几何", "数论和表示论", "数学物理", "概率和统计", "应用", "博资考"]
META = re.compile(r"^%\s*(title|author|summary|source|renderer|legacy-title):\s*(.+)$", re.I)
EXAM = re.compile(r"试卷|试题|期中考试|期末考试")
DK = "习题：数学分析（DK）"
LOU = "习题：楼分析"


def digest(data):
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def metadata(source):
    info = {}
    for line in source.splitlines()[:40]:
        match = META.match(line)
        if match:
            info[match.group(1).lower()] = match.group(2).strip()
    return info


def url_parts(parts):
    return "/".join(quote(part) for part in parts)


def write_if_changed(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.read_bytes() == data:
        return False
    path.write_bytes(data)
    return True


def run(command, cwd):
    try:
        result = subprocess.run(command, cwd=cwd, text=True, capture_output=True, timeout=180)
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        raise RuntimeError(f"Build command failed: {exc}") from exc
    if result.returncode:
        raise RuntimeError(f"{' '.join(map(str, command))}: {(result.stdout + result.stderr)[-2500:]}")


def norm(value):
    return re.sub(r"[^\w]+", "", unicodedata.normalize("NFKC", value)).casefold()


def section_id(rel):
    return "part-" + hashlib.sha1(str(rel).encode("utf-8")).hexdigest()[:10]


def group_for(doc, parents):
    category, course, name = doc["rel"].parts[:3]
    if category == "分析" and course == "数学分析":
        if name == DK:
            return "2025年秋 · 数学分析 AI(H) 习题", "", True
        if name.startswith(DK + " · ") and not EXAM.search(name):
            part = name[len(DK) + 3:]
            year = "2026年春 · 数学分析 AII(H) 习题" if "Euclid 空间的基本概念" in part else "2025年秋 · 数学分析 AI(H) 习题"
            return year, part, False
        if name == LOU:
            return "楼分析习题", "", True
        if name.startswith(LOU + " · "):
            return "楼分析习题", name[len(LOU) + 3:], False
    for parent in parents[(category, course)]:
        if name == parent:
            return parent, "", True
        if name.startswith(parent + " · ") and not EXAM.search(name):
            return parent, name[len(parent) + 3:], False
    return name, doc["info"].get("title", doc["tex"].stem), False


def part_order(doc, parent_text):
    parts = re.findall(r"\\subpage!?\{([^}]*)\}", parent_text)
    part = norm(doc["part"])
    for index, title in enumerate(parts):
        if norm(title) == part:
            return index
    match = re.search(r"Week\s*(\d+)", doc["part"], re.I)
    return 1000 + int(match.group(1)) if match else 2000


def render_raw(doc, cache):
    source, info = doc["source"], doc["info"]
    renderer = info.get("renderer", "pandoc")
    cached = ROOT / "assets" / "rendered-fallback" / (digest(source) + ".html")
    if renderer == "btex" and cached.is_file():
        return cached.read_text(encoding="utf-8"), True, False
    key = digest("fragment-v2\0" + renderer + "\0" + source)
    target = cache / "fragments" / (key + ".html")
    if target.is_file():
        return target.read_text(encoding="utf-8"), False, False
    target.parent.mkdir(parents=True, exist_ok=True)
    if renderer == "btex":
        payload = json.dumps({"code": source}, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(os.environ.get("BTEX_URL", "http://127.0.0.1:7200"), payload, {"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.load(response)
        if result.get("errors"):
            raise RuntimeError("; ".join(map(str, result["errors"][:4])))
        fragment = result["html"]
        if "[TikZ 编译错误]" in fragment:
            raise RuntimeError("TikZ diagram conversion failed")
        write_if_changed(target, fragment.encode("utf-8"))
    else:
        run(["pandoc", "-f", "latex", "-t", "html5", "--mathml", "-o", str(target), doc["tex"].name], doc["tex"].parent)
        fragment = target.read_text(encoding="utf-8")
    return fragment, False, True


def needs_renderer(cache):
    """Check whether any content fragment is missing before installing TeX tools."""
    docs = []
    names = defaultdict(list)
    for tex in SOLUTIONS.rglob("*.tex"):
        source = tex.read_text(encoding="utf-8")
        doc = {"tex": tex, "rel": tex.relative_to(SOLUTIONS), "source": source, "info": metadata(source)}
        docs.append(doc)
        names[doc["rel"].parts[:2]].append(doc["rel"].parts[2])
    parents = defaultdict(list)
    for key, values in names.items():
        parents[key] = [n for n in values if not EXAM.search(n) and sum(v.startswith(n + " · ") for v in values) >= 3]
    for doc in docs:
        _, _, skip = group_for(doc, parents)
        if skip:
            continue
        renderer = doc["info"].get("renderer", "pandoc")
        if renderer == "btex" and (ROOT / "assets" / "rendered-fallback" / (digest(doc["source"]) + ".html")).is_file():
            continue
        key = digest("fragment-v2\0" + renderer + "\0" + doc["source"])
        if not (cache / "fragments" / (key + ".html")).is_file():
            return True
    return False


def replace_btex_links(fragment, doc, lookup):
    legacy_title = doc["info"].get("legacy-title", "")

    def link(match):
        page = html.unescape(match.group(1))
        target = legacy_title + "/" + page[2:] if page.startswith("./") else page
        href = lookup.get(target) or "https://bananaspace.org/legacy/wiki/" + quote(target.replace(" ", "_"), safe=":/()")
        if href.startswith("resources/"):
            href = "../../../../" + href
        return f'<a href="{html.escape(href, quote=True)}">{match.group(2)}</a>'

    return re.sub(r'<btex-link data-page="([^"]*)">(.*?)</btex-link>', link, fragment, flags=re.S)


def document_page(category, course, resource, files, siblings):
    esc = html.escape
    crumb = (f'<a href="../../../../index.html">全部课程</a><span>›</span>'
             f'<a href="../../../../index.html#{quote(category)}">{esc(category)}</a><span>›</span>'
             f'<span>{esc(course)}</span><span>›</span><span>{esc(resource)}</span>')
    grouped = len(files) > 1 or any(item["part"] != item["title"] for item in files)
    if grouped:
        nav = ''.join(f'<a class="side-link" href="#{item["id"]}">{esc(item["part"])}</a>' for item in files)
        sidebar_title = resource
        sidebar_label = "本页目录"
        nav += '<p class="sidebar-other"><a href="../../../../index.html#' + quote(category) + '">← 返回课程目录</a></p>'
    else:
        nav = ''.join(f'<a class="side-link{" current" if name == resource else ""}" href="../{quote(name)}/">{esc(name)}</a>' for name in siblings)
        sidebar_title = course
        sidebar_label = "课程资源"
    blocks = []
    for item in files:
        links = f'<a href="{esc(item["source_url"])}" download>下载 .tex</a>'
        origin = item["info"].get("source", "")
        credit = (f'<p class="source-credit">原文来源：<a href="{esc(origin, quote=True)}" rel="noopener noreferrer">香蕉空间旧站 ↗</a> · '
                  '<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a></p>' if origin.startswith("https://bananaspace.org/") else "")
        blocks.append(f'<section class="document" id="{item["id"]}"><div class="document-bar"><h2>{esc(item["part"])}</h2>'
                      f'<div class="actions">{links}</div></div>{credit}<div class="tex-body">{item["rendered"]}</div></section>')
    template = (ROOT / "web" / "resource.html").read_text(encoding="utf-8")
    return (template.replace("{{TITLE}}", esc(resource + " · " + course))
            .replace("{{COURSE}}", esc(course)).replace("{{RESOURCE}}", esc(resource))
            .replace("{{BREADCRUMB}}", crumb).replace("{{SIDEBAR}}", nav)
            .replace("{{SIDEBAR_TITLE}}", esc(sidebar_title)).replace("{{SIDEBAR_LABEL}}", sidebar_label)
            .replace("{{PAGE_ACTIONS}}", '<div class="resource-tools"><button type="button" onclick="window.print()">导出本页 PDF ↓</button></div>')
            .replace("{{DOCUMENTS}}", "\n".join(blocks))
            .replace("{{EXTRA_STYLES}}", '<link rel="stylesheet" href="../../../../assets/katex.min.css">' if any(item["info"].get("renderer") == "btex" for item in files) else ""))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    parser.add_argument("--cache-dir", type=Path, default=ROOT / ".build-cache")
    parser.add_argument("--incremental", action="store_true")
    parser.add_argument("--check-render-cache", action="store_true")
    args = parser.parse_args()
    out, cache = args.output.resolve(), args.cache_dir.resolve()
    if args.check_render_cache:
        print("yes" if needs_renderer(cache) else "no")
        return
    if out == ROOT or ROOT not in out.parents or cache == ROOT or ROOT not in cache.parents:
        raise SystemExit("Output and cache must be inside the repository")
    if out.exists() and not args.incremental:
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "style.css", "app.js"):
        write_if_changed(out / name, (ROOT / "web" / name).read_bytes())

    docs = []
    for tex in sorted(SOLUTIONS.rglob("*.tex")):
        source = tex.read_text(encoding="utf-8")
        docs.append({"tex": tex, "rel": tex.relative_to(SOLUTIONS), "source": source, "info": metadata(source)})
    names = defaultdict(list)
    for doc in docs:
        category, course, name = doc["rel"].parts[:3]
        names[(category, course)].append(name)
    parents = defaultdict(list)
    for key, values in names.items():
        parents[key] = sorted((n for n in values if not EXAM.search(n) and sum(v.startswith(n + " · ") for v in values) >= 3), key=len, reverse=True)
    parent_text = {doc["rel"].parts[:3]: doc["source"] for doc in docs}
    groups = defaultdict(list)
    redirects = {}
    lookup = {}
    for doc in docs:
        category, course, original = doc["rel"].parts[:3]
        group, part, skip = group_for(doc, parents)
        doc.update(group=group, part=part, id=section_id(doc["rel"]))
        group_url = "resources/" + url_parts((category, course, group)) + "/"
        destination = group_url + ("#" + doc["id"] if not skip and group != original else "")
        if doc["info"].get("legacy-title"):
            lookup[doc["info"]["legacy-title"]] = destination
        if group != original:
            redirects[(category, course, original)] = destination
        if not skip:
            groups[(category, course, group)].append(doc)
    # Preserve old deep links as lightweight redirects after grouping.
    grouped_courses = defaultdict(dict)
    for (category, course, group), files in groups.items():
        parent = next((n for n in parents[(category, course)] if n == group), None)
        if category == "分析" and course == "数学分析":
            parent = DK if group.startswith(("2025年秋", "2026年春")) else LOU if group == "楼分析习题" else parent
        source = parent_text.get((category, course, parent), "") if parent else ""
        files.sort(key=lambda doc: (part_order(doc, source), doc["part"]))
        grouped_courses[(category, course)][group] = files

    btex_files = [doc for doc in docs if doc["info"].get("renderer") == "btex"]
    if btex_files and not (out / "assets" / "katex.min.css").is_file():
        katex = Path(os.environ.get("BTEX_KATEX_DIR", str(ROOT / "work" / "btex" / "node_modules" / "katex" / "dist")))
        write_if_changed(out / "assets" / "katex.min.css", (katex / "katex.min.css").read_bytes())
        for font in (katex / "fonts").iterdir():
            if font.is_file():
                write_if_changed(out / "assets" / "fonts" / font.name, font.read_bytes())

    failures = []
    rendered_count = 0
    reused_count = 0
    for doc in docs:
        target = out / "files" / doc["rel"]
        write_if_changed(target, doc["source"].encode("utf-8"))
        if doc["part"] == "":
            continue
        try:
            fragment, processed, freshly_rendered = render_raw(doc, cache)
            doc["rendered"] = fragment if processed or doc["info"].get("renderer") != "btex" else replace_btex_links(fragment, doc, lookup)
            rendered_count += int(freshly_rendered)
            reused_count += int(not freshly_rendered)
        except Exception as exc:
            failures.append(f"{doc['rel']}: {exc}")
            doc["rendered"] = '<p class="notice">此文件暂时无法渲染，请下载 LaTeX 源码查看。</p>'
    active_sources = {out / "files" / doc["rel"] for doc in docs}
    for old in (out / "files").rglob("*.tex"):
        if old not in active_sources:
            old.unlink()
    if failures:
        raise SystemExit("HTML rendering failed:\n" + "\n".join(failures))

    previous_path = cache / "pages.json"
    previous = json.loads(previous_path.read_text(encoding="utf-8")) if previous_path.is_file() else {}
    current = {}
    page_code = digest(Path(__file__).read_text(encoding="utf-8") + (ROOT / "web" / "resource.html").read_text(encoding="utf-8"))
    catalog = []
    changed_pages = 0
    for category in sorted({key[0] for key in groups}, key=lambda name: (ORDER.index(name) if name in ORDER else len(ORDER), name)):
        courses = []
        for course in sorted({key[1] for key in groups if key[0] == category}):
            resources = []
            siblings = sorted(grouped_courses[(category, course)])
            for resource in siblings:
                files = grouped_courses[(category, course)][resource]
                for doc in files:
                    doc["title"] = doc["info"].get("title", doc["tex"].stem)
                    doc["source_url"] = "../../../../files/" + url_parts(doc["rel"].parts)
                dest = out / "resources" / category / course / resource / "index.html"
                key = str(dest.relative_to(out))
                fingerprint = digest(page_code + resource + "\0" + repr(siblings) + "\0" + "\0".join(digest(doc["source"]) for doc in files))
                current[key] = fingerprint
                if previous.get(key) != fingerprint or not dest.is_file():
                    write_if_changed(dest, document_page(category, course, resource, files, siblings).encode("utf-8"))
                    changed_pages += 1
                kind = "试卷" if EXAM.search(resource) else "讲义" if re.search("讲义|笔记", resource) else "习题" if "习题" in resource else "资料"
                resources.append({"name": resource, "url": "resources/" + url_parts((category, course, resource)) + "/",
                                  "kind": kind, "search": " ".join(doc["part"] for doc in files),
                                  "summary": files[0]["info"].get("summary", "")})
            courses.append({"name": course, "resources": resources})
        catalog.append({"name": category, "courses": courses})

    for (category, course, old), target in redirects.items():
        dest = out / "resources" / category / course / old / "index.html"
        key = str(dest.relative_to(out))
        href = "../../../../" + target
        current[key] = digest(href)
        if previous.get(key) != current[key] or not dest.is_file():
            page = (f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>资源已合并</title>'
                    f'<meta http-equiv="refresh" content="0;url={html.escape(href, quote=True)}">'
                    f'<p>资源已合并：<a href="{html.escape(href, quote=True)}">前往新目录</a></p></html>')
            write_if_changed(dest, page.encode("utf-8"))
            changed_pages += 1
    for key in previous.keys() - current.keys():
        stale = out / key
        if stale.is_file():
            stale.unlink()
    write_if_changed(out / "catalog.json", json.dumps(catalog, ensure_ascii=False, indent=2).encode("utf-8"))
    write_if_changed(previous_path, json.dumps(current, ensure_ascii=False, indent=2).encode("utf-8"))
    print(f"Built {len(catalog)} categories, {sum(len(c['resources']) for cat in catalog for c in cat['courses'])} catalog resources; "
          f"rendered {rendered_count} changed TeX files, reused {reused_count} fragments, wrote {changed_pages} pages", flush=True)


if __name__ == "__main__":
    main()

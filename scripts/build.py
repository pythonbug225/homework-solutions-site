#!/usr/bin/env python3
"""Build a three-level course catalog and one page per resource folder."""
import argparse
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import urllib.request
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SOLUTIONS = ROOT / "solutions"
ORDER = ["公共课", "分析", "代数", "微分几何", "拓扑", "代数几何", "数论和表示论", "数学物理", "概率和统计", "应用", "博资考"]
META = re.compile(r"^%\s*(title|author|summary|source|renderer|legacy-title):\s*(.+)$", re.I)


def metadata(source):
    info = {}
    for line in source.splitlines()[:40]:
        match = META.match(line)
        if match:
            info[match.group(1).lower()] = match.group(2).strip()
    return info


def render_btex(source, lookup):
    payload = json.dumps({"code": source}, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(os.environ.get("BTEX_URL", "http://127.0.0.1:7200"), payload, {"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=180) as response:
        result = json.load(response)
    if result.get("errors"):
        raise RuntimeError("; ".join(map(str, result["errors"][:4])))
    fragment = result["html"]
    if "[TikZ 编译错误]" in fragment:
        raise RuntimeError("TikZ diagram conversion failed")
    legacy_title = metadata(source).get("legacy-title", "")

    def link(match):
        page = html.unescape(match.group(1))
        target = legacy_title + "/" + page[2:] if page.startswith("./") else page
        href = lookup.get(target)
        if href:
            href = "../../../../" + href
        else:
            href = "https://bananaspace.org/legacy/wiki/" + quote(target.replace(" ", "_"), safe=":/()")
        return f'<a href="{html.escape(href, quote=True)}">{match.group(2)}</a>'

    fragment = re.sub(r'<btex-link data-page="([^"]*)">(.*?)</btex-link>', link, fragment, flags=re.S)
    return fragment


def url_parts(parts):
    return "/".join(quote(part) for part in parts)


def run(command, cwd, timeout=120):
    try:
        result = subprocess.run(command, cwd=cwd, text=True, capture_output=True, timeout=timeout)
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        print(f"Build command failed: {exc}")
        return False
    if result.returncode:
        print(f"Build command failed in {cwd}: {' '.join(map(str, command))}\n{(result.stdout + result.stderr)[-3000:]}")
    return result.returncode == 0


def document_page(category, course, resource, files, siblings):
    esc = html.escape
    crumb = f'<a href="../../../../index.html">全部课程</a><span>›</span><a href="../../../../index.html#{quote(category)}">{esc(category)}</a><span>›</span><span>{esc(course)}</span><span>›</span><span>{esc(resource)}</span>'
    nav = ''.join(f'<a class="side-link{" current" if name == resource else ""}" href="../{quote(name)}/">{esc(name)}</a>' for name in siblings)
    blocks = []
    for item in files:
        links = (f'<button type="button" class="download" onclick="window.print()" '
                 f'aria-label="导出 {esc(item["title"], quote=True)} 的 PDF">导出 PDF ↓</button>'
                 f'<a href="{esc(item["source"])}" download>下载 .tex</a>')
        content = item["rendered"] if item["rendered"] else '<p class="notice">此文件暂时无法渲染，请下载 LaTeX 源码查看。</p>'
        origin = item.get("origin", "")
        credit = (f'<p class="source-credit">原文来源：<a href="{esc(origin, quote=True)}" rel="noopener noreferrer">香蕉空间旧站 ↗</a> · 已适配网页格式 · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a></p>' if origin.startswith("https://bananaspace.org/") else "")
        blocks.append(f'<section class="document"><div class="document-bar"><h2>{esc(item["title"])}</h2><div class="actions">{links}</div></div>{credit}<div class="tex-body">{content}</div></section>')
    template = (ROOT / "web" / "resource.html").read_text(encoding="utf-8")
    return (template.replace("{{TITLE}}", esc(resource + " · " + course))
            .replace("{{COURSE}}", esc(course))
            .replace("{{RESOURCE}}", esc(resource))
            .replace("{{BREADCRUMB}}", crumb)
            .replace("{{SIDEBAR}}", nav)
            .replace("{{DOCUMENTS}}", "\n".join(blocks))
            .replace("{{EXTRA_STYLES}}", '<link rel="stylesheet" href="../../../../assets/katex.min.css">' if any(item.get("renderer") == "btex" for item in files) else ""))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    out = args.output.resolve()
    if out == ROOT or ROOT not in out.parents:
        raise SystemExit("Output must be inside the repository")
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    for name in ("index.html", "style.css", "app.js"):
        shutil.copy2(ROOT / "web" / name, out / name)

    btex_files = [p for p in SOLUTIONS.rglob("*.tex") if metadata(p.read_text(encoding="utf-8")).get("renderer") == "btex"]
    legacy_lookup = {}
    for tex in btex_files:
        rel = tex.relative_to(SOLUTIONS)
        legacy_title = metadata(tex.read_text(encoding="utf-8")).get("legacy-title")
        if legacy_title:
            legacy_lookup[legacy_title] = "resources/" + url_parts(rel.parts[:3]) + "/"
    assets = out / "assets"
    if btex_files:
        katex = Path(os.environ.get("BTEX_KATEX_DIR", str(ROOT / "work" / "btex" / "node_modules" / "katex" / "dist")))
        assets.mkdir()
        shutil.copy2(katex / "katex.min.css", assets / "katex.min.css")
        shutil.copytree(katex / "fonts", assets / "fonts")

    tree = defaultdict(lambda: defaultdict(dict))
    count = 0
    render_failures = []
    for category_dir in sorted(SOLUTIONS.iterdir()) if SOLUTIONS.exists() else []:
        if not category_dir.is_dir():
            continue
        for course_dir in sorted(p for p in category_dir.iterdir() if p.is_dir()):
            for resource_dir in sorted(p for p in course_dir.iterdir() if p.is_dir()):
                tex_files = sorted(resource_dir.glob("*.tex"))
                if not tex_files:
                    continue
                tree[category_dir.name][course_dir.name][resource_dir.name] = []
                for tex in tex_files:
                    count += 1
                    source = tex.read_text(encoding="utf-8")
                    info = metadata(source)
                    rel = tex.relative_to(SOLUTIONS)
                    target = out / "files" / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(source, encoding="utf-8")
                    rendered = out / "work" / rel.with_suffix(".html")
                    rendered.parent.mkdir(parents=True, exist_ok=True)
                    if info.get("renderer") == "btex":
                        try:
                            cached = ROOT / "assets" / "rendered-fallback" / (hashlib.sha256(source.encode("utf-8")).hexdigest() + ".html")
                            fragment = cached.read_text(encoding="utf-8") if cached.is_file() else render_btex(source, legacy_lookup)
                            rendered.write_text(fragment, encoding="utf-8")
                            html_ok = True
                        except Exception as exc:
                            print(f"bTeX build failed for {tex.relative_to(ROOT)}: {exc}")
                            html_ok = False
                    else:
                        html_ok = run(["pandoc", "-f", "latex", "-t", "html5", "--mathml", "-o", str(rendered), tex.name], tex.parent)
                    if not html_ok:
                        render_failures.append(str(tex.relative_to(ROOT)))
                    tree[category_dir.name][course_dir.name][resource_dir.name].append({
                        "title": info.get("title", tex.stem),
                        "rendered": rendered.read_text(encoding="utf-8") if html_ok else "",
                        "source": "../../../../files/" + url_parts(rel.parts),
                        "origin": info.get("source", ""),
                        "summary": info.get("summary", ""),
                        "renderer": info.get("renderer", ""),
                    })
                    if count % 25 == 0:
                        print(f"Rendered {count} TeX files", flush=True)
    shutil.rmtree(out / "work", ignore_errors=True)
    catalog = []
    for category in sorted(tree, key=lambda name: (ORDER.index(name) if name in ORDER else len(ORDER), name)):
        courses = []
        for course in sorted(tree[category]):
            resources = []
            names = sorted(tree[category][course])
            for resource in names:
                dest = out / "resources" / category / course / resource / "index.html"
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(document_page(category, course, resource, tree[category][course][resource], names), encoding="utf-8")
                resources.append({"name": resource, "url": "resources/" + url_parts((category, course, resource)) + "/", "summary": tree[category][course][resource][0].get("summary", ""), "source": tree[category][course][resource][0].get("origin", "")})
            courses.append({"name": course, "resources": resources})
        catalog.append({"name": category, "courses": courses})
    (out / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {len(catalog)} categories and {count} TeX files")
    if render_failures:
        raise SystemExit("HTML rendering failed: " + ", ".join(render_failures))


if __name__ == "__main__":
    main()

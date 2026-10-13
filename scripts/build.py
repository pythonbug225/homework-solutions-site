#!/usr/bin/env python3
"""Build a three-level course catalog and one page per resource folder."""
import argparse
import html
import json
import re
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SOLUTIONS = ROOT / "solutions"
ORDER = ["公共课", "分析", "代数", "拓扑", "应用", "博资考"]
META = re.compile(r"^%\s*(title|author|summary):\s*(.+)$", re.I)


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
        links = f'<a href="{esc(item["source"])}" download>下载 .tex</a>'
        if item["pdf"]:
            links = f'<a class="download" href="{esc(item["pdf"])}" download>下载 PDF ↓</a>' + links
        content = item["rendered"] if item["rendered"] else '<p class="notice">此文件暂时无法渲染，请下载 LaTeX 源码查看。</p>'
        blocks.append(f'<section class="document"><div class="document-bar"><h2>{esc(item["title"])}</h2><div class="actions">{links}</div></div><div class="tex-body">{content}</div></section>')
    template = (ROOT / "web" / "resource.html").read_text(encoding="utf-8")
    return (template.replace("{{TITLE}}", esc(resource + " · " + course))
            .replace("{{COURSE}}", esc(course))
            .replace("{{RESOURCE}}", esc(resource))
            .replace("{{BREADCRUMB}}", crumb)
            .replace("{{SIDEBAR}}", nav)
            .replace("{{DOCUMENTS}}", "\n".join(blocks)))


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

    tree = defaultdict(lambda: defaultdict(dict))
    count = 0
    pdf_failures = []
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
                    info = {}
                    for line in source.splitlines()[:40]:
                        match = META.match(line)
                        if match:
                            info[match.group(1).lower()] = match.group(2).strip()
                    rel = tex.relative_to(SOLUTIONS)
                    target = out / "files" / rel
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(source, encoding="utf-8")
                    rendered = out / "work" / rel.with_suffix(".html")
                    rendered.parent.mkdir(parents=True, exist_ok=True)
                    html_ok = run(["pandoc", "-f", "latex", "-t", "html5", "--mathml", "-o", str(rendered), tex.name], tex.parent)
                    pdf = target.with_suffix(".pdf")
                    pdf_ok = run(["pandoc", "-f", "latex", "--pdf-engine=xelatex", "-V", "documentclass=ctexart", "-o", str(pdf), tex.name], tex.parent)
                    if not pdf_ok:
                        pdf_failures.append(str(tex.relative_to(ROOT)))
                    tree[category_dir.name][course_dir.name][resource_dir.name].append({
                        "title": info.get("title", tex.stem),
                        "rendered": rendered.read_text(encoding="utf-8") if html_ok else "",
                        "source": "../../../../files/" + url_parts(rel.parts),
                        "pdf": "../../../../files/" + url_parts(rel.with_suffix(".pdf").parts) if pdf_ok else None,
                    })
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
                resources.append({"name": resource, "url": "resources/" + url_parts((category, course, resource)) + "/"})
            courses.append({"name": course, "resources": resources})
        catalog.append({"name": category, "courses": courses})
    (out / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {len(catalog)} categories and {count} TeX files")
    if pdf_failures:
        raise SystemExit("PDF generation failed: " + ", ".join(pdf_failures))


if __name__ == "__main__":
    main()

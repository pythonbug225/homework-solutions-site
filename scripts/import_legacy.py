#!/usr/bin/env python3
"""Import existing Banana Space MediaWiki XML exports into course folders.

The input is data exported through Special:Export (current revisions only).
The original bTeX body is retained verbatim; the site builder renders it.
"""
import argparse
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
CATEGORY_ALIASES = {"分析和微分方程": "分析", "试题汇萃": "博资考"}
COURSE_ALIASES = {"复分析": "复变函数"}


def normalize(value):
    value = unicodedata.normalize("NFKC", value).replace("\\qquad", "")
    return "".join(char for char in value if char.isalnum()).casefold()


def clean_path(value):
    return value.strip().replace("/", "／").replace("\\", "＼").replace("\0", "")


def load_pages(directory):
    pages = {}
    for path in sorted(directory.glob("*.xml")):
        for page in ET.parse(path).getroot().findall(".//{*}page"):
            title = page.findtext("{*}title")
            body = page.find(".//{*}text")
            if title and body is not None:
                pages[title] = body.text or ""
    return pages


def index_entries(index):
    category = course = ""
    for match in re.finditer(r"\\(section|subsection\*|subpage!)\{([^{}]*)\}", index):
        command, value = match.groups()
        if command == "section":
            category = CATEGORY_ALIASES.get(value.strip(), value.strip())
        elif command == "subsection*":
            course = COURSE_ALIASES.get(value.strip(), value.strip())
        elif value.strip() and value.strip() != " ":
            yield category, course, value.replace("\\qquad", "").strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("exports", type=Path, help="directory of MediaWiki XML exports")
    parser.add_argument("--output", type=Path, default=ROOT / "solutions")
    args = parser.parse_args()
    pages = load_pages(args.exports)
    if "用户:Solution" not in pages:
        raise SystemExit("Missing the 用户:Solution catalog export")
    direct = {normalize(title.split("/", 1)[1]): title for title in pages if title.startswith("用户:Solution/") and title.count("/") == 1}
    imported = set()
    for category, course, label in index_entries(pages["用户:Solution"]):
        parent = direct.get(normalize(label))
        if not parent:
            continue  # non-existent link in the old catalog
        titles = [parent] + sorted(title for title in pages if title.startswith(parent + "/"))
        for title in titles:
            suffix = title[len(parent) + 1:] if title != parent else ""
            name = label if not suffix else f"{label} · {suffix}"
            dest = args.output / clean_path(category) / clean_path(course) / clean_path(name) / "正文.tex"
            if dest.exists() and "% renderer: btex" not in dest.read_text(encoding="utf-8"):
                raise SystemExit(f"Refusing to replace maintained source: {dest}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            source_url = "https://bananaspace.org/legacy/wiki/" + quote(title.replace(" ", "_"), safe=":/()")
            metadata = f"% title: {name}\n% renderer: btex\n% legacy-title: {title}\n% source: {source_url}\n% summary: 从香蕉空间旧站迁移的原始 bTeX 页面。\n"
            dest.write_text(metadata + pages[title], encoding="utf-8")
            imported.add(title)
    leftovers = [title for title in pages if title.startswith("用户:Solution/") and title not in imported]
    print(f"Imported {len(imported)} pages into {args.output}; unassigned: {len(leftovers)}")
    for title in leftovers[:20]:
        print("Unassigned:", title)


if __name__ == "__main__":
    main()

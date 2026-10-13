#!/usr/bin/env python3
"""Discover every LaTeX file and build a folder-based static Pages catalog."""
import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
META = re.compile(r"^%\s*(title|course|author|summary):\s*(.+)$", re.I)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    out = args.output.resolve()
    if out == ROOT or ROOT not in out.parents:
        raise SystemExit("Output must be a subdirectory of the repository")
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    shutil.copytree(ROOT / "web", out, dirs_exist_ok=True)
    entries = []
    for tex in sorted((ROOT / "solutions").rglob("*.tex")):
        source = tex.read_text(encoding="utf-8")
        rel = tex.relative_to(ROOT)
        info = {}
        for line in source.splitlines()[:40]:
            match = META.match(line)
            if match:
                info[match.group(1).lower()] = match.group(2).strip()
        target = out / "files" / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(source, encoding="utf-8")
        html = target.with_suffix(".html")
        html_ok = False
        try:
            rendered = subprocess.run(
                ["pandoc", "-f", "latex", "-t", "html5", "--standalone", "--mathml", "-M", f"title={info.get('title', tex.parent.name)}", "-o", str(html), tex.name],
                cwd=tex.parent, capture_output=True, text=True, timeout=60,
            )
            html_ok = rendered.returncode == 0 and html.exists()
            if not html_ok:
                print(f"HTML render failed: {rel}\n{(rendered.stdout + rendered.stderr)[-2000:]}")
        except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
            print(f"HTML render failed: {rel}: {exc}")
        entries.append({
            "title": info.get("title", tex.stem),
            "course": info.get("course", rel.parts[1] if len(rel.parts) > 2 else "其他"),
            "author": info.get("author", ""),
            "summary": info.get("summary", ""),
            "path": str(rel),
            "folders": list(rel.parts[1:-1]),
            "source": "files/" + "/".join(quote(p) for p in rel.parts),
            "html": "files/" + "/".join(quote(p) for p in rel.with_suffix(".html").parts) if html_ok else None,
        })
    (out / "catalog.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Discovered {len(entries)} TeX files; rendered {sum(bool(e['html']) for e in entries)} HTML pages")


if __name__ == "__main__":
    main()

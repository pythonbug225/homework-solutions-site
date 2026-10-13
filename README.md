# 作业解析 · Homework Solutions

公益性质的 LaTeX 作业解析目录，部署在 GitHub Pages。仓库转移给学校账号后，可以由新仓库的维护者继续维护。

## 添加解析

在 `solutions/` 下按课程和题目建立文件夹，例如 `solutions/高等数学/导数例题/main.tex`。每份要独立展示的 `.tex` 文件须包含 `\\documentclass` 和 `\\begin{document}`。同目录的图片、`.bib` 和被 `\\input` 的片段可以一并提交；片段不会单独编译。

在导言区写可选的元数据注释：

```tex
% title: 导数例题
% course: 高等数学
% author: 教研组
% summary: 链式法则与求导步骤
```

提交到 `main` 后，Actions 自动发现所有独立文档，用 Pandoc 生成网页公式（MathML），并用 XeLaTeX 编译 PDF，再把正文、PDF 和源码发布到 Pages。Pandoc 对复杂 LaTeX 宏包的支持有限；若网页转换失败仍可查看源码，PDF 编译结果单独标记。详细错误见 Actions 日志。请只合并可信维护者审核过的 LaTeX；TeX 文件可能读取构建环境中的文件，因此不要在编译任务中加入仓库密钥。

本地验证：`python3 scripts/build.py --output dist`。需要安装 `pandoc`、`latexmk`、`xelatex` 和相关字体/宏包。可加 `--no-compile` 跳过 PDF 编译。

## 交接

GitHub 仓库 Settings → General → Danger Zone → Transfer ownership 可将仓库转给学校组织账号。转移后检查 Pages 的 Actions 来源和站点 URL；项目站点的路径可能随新仓库名变化。仓库采用 MIT 许可证；题解内容请确保有发布授权。

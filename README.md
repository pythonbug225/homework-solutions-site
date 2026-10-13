# 作业解析 · Homework Solutions

公益性质的 LaTeX 作业解析目录，部署在 GitHub Pages。仓库转移给学校账号后，可以由新仓库的维护者继续维护。

## 添加解析

在 `solutions/` 下按课程、章节、题目建立任意层级的文件夹，例如 `solutions/高等数学/导数例题/链式法则.tex`。每个 `.tex` 文件都会成为目录中的一项，可以只写正文片段和公式，不需要 `\\documentclass` 或 `\\begin{document}`。维护者通过 GitHub 上传或提交文件即可。

在导言区写可选的元数据注释：

```tex
% title: 导数例题
% course: 高等数学
% author: 教研组
% summary: 链式法则与求导步骤
```

提交到 `main` 后，Actions 自动发现 `solutions/` 中的所有 `.tex` 文件，按文件夹生成分级目录，用 Pandoc 将正文和公式转换为 HTML/MathML，并发布到 Pages。Pandoc 对复杂 LaTeX 宏包和 `\\input` 的支持有限；若网页转换失败仍可查看源码，详细错误见 Actions 日志。请只合并可信维护者审核过的文件。

本地验证：`python3 scripts/build.py --output dist`。需要安装 `pandoc`。

## 交接

GitHub 仓库 Settings → General → Danger Zone → Transfer ownership 可将仓库转给学校组织账号。转移后检查 Pages 的 Actions 来源和站点 URL；项目站点的路径可能随新仓库名变化。仓库采用 MIT 许可证；题解内容请确保有发布授权。

# 数学课程资源

公开的数学课程题解网站，部署在 GitHub Pages。网站按“类别 → 课程 → 资源”三级目录组织，每个资源有独立网页，可阅读渲染后的 `.tex` 内容，并在需要时通过浏览器导出 PDF。

## 上传资源

维护者在 GitHub 仓库的 `solutions/` 目录上传文件，路径严格使用以下三级文件夹：

```text
solutions/公共课/高等数学/24-25秋习题/链式法则.tex
solutions/代数/抽象代数/期末考试/试卷解析.tex
```

一级类别建议使用 `公共课`、`分析`、`代数`、`微分几何`、`拓扑`、`代数几何`、`数论和表示论`、`数学物理`、`概率和统计`、`应用`、`博资考`；其他类别也会显示。二级是课程名，三级是资源名。一个资源文件夹可以包含多个 `.tex` 文件，它们会按文件名顺序显示在同一个资源网页中。网站不提供访客直接上传入口；维护者通过 GitHub 上传或提交到 `main`。

`.tex` 可以是正文片段，允许使用 `\\section*{}`、行内 `$...$` 和展示公式 `\\[...\\]`。也接受完整 LaTeX 文档。文件开头可写：

```tex
% title: 链式法则
% author: 教研组
% summary: 复合函数求导
% source: https://example.org/原文页面（如属转载）
```

提交后 GitHub Actions 自动生成资源页面并发布。普通 LaTeX 由 Pandoc 转换为 HTML/MathML；复杂自定义宏包可能需要单独适配。读者在资源页点击“导出 PDF”，浏览器会打开打印界面，选择“存储为 PDF”即可；仓库和构建产物不预存 PDF。若一个资源含多个 `.tex` 文件，导出的是整个资源网页。请审核上传内容，不要在构建任务中加入敏感密钥。

本地构建：`python3 scripts/build.py --output dist`，普通 LaTeX 页面需要安装 Pandoc；旧站 bTeX 页面还需启动下述渲染服务。

## 交接

在 GitHub 仓库 Settings → General → Danger Zone → Transfer ownership 中可将仓库转给学校组织。转移后检查 Pages 发布地址和工作流权限。网站代码采用 MIT 许可证；题解内容应遵循各自的授权。

## 旧站内容迁移

本站从[香蕉空间旧站的资源总目录](https://bananaspace.org/legacy/wiki/用户:Solution)导入了其中实际存在的 193 个直接页面和 91 个子页面。旧目录中另有 17 个指向不存在页面的链接，无法迁入正文。每个迁入页面位于 `solutions/` 下对应的“学科/课程/资源”文件夹，保留原始 bTeX 正文和旧站来源链接。`% renderer: btex` 表示该文件由[旧站公开的 bTeX 编译器](https://github.com/banana-space/btex)生成网页；含 TikZ 的页面还使用[旧站公开的图形转换器](https://github.com/banana-space/tikz2svg)。

旧站的[版权说明](https://bananaspace.org/legacy/wiki/香蕉空间:版权)采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)；迁移的题目内容同样按该许可发布，网站代码的 MIT 许可不覆盖这些题目。每个迁入页面均提供原文链接。旧站“数学分析（旧）试卷”中两处 `\hfill` 改为 `\quad`，以兼容原编译器。原先迁入的三份 2026 春复变函数试卷按独立试卷拆分，保留在目录中。

重新导入时，先从旧站的“特殊:导出页面”导出总目录、正文页及子页面的 XML，然后运行 `python3 scripts/import_legacy.py <XML 文件夹>`。该脚本会拒绝覆盖非 bTeX 的维护者文件。GitHub Actions 会自动安装并运行两种旧站渲染服务；本地构建这些页面时需先启动 bTeX 与 TikZ 转换服务，并提供 KaTeX 资源。已验证的旧站图形缓存保存在 `assets/tikz-cache/`，供线上构建复用；新增图形仍由 TikZ 服务转换。构建会在任一资源网页渲染失败时退出。TikZ 转换器内部仍会编译临时图形；本站不会存储或发布题解 PDF。

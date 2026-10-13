# 数学课程资源

公开的数学课程题解网站，部署在 GitHub Pages。网站按“类别 → 课程 → 资源”三级目录组织，每个资源有独立网页，可阅读渲染后的 `.tex` 内容并下载 PDF。

## 上传资源

维护者在 GitHub 仓库的 `solutions/` 目录上传文件，路径严格使用以下三级文件夹：

```text
solutions/公共课/高等数学/24-25秋习题/链式法则.tex
solutions/代数/抽象代数/期末考试/试卷解析.tex
```

一级类别建议使用 `公共课`、`分析`、`代数`、`微分几何`、`拓扑`、`代数几何`、`数论和表示论`、`数学物理`、`概率和统计`、`应用`、`博资考`；其他类别也会显示。二级是课程名，三级是资源名。一个资源文件夹可以包含多个 `.tex` 文件，它们会按文件名顺序显示在同一个资源网页中，各自有 PDF 下载链接。网站不提供访客直接上传入口；维护者通过 GitHub 上传或提交到 `main`。

`.tex` 可以是正文片段，允许使用 `\\section*{}`、行内 `$...$` 和展示公式 `\\[...\\]`。也接受完整 LaTeX 文档。文件开头可写：

```tex
% title: 链式法则
% author: 教研组
% summary: 复合函数求导
% source: https://example.org/原文页面（如属转载）
```

提交后 GitHub Actions 自动生成资源页面与 PDF 并发布。网页由 Pandoc 转换为 HTML/MathML，PDF 由 Pandoc 和 XeLaTeX 生成；复杂自定义宏包可能需要单独适配。PDF 生成失败时，网页仍可阅读，构建日志会记录错误。请审核上传内容，不要在构建任务中加入敏感密钥。

本地构建：`python3 scripts/build.py --output dist`，需要安装 Pandoc 和 XeLaTeX。

## 交接

在 GitHub 仓库 Settings → General → Danger Zone → Transfer ownership 中可将仓库转给学校组织。转移后检查 Pages 发布地址和工作流权限。网站代码采用 MIT 许可证；题解内容应遵循各自的授权。

## 旧站内容迁移

`solutions/分析/复变函数/` 下的三份 2026 春试卷题目来自[香蕉空间旧站“试卷：复变函数”](https://bananaspace.org/legacy/wiki/用户:Solution/_试卷:_复变函数)。原页面将多份试卷放在一个 bTeX 页面中，这里按试卷拆成资源文件夹，并将自定义命令适配为标准 LaTeX。旧站的[版权说明](https://bananaspace.org/legacy/wiki/香蕉空间:版权)采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)；迁移的题目内容同样按该许可发布，网站代码的 MIT 许可不覆盖这些题目。

旧站其余页面含有香蕉空间专用命令或复杂排版。只有经过正文核对、网页渲染及 PDF 生成验证的部分才会加入新站目录，未迁移的页面不会显示为已收录资源。

# 数学课程资源

基于 sunlay01/homework-solutions 提交 `4348a5144a73c9c6ee3a8694d547c33ea1587df0` 的课程资源网站。

- 11 个学科、89 门课程、288 份资源；全文检索、公式与 SVG 图形阅读、源文件下载及打印。
- 标准 LaTeX 工作台：ChatGPT 登录、管理员授予上传权限、多文件工程、云端草稿、真实 XeLaTeX 编译、PDF 下载和资源发布。
- 网站代码运行于 Sites / Cloudflare Workers；D1 保存目录、权限和版本，R2 保存工程源码与 PDF。
- 默认使用 `https://texlive.net/cgi-bin/latexcgi` 编译。`engine` 固定为 `xelatex`，正文片段补充 `ctexart` 与 Fandol 中文字体导言区。编译依赖外部服务可用性。

## 权限

生产环境使用 Sites 提供的身份头。`OWNER_EMAIL` 以 Sites secret 设置，不写入源码。管理员在工作台添加协作者登录邮箱以授予上传权限；私有网站还需要通过 Sites 共享为同一账号授予网站访问权限。工作台不发送邀请邮件。

协作者只能编辑自己的工程；管理员可以管理全站工程。发布前必须成功编译当前版本。修改已发布工程会收回为草稿，重新编译发布后回到目录。版本冲突返回 409。编译每用户每小时限 15 次，单工程同时仅运行一个编译任务。

## 编译范围

最多 20 个 UTF-8 文本文件，总源码 512 KB，允许 tex/bib/sty/cls/txt/csv。文件名须使用英文、数字、下划线或短横线，可使用子目录。引擎通过 multipart 提交全部项目文件，主文件提交为 document.tex。自定义外部字体和二进制附件当前不支持上传。

原仓库的 284 份旧站 bTeX 源码保留原字节和现有网页渲染，不冒充标准 LaTeX。4 份标准 LaTeX 均是正文片段，导入工作台编译时使用独立工作副本和包装模板。

## 验证与来源

`public/library/provenance.json` 与 `verification.json` 记录原始提交、逐字节核对、数学/SVG 结构和内部链接检查。`data/catalog.json` 为轻量元数据，完整检索正文独立存于 `public/library/search-index.json`。

旧站迁入内容保留原文链接与 CC BY-SA 4.0 授权；原仓库代码 MIT 许可证在 public/library/LICENSE-upstream-code.txt。本站资源是固定快照，工作台新增资源保存于 Sites 数据库，不会自动提交到 GitHub。

## 本地开发

运行 `npm run install:ci`、`npm run db:generate`、`npm run build`。按 Sites 技能应用 drizzle 迁移到本地 D1，再运行 `npm run dev`。开发环境可用模拟 ChatGPT 登录；测试管理员在忽略的 .dev.vars 中设置 `OWNER_EMAIL=seedy@sites.test`。部署由 Sites 原生工具与 source helper 完成。

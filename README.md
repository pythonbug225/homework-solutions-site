# 数学课程资源 · XeLaTeX 协作工作台

这是 [sunlay01/homework-solutions](https://github.com/sunlay01/homework-solutions) 的独立网站 fork，维护账号为 **pythonbug225**。

**已部署网站：** https://sunlay-math-library-20261013.xiasinm.chatgpt.site  
当前网站为私有访问，需要获得 Sites 共享权限。这个 GitHub fork 保存可编辑源码；推送到这里不会自动改变已部署的 Sites 网站。

## 网站功能

- 11 个学科、89 门课程、288 份完整资源；按学科和课程浏览、正文全文搜索、数学公式与 SVG 图形阅读。
- 原始 LaTeX/bTeX 源码下载，资源页打印或导出 PDF，保留原文出处及授权说明。
- ChatGPT 登录与管理员管理协作者上传权限。协作者只可编辑自己的工程，管理员可管理全站工程。
- 多文件 LaTeX 工程上传、云端草稿、源码版本冲突检查、真实 XeLaTeX 编译、PDF 预览与下载、发布到课程目录。

## 来源与格式

资源内容固定于上游提交 `4348a5144a73c9c6ee3a8694d547c33ea1587df0`。288 份原始源码与该提交逐字节一致。
284 份旧站资源采用自定义 bTeX，保留原有网页渲染；4 份标准 LaTeX 是正文片段，导入工作台后由独立工作副本补充中文文档模板。
旧站 bTeX 需要转换成标准 LaTeX 后才能使用 XeLaTeX 编译。

网站代码沿用 MIT 许可；香蕉空间旧站迁入内容按 CC BY-SA 4.0 保留出处。各资源自己的授权仍适用，代码许可证不覆盖全部题解。

## 云端架构与编译

网站运行于 Sites / Cloudflare Workers，D1 保存权限、目录与版本，R2 保存工程源码与 PDF。无需保持本机运行。
在线编译将工程通过 HTTPS 发送到 [TeXLive.net](https://texlive.net/cgi-bin/latexcgi)，引擎固定为 `xelatex`，编译依赖该服务的可用性；返回的 PDF 保存在本站 R2。
中文正文片段使用 `ctexart`、Fandol 字体以及数学宏包包装。支持 20 个 UTF-8 文本文件，总计 512 KB（tex/bib/sty/cls/txt/csv）；当前不支持上传二进制图片或自定义外部字体。

上传的工程和 PDF 属于云端数据，不会自动提交回 GitHub。协作者应先获得 Sites 网站访问权限，再由管理员在工作台授予上传权限。

## 运行与部署

1. 使用 Node.js 24，运行 `npm run install:ci` 安装锁定依赖。
2. 本地测试在忽略的 `.dev.vars` 中设置 `OWNER_EMAIL=seedy@sites.test`。生产环境将管理员的 ChatGPT 登录邮箱设置为 Sites secret `OWNER_EMAIL`，不要写入源码。
3. 运行 `npm run build`，再应用本地 D1 迁移：

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_medical_weapon_omega.sql
```

4. 运行 `npm run dev`，打开终端给出的本地地址。开发环境的 `/signin-with-chatgpt?return_to=/studio` 提供模拟登录。
5. 发布由 Sites 负责：创建/选择 Site，设置运行时 secret，按 Sites 源码同步、构建与发布流程操作。此 fork 的 `.openai/hosting.json` 保留 DB/BUCKET 声明并移除了原 Site 的项目 ID，便于独立部署。

GitHub Pages 可托管静态文件，本站的登录、上传、持久存储和编译接口需要 Workers/Sites 后端。

## 代码与检查记录

- `app/`：课程目录、资源阅读、工作台与 API 路由。
- `lib/service.ts`：身份与权限检查、工程保存、编译与发布。
- `db/`、`drizzle/`：D1 数据结构及迁移。
- `data/catalog.json`：目录元数据。
- `public/library/`：288 份正文、288 份原始源码、全文检索数据、字体及许可证。
- `public/library/provenance.json`、`verification.json`：来源及正文完整性检查。
- `SITE-README.md`：更详细的实现说明。

已通过 TypeScript 检查与生产构建；浏览器验证了目录/搜索、公式阅读、手机版、上传、真实中文多文件 XeLaTeX 编译、错误日志、PDF 下载、资源发布及协作者权限边界。
上游原始代码保留于 Git 历史及 `upstream-original` 分支。

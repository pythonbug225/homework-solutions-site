import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';

type Doc = { id:string; title:string; category:string; course:string; summary:string; owner_id:string; owner_email:string; source_key:string; pdf_key:string|null; state:string; revision:number; compiled_revision:number|null; created_at:string; updated_at:string };
type Bundle = {main:string; files:{name:string;content:string}[]};
class Problem extends Error { constructor(public status:number, message:string){super(message);} }
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
function storage(){if(!env.DB||!env.BUCKET)throw new Problem(503,'存储尚未就绪，请稍后重试。');return {db:env.DB,bucket:env.BUCKET};}
async function actor(){
  const user=await getChatGPTUser(); if(!user)throw new Problem(401,'请先使用 ChatGPT 登录。');
  const owner=Boolean(env.OWNER_EMAIL&&user.email.toLowerCase()===env.OWNER_EMAIL.toLowerCase());
  const {db}=storage();
  const member=owner?true:!!await db.prepare('SELECT email FROM collaborators WHERE email = ?').bind(user.email.toLowerCase()).first();
  return {user,owner,member};
}
async function writer(){const a=await actor();if(!a.member)throw new Problem(403,'你还没有上传权限，请联系网站管理员。');return a;}
function sameOrigin(req:Request){const origin=req.headers.get('origin');if((origin&&origin!==new URL(req.url).origin)||req.headers.get('sec-fetch-site')==='cross-site')throw new Problem(403,'请在本站发起操作。');}
async function input(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new Problem(415,'请使用 JSON 提交。');const declared=Number(req.headers.get('content-length')||0);if(declared>800000)throw new Problem(413,'工程总大小不得超过 512 KB。');const raw=await req.text();if(new TextEncoder().encode(raw).length>800000)throw new Problem(413,'工程过大。');try{return JSON.parse(raw);}catch{throw new Problem(400,'提交内容不是有效 JSON。');}}
function field(v:unknown,name:string,max:number,required=true){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Problem(400,`${name}格式不正确（最多 ${max} 字）。`);return v.trim();}
function bundle(v:unknown):Bundle{
  if(!v||typeof v!=='object')throw new Problem(400,'请提供 LaTeX 工程。');const b=v as Bundle;
  if(!Array.isArray(b.files)||!b.files.length||b.files.length>20)throw new Problem(400,'一个工程支持 1–20 个文本文件。');
  let total=0;const seen=new Set<string>();
  for(const f of b.files){
    if(typeof f.name!=='string'||f.name.length>160||!/^([A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(tex|bib|sty|cls|txt|csv)$/.test(f.name)||f.name.split('/').some(p=>p==='..')||seen.has(f.name))throw new Problem(400,'文件名须使用英文、数字、下划线或短横线，支持子目录；不允许重名或上级路径。');
    if(typeof f.content!=='string')throw new Problem(400,'文件必须为 UTF-8 文本。');seen.add(f.name);total+=new TextEncoder().encode(f.content).length;
  }
  if(total>524288)throw new Problem(413,'工程总大小不得超过 512 KB。');
  if(!seen.has(b.main)||!b.main.endsWith('.tex'))throw new Problem(400,'请选择工程中的 .tex 主文件。');
  if(b.main!=='document.tex'&&seen.has('document.tex'))throw new Problem(400,'工程存在 document.tex 时，请将其设为主文件。');
  return b;
}
async function document(id:string){const d=await storage().db.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first<Doc>();if(!d)throw new Problem(404,'资源不存在。');return d;}
async function editable(id:string){const a=await writer();const d=await document(id);if(!a.owner&&d.owner_id!==a.user.userId)throw new Problem(403,'只能编辑自己的工程。');return {a,d};}
function metadata(d:Doc){return {id:d.id,title:d.title,name:d.title,category:d.category,course:d.course,summary:d.summary,state:d.state,revision:d.revision,compiledRevision:d.compiled_revision,hasPdf:!!d.pdf_key,updatedAt:d.updated_at,kind:'共建',renderer:'xelatex'};}
function wrap(source:string){return /\\documentclass\b/.test(source)?source:`\\documentclass[UTF8,fontset=fandol]{ctexart}\n\\usepackage{amsmath,amssymb,amsthm,graphicx}\n\\usepackage[a4paper,margin=25mm]{geometry}\n\\usepackage{hyperref}\n\\begin{document}\n${source}\n\\end{document}\n`;}

export async function handle(req:Request){
 try{
  const path=new URL(req.url).pathname.replace(/^\/api\//,'').split('/');const method=req.method;
  if(method!=='GET')sameOrigin(req);
  if(path[0]==='me'&&method==='GET'){const a=await actor();return reply({name:a.user.displayName,email:a.user.email,owner:a.owner,canWrite:a.member});}
  if(path[0]==='community'&&method==='GET'){const {results}=await storage().db.prepare("SELECT * FROM documents WHERE state = 'published' ORDER BY updated_at DESC LIMIT 500").all<Doc>();return reply(results.map(metadata));}
  if(path[0]==='collaborators'){
   const a=await actor();if(!a.owner)throw new Problem(403,'仅管理员可以管理协作者。');const {db}=storage();
   if(method==='GET')return reply((await db.prepare('SELECT email, created_at FROM collaborators ORDER BY created_at DESC').all()).results);
   const v=await input(req);const email=field(v.email,'邮箱',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Problem(400,'请输入有效邮箱。');
   if(method==='POST'){await db.prepare('INSERT INTO collaborators (email, created_at) VALUES (?, ?) ON CONFLICT(email) DO NOTHING').bind(email,new Date().toISOString()).run();return reply({ok:true});}
   if(method==='DELETE'){await db.prepare('DELETE FROM collaborators WHERE email = ?').bind(email).run();return reply({ok:true});}
  }
  if(path[0]==='projects'){
   const {db,bucket}=storage();const id=path[1];
   if(!id&&method==='GET'){const a=await writer();const q=a.owner?db.prepare('SELECT * FROM documents ORDER BY updated_at DESC LIMIT 200'):db.prepare('SELECT * FROM documents WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 200').bind(a.user.userId);return reply((await q.all<Doc>()).results.map(metadata));}
   if(!id&&method==='POST'){
    const a=await writer();const v=await input(req);const b=bundle(v.bundle);const title=field(v.title,'标题',160),category=field(v.category,'学科',60),course=field(v.course,'课程',100),summary=field(v.summary||'','简介',500,false);
    const pid='u'+crypto.randomUUID().replaceAll('-',''),key=`projects/${pid}/source-1.json`,now=new Date().toISOString();
    await bucket.put(key,JSON.stringify(b),{httpMetadata:{contentType:'application/json; charset=utf-8'}});
    try{await db.prepare('INSERT INTO documents (id,title,category,course,summary,owner_id,owner_email,source_key,state,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(pid,title,category,course,summary,a.user.userId,a.user.email,key,'draft',1,now,now).run();}catch(e){await bucket.delete(key);throw e;}
    return reply(metadata(await document(pid)),201);
   }
   if(id&&method==='GET'&&!path[2]){const a=await actor();const d=await document(id);if(d.state!=='published'&&!a.owner&&d.owner_id!==a.user.userId)throw new Problem(403,'这个草稿不可见。');const object=await bucket.get(d.source_key);if(!object)throw new Problem(404,'源码文件缺失。');const b=await object.json<Bundle>();return reply({...metadata(d),bundle:b});}
   if(id&&method==='PUT'&&!path[2]){
    const {d}=await editable(id);const v=await input(req);if(v.revision!==d.revision)throw new Problem(409,'工程已被更新，请重新打开后编辑。');const b=bundle(v.bundle);const title=field(v.title,'标题',160),category=field(v.category,'学科',60),course=field(v.course,'课程',100),summary=field(v.summary||'','简介',500,false);
    const next=d.revision+1,key=`projects/${id}/source-${next}-${crypto.randomUUID()}.json`;await bucket.put(key,JSON.stringify(b));
    const result=await db.prepare("UPDATE documents SET title=?,category=?,course=?,summary=?,source_key=?,revision=?,state='draft',updated_at=? WHERE id=? AND revision=?").bind(title,category,course,summary,key,next,new Date().toISOString(),id,d.revision).run();
    if(!result.meta.changes){await bucket.delete(key);throw new Problem(409,'工程已被更新，请重新打开后编辑。');}
    return reply(metadata(await document(id)));
   }
   if(id&&path[2]==='pdf'&&method==='GET'){
    const a=await actor(),d=await document(id);if(d.state!=='published'&&!a.owner&&d.owner_id!==a.user.userId)throw new Problem(403,'这个 PDF 不可见。');if(!d.pdf_key)throw new Problem(404,'请先编译工程。');const object=await bucket.get(d.pdf_key);if(!object)throw new Problem(404,'PDF 文件不存在。');
    return new Response(object.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`${new URL(req.url).searchParams.has('download')?'attachment':'inline'}; filename="resource.pdf"; filename*=UTF-8''${encodeURIComponent(d.title+'.pdf')}`}});
   }
   if(id&&path[2]==='publish'&&method==='POST'){
    const {d}=await editable(id);const v=await input(req);if(v.revision!==d.revision)throw new Problem(409,'版本已变化，请重新打开。');
    if(!d.pdf_key||d.compiled_revision!==d.revision)throw new Problem(400,'请先成功编译当前版本，再加入资源目录。');
    const result=await db.prepare("UPDATE documents SET state='published',updated_at=? WHERE id=? AND revision=? AND compiled_revision=revision").bind(new Date().toISOString(),id,d.revision).run();if(!result.meta.changes)throw new Problem(409,'版本已更新，请重新编译。');return reply(metadata(await document(id)));
   }
   if(id&&path[2]==='unpublish'&&method==='POST'){await editable(id);await db.prepare("UPDATE documents SET state='draft',updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();return reply(metadata(await document(id)));}
   if(id&&path[2]==='compile'&&method==='POST'){
    const {a,d}=await editable(id);const v=await input(req);if(v.revision!==d.revision)throw new Problem(409,'源码版本已更新，请重新打开。');
    const cutoff=new Date(Date.now()-3600000).toISOString();const usage=await db.prepare('SELECT COUNT(*) AS n FROM compilations WHERE user_id=? AND created_at>?').bind(a.user.userId,cutoff).first<{n:number}>();if((usage?.n||0)>=15)throw new Problem(429,'每小时最多编译 15 次，请稍后重试。');
    const token=crypto.randomUUID(),now=Date.now();const lock=await db.prepare('UPDATE documents SET compile_token=?,compile_until=? WHERE id=? AND revision=? AND (compile_until IS NULL OR compile_until<?)').bind(token,now+125000,id,d.revision,now).run();if(!lock.meta.changes)throw new Problem(409,'这个工程正在编译，请稍候。');
    const job=crypto.randomUUID();await db.prepare('INSERT INTO compilations (id,document_id,user_id,revision,status,created_at) VALUES (?,?,?,?,?,?)').bind(job,id,a.user.userId,d.revision,'running',new Date().toISOString()).run();
    try{
     const object=await bucket.get(d.source_key);if(!object)throw new Error('源码文件缺失。');const b=await object.json<Bundle>(),form=new FormData();if(/%\s*renderer:\s*btex/i.test(b.files.find(f=>f.name===b.main)?.content||''))throw new Error('旧站 bTeX 不是标准 LaTeX，请转换语法后再编译。');form.append('engine','xelatex');form.append('return','pdf');
     const sorted=[b.files.find(f=>f.name===b.main)!,...b.files.filter(f=>f.name!==b.main)];
     for(const f of sorted){form.append('filename[]',f.name===b.main?'document.tex':f.name);form.append('filecontents[]',f.name===b.main?wrap(f.content):f.content);}
     const output=await fetch('https://texlive.net/cgi-bin/latexcgi',{method:'POST',body:form,redirect:'follow',signal:AbortSignal.timeout(100000)});
     const bytes=await output.arrayBuffer();if(bytes.byteLength>15728640)throw new Error('编译结果超过 15 MB。');
     const prefix=new TextDecoder().decode(bytes.slice(0,5));if(!output.ok||prefix!=='%PDF-'){
      const rawLog=new TextDecoder().decode(bytes),log=output.headers.get('content-type')?.includes('html')?rawLog.replace(/<[^>]+>/g,''):rawLog;
      throw new Error((log.length>24000?log.slice(0,1400)+'\n…日志中段已省略…\n'+log.slice(-22500):log)||'编译服务未返回 PDF。');
     }
     const pdfKey=`projects/${id}/pdf-${d.revision}-${job}.pdf`;await bucket.put(pdfKey,bytes,{httpMetadata:{contentType:'application/pdf'}});
     const updated=await db.prepare('UPDATE documents SET pdf_key=?,compiled_revision=?,compile_token=NULL,compile_until=NULL WHERE id=? AND revision=? AND compile_token=?').bind(pdfKey,d.revision,id,d.revision,token).run();
     if(!updated.meta.changes){await bucket.delete(pdfKey);throw new Error('编译期间源码已更新，请重新编译当前版本。');}
     await db.prepare("UPDATE compilations SET status='succeeded',message=? WHERE id=?").bind('XeLaTeX 编译成功',job).run();
     return reply({ok:true,engine:'xelatex',revision:d.revision,pdfUrl:`/api/projects/${id}/pdf?v=${job}`,message:'XeLaTeX 编译成功。中文与数学公式已排版为 PDF。'});
    }catch(e){const message=e instanceof Error?e.message:'编译失败。';await db.prepare("UPDATE compilations SET status='failed',message=? WHERE id=?").bind(message.slice(0,24000),job).run();throw new Problem(422,message);}
    finally{await db.prepare('UPDATE documents SET compile_token=NULL,compile_until=NULL WHERE id=? AND compile_token=?').bind(id,token).run();}
   }
  }
  throw new Problem(404,'接口不存在。');
 }catch(e){if(e instanceof Problem)return reply({error:e.message},e.status);console.error('Site request failed',e instanceof Error?e.message:'unknown');return reply({error:'操作未完成，请稍后重试。'},500);}
}

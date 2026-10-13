'use client';
import {useEffect,useRef,useState} from 'react';
import {Upload,Play,Save,Download,Plus,FileCode2,Users,ArrowUpRight,CheckCircle2,LoaderCircle,X,BookOpen,ChevronRight} from 'lucide-react';
import {categories} from '@/lib/catalog';
type File={name:string;content:string};
type Project={id:string;title:string;name:string;category:string;course:string;summary:string;revision:number;compiledRevision:number|null;hasPdf:boolean;state:string;updatedAt:string};
const template=String.raw`% !TeX program = xelatex
\documentclass[UTF8,fontset=fandol]{ctexart}
\usepackage{amsmath,amssymb,amsthm}
\usepackage[a4paper,margin=25mm]{geometry}
\usepackage{hyperref}

\title{一道题的完整解答}
\author{}
\date{}

\begin{document}
\maketitle

\section{题目}
计算定积分 $\displaystyle\int_0^1 x^2\,dx$。

\section{解答}
由微积分基本定理，
\[
  \int_0^1 x^2\,dx
  = \left.\frac{x^3}{3}\right|_0^1
  = \frac{1}{3}.
\]

\end{document}
`;
async function api(path:string,method='GET',data?:unknown):Promise<any>{const r=await fetch('/api/'+path,{method,headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});const d:any=await r.json();if(!r.ok)throw new Error(d.error||'请求失败。');return d;}
export default function Studio({importable}:{importable:{id:string;name:string;category:string;course:string;files:{url:string;name:string}[]}[]}){
 const [user,setUser]=useState<{name:string;email:string;owner:boolean;canWrite:boolean}|null>(null),[authDone,setAuthDone]=useState(false),[authError,setAuthError]=useState(''),[projects,setProjects]=useState<Project[]>([]),[members,setMembers]=useState<{email:string}[]>([]),[email,setEmail]=useState(''),[showMembers,setShowMembers]=useState(false);
 const [id,setId]=useState(''),[revision,setRevision]=useState(0),[compiled,setCompiled]=useState<number|null>(null),[state,setState]=useState('draft'),[title,setTitle]=useState('我的数学题解'),[category,setCategory]=useState('分析'),[course,setCourse]=useState('数学分析'),[summary,setSummary]=useState(''),[files,setFiles]=useState<File[]>([{name:'document.tex',content:template}]),[main,setMain]=useState('document.tex'),[active,setActive]=useState('document.tex'),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[pdf,setPdf]=useState(''),[tab,setTab]=useState('preview');
 const upload=useRef<HTMLInputElement>(null),gutter=useRef<HTMLDivElement>(null),editor=useRef<HTMLTextAreaElement>(null);
 const refresh=()=>api('projects').then(setProjects);
 useEffect(()=>{api('me').then(u=>{setUser(u);if(u.canWrite)refresh().catch(e=>setError(e.message));if(u.owner)api('collaborators').then(setMembers).catch(e=>setError(e.message));}).catch(e=>{if(!e.message.includes('请先'))setAuthError(e.message);}).finally(()=>setAuthDone(true));},[]);
 useEffect(()=>{const rid=new URLSearchParams(location.search).get('import');const r=importable.find(x=>x.id===rid);if(!r)return;fetch(r.files[0].url).then(x=>x.text()).then(source=>{setFiles([{name:'document.tex',content:source}]);setTitle(r.name);setCategory(r.category);setCourse(r.course);setDirty(true);setMessage('已载入仓库标准 LaTeX 源码。保存为新工程后即可编译。');}).catch(()=>setError('源码读取失败。'));},[importable]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[dirty]);
 const current=files.find(f=>f.name===active)||files[0],legacy=/%\s*renderer:\s*btex/i.test(files.find(f=>f.name===main)?.content||'');
 const errorSummary=error.split('\n').find(line=>line.trimStart().startsWith('!'))||error.split('\n').slice(0,3).join('\n');
 function change(fn:()=>void){fn();setDirty(true);setMessage('');}
 async function save(){
  const data={title,category,course,summary,revision,bundle:{main,files}};
  const result:Project=await api('projects'+(id?'/'+id:''),id?'PUT':'POST',data);setId(result.id);setRevision(result.revision);setState(result.state);setDirty(false);setMessage('草稿已保存到云端。');await refresh();return result;
 }
 async function operate(action:'save'|'compile'|'publish'|'unpublish'){
  if(busy)return;setBusy(action);setError('');setMessage('');
  try{
   if(action==='save'){await save();return;}
   if(action==='compile'){
    if(legacy)throw new Error('这是旧站 bTeX 源码。请使用标准 LaTeX 工程进行 XeLaTeX 编译。');
    const saved=(!id||dirty)?await save():{id,revision};
    setMessage('正在使用 XeLaTeX 编译，请稍候…');
    const result=await api('projects/'+saved.id+'/compile','POST',{revision:saved.revision});setCompiled(result.revision);setPdf(result.pdfUrl);setTab('preview');setMessage(result.message);await refresh();return;
   }
   if(dirty)throw new Error('源码或信息有未保存的修改，请重新编译当前版本。');
   const result=await api('projects/'+id+'/'+action,'POST',{revision});setState(result.state);setMessage(action==='publish'?'资源已加入网站目录。':'资源已收回为草稿。');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'操作失败。');setTab('log');}finally{setBusy('');}
 }
 async function load(p:Project){
  if(dirty&&!window.confirm('当前有未保存的修改，仍然打开这个工程？'))return;
  setBusy('load');setError('');
  try{const d=await api('projects/'+p.id);setId(d.id);setTitle(d.title);setCategory(d.category);setCourse(d.course);setSummary(d.summary);setFiles(d.bundle.files);setMain(d.bundle.main);setActive(d.bundle.main);setRevision(d.revision);setCompiled(d.compiledRevision);setState(d.state);setDirty(false);setPdf(d.hasPdf?'/api/projects/'+d.id+'/pdf?v='+d.compiledRevision:'');setMessage('已打开云端工程。');}catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 function fresh(){if(dirty&&!window.confirm('当前有未保存的修改，仍然新建工程？'))return;setId('');setRevision(0);setCompiled(null);setState('draft');setTitle('我的数学题解');setCategory('分析');setCourse('数学分析');setSummary('');setFiles([{name:'document.tex',content:template}]);setMain('document.tex');setActive('document.tex');setDirty(false);setPdf('');setError('');setMessage('已新建中文数学模板。');}
 async function readFiles(list:FileList|null){
  if(!list?.length)return;setError('');
  try{
   let incoming:File[]=await Promise.all(Array.from(list).map(async f=>({name:f.name,content:await f.text()})));
   if(incoming.length===1&&incoming[0].name.endsWith('.tex')&&!/^[A-Za-z0-9_.-]+$/.test(incoming[0].name))incoming[0].name='document.tex';
   if(incoming.some(f=>!/^([A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(tex|bib|sty|cls|txt|csv)$/.test(f.name)))throw new Error('多文件工程请使用英文文件名，以保持 \\input 路径有效。支持 tex、bib、sty、cls、txt、csv。');
   const replacing=!id&&files.length===1&&files[0].content===template&&incoming.some(f=>f.name.endsWith('.tex'));
   const merged=new Map((replacing?[]:files).map(f=>[f.name,f]));incoming.forEach(f=>merged.set(f.name,f));const next=[...merged.values()];if(next.length>20)throw new Error('最多支持 20 个文件。');if(next.reduce((n,f)=>n+new TextEncoder().encode(f.content).length,0)>524288)throw new Error('总文件大小不得超过 512 KB。');
   const nextMain=replacing?(next.find(f=>f.name==='document.tex')||next.find(f=>f.name==='main.tex')||next.find(f=>f.name.endsWith('.tex')))!.name:main;
   setFiles(next);setActive(replacing?nextMain:incoming[0].name);setMain(nextMain);setDirty(true);setMessage('文件已载入编辑器；保存后上传到云端。');
  }catch(e){setError((e as Error).message);}finally{if(upload.current)upload.current.value='';}
 }
 function download(){const blob=new Blob([current.content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=current.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function membership(method:string,value:string){setError('');try{await api('collaborators',method,{email:value});setMembers(await api('collaborators'));setEmail('');setMessage(method==='POST'?'已授予上传权限；请确保此账号也已获得 Sites 访问权限。':'已移除上传权限。');}catch(e){setError((e as Error).message);}}
 return <main className="studio"><div className="studio-heading"><div><p className="eyebrow">WRITE · COMPILE · CONTRIBUTE</p><h1>把思路，写成完整的解答。</h1><p>协作上传与在线 XeLaTeX 工作台</p></div><a href="/" className="secondary-button"><BookOpen size={16}/>返回资源目录</a></div>
 {!authDone?<div className="auth-banner"><LoaderCircle className="spin" size={18}/>正在确认登录状态…</div>:!user?<div className="auth-banner"><div><b>登录后保存、编译与上传资源</b><p>{authError||'使用你的 ChatGPT 账号登录。上传权限由网站管理员授予。'}</p></div><a className="primary-button" href="/signin-with-chatgpt?return_to=%2Fstudio" target="_top">使用 ChatGPT 登录 <ArrowUpRight size={16}/></a></div>:<div className="auth-banner"><div className="user-indicator"><CheckCircle2 size={18}/><span>{user.name}<small>{user.owner?'网站管理员':user.canWrite?'已获上传权限':'只读访问 · 请联系管理员申请上传权限'}</small></span></div>{user.owner&&<button className="secondary-button" onClick={()=>setShowMembers(s=>!s)}><Users size={16}/>管理协作者</button>}</div>}
 {showMembers&&user?.owner&&<section className="members-panel"><div><h2>协作者上传权限</h2><p>填写协作者登录使用的邮箱。网站目前为私有，还需通过 Sites 共享将同一账号加入网站访问名单。</p></div><form onSubmit={e=>{e.preventDefault();membership('POST',email);}}><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="协作者的登录邮箱" aria-label="协作者邮箱"/><button className="primary-button">授予上传权限</button></form><div className="member-list">{members.length?members.map(m=><span key={m.email}>{m.email}<button onClick={()=>membership('DELETE',m.email)} aria-label={'移除 '+m.email}><X size={14}/></button></span>):<p className="muted">还没有添加协作者。</p>}</div></section>}
 <div className="studio-layout"><aside className="project-sidebar"><div className="project-sidebar-heading"><h2>云端工程</h2><button onClick={fresh} disabled={!!busy} aria-label="新建工程"><Plus size={18}/></button></div><button className="new-project" onClick={fresh} disabled={!!busy}><Plus size={15}/>新建中文数学模板</button><div className="project-list">{projects.map(p=><button key={p.id} disabled={!!busy} onClick={()=>load(p)} className={id===p.id?'active':''}><FileCode2 size={17}/><span><b>{p.title}</b><small>{p.course} · {p.state==='published'?'已加入目录':'草稿'}</small></span><ChevronRight size={14}/></button>)}</div>{!projects.length&&<p className="sidebar-help">保存工程后，它会出现在这里。登录同一账号，可在其他设备继续编辑。</p>}<div className="studio-help"><b>支持标准 LaTeX</b><p>完整文档直接编译；正文片段自动添加中文导言区。旧站 bTeX 需先转换语法。</p><p>多文件支持 .tex、.bib、.sty、.cls、.txt、.csv，最多 20 个，总计 512 KB。</p></div></aside>
 <section className="workspace"><div className="document-info"><label>资源标题<input value={title} onChange={e=>change(()=>setTitle(e.target.value))} disabled={!!busy} maxLength={160}/></label><div className="metadata-fields"><label>学科<select value={category} onChange={e=>change(()=>setCategory(e.target.value))} disabled={!!busy}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>课程<input value={course} onChange={e=>change(()=>setCourse(e.target.value))} disabled={!!busy} maxLength={100}/></label><label>简要说明<input value={summary} onChange={e=>change(()=>setSummary(e.target.value))} disabled={!!busy} placeholder="题目范围、学期或知识点" maxLength={500}/></label></div></div>
 <div className="workspace-toolbar"><div><span className="engine-badge"><i/> XeLaTeX</span><span className="save-state">{busy==='compile'?'正在编译':dirty?'有未保存的修改':id?'云端已保存 · v'+revision:'新建工程'}</span></div><div><button className="secondary-button" onClick={()=>upload.current?.click()} disabled={!!busy}><Upload size={15}/>上传文件</button><button className="secondary-button" onClick={()=>operate('save')} disabled={!!busy||!user?.canWrite}><Save size={15}/>保存</button><button className="primary-button" onClick={()=>operate('compile')} disabled={!!busy||!user?.canWrite}>{busy==='compile'?<LoaderCircle className="spin" size={15}/>:<Play size={15}/>} {busy==='compile'?'编译中…':'编译 PDF'}</button></div></div>
 <input ref={upload} type="file" multiple accept=".tex,.bib,.sty,.cls,.txt,.csv" onChange={e=>readFiles(e.target.files)} hidden/>
 <div className="editor-preview"><div className="editor-pane"><div className="file-tabs">{files.map(f=><button key={f.name} onClick={()=>setActive(f.name)} className={active===f.name?'active':''}><FileCode2 size={13}/>{f.name}</button>)}</div><div className="main-file-bar"><label>编译主文件 <select value={main} disabled={!!busy} onChange={e=>change(()=>setMain(e.target.value))}>{files.filter(f=>f.name.endsWith('.tex')).map(f=><option key={f.name}>{f.name}</option>)}</select></label><button onClick={download} aria-label="下载当前源码"><Download size={15}/></button>{files.length>1&&<button disabled={!!busy||active===main} onClick={()=>change(()=>{setFiles(files.filter(f=>f.name!==active));setActive(main);})} aria-label="移除当前附加文件"><X size={15}/></button>}</div><div className="code-editor"><div className="line-numbers" ref={gutter} aria-hidden="true">{current.content.split('\n').map((_,i)=><div key={i}>{i+1}</div>)}</div><textarea ref={editor} aria-label="LaTeX 源码编辑器" spellCheck={false} value={current.content} disabled={!!busy} onScroll={e=>{if(gutter.current)gutter.current.scrollTop=e.currentTarget.scrollTop;}} onChange={e=>change(()=>setFiles(files.map(f=>f.name===active?{...f,content:e.target.value}:f)))} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();operate('compile');}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();operate('save');}}}/></div><div className="editor-status"><span>UTF-8 · {current.content.split('\n').length} 行</span><span>Ctrl + Enter 编译</span></div></div><div className="preview-pane"><div className="preview-tabs"><button className={tab==='preview'?'active':''} onClick={()=>setTab('preview')}>PDF 预览</button><button className={tab==='log'?'active':''} onClick={()=>setTab('log')}>编译信息 {error&&<span className="error-dot"/>}</button>{pdf&&<a href={pdf+(pdf.includes('?')?'&':'?')+'download'} title="下载编译后的 PDF"><Download size={16}/></a>}</div>{tab==='log'?<div className="compile-log"><b>{error?'编译 / 操作信息':'编译状态'}</b><pre>{error||message||'尚未编译。点击「编译 PDF」开始。'}</pre></div>:pdf?<><iframe title="XeLaTeX 编译后的 PDF" src={pdf}/>{(dirty||compiled!==revision)&&<div className="stale-pdf">预览为此前编译版本，请重新编译以更新。</div>}</>:<div className="preview-empty"><span><FileCode2 size={34}/></span><h3>让公式，在纸上成形。</h3><p>在左侧写下解答，点击「编译 PDF」。<br/>中文、公式与多文件引用由 XeLaTeX 排版。</p><small>完整文档或正文片段均可</small></div>}</div></div>
 <div className="publish-bar"><div><b>{state==='published'?'这份资源已加入网站目录':'准备好与协作者分享了吗？'}</b><p>{state==='published'?'修改后需重新编译并发布当前版本。':'成功编译并保存后，将题解加入所选课程的资源目录。'}</p></div>{state==='published'?<button className="secondary-button" onClick={()=>operate('unpublish')} disabled={!!busy}>收回为草稿</button>:<button className="secondary-button" disabled={!id||dirty||compiled!==revision||!!busy||!user?.canWrite} onClick={()=>operate('publish')}>加入资源目录 <ArrowUpRight size={15}/></button>}</div>
 <div className="service-note">编译会将工程文件发送至 <a href="https://texlive.net" target="_blank" rel="noreferrer">TeXLive.net</a> 的 XeLaTeX 服务；源文件与最终 PDF 保存于本站。<a href="https://davidcarlisle.github.io/latexcgi/privacy" target="_blank" rel="noreferrer">服务隐私说明 ↗</a> · 每账号每小时最多 15 次。</div>
 {legacy&&<div className="notice">检测到旧站 bTeX 源码：请转换为标准 LaTeX 后再编译。</div>}
 {(message||error)&&<div className={'status-message '+(error?'error':'')} role={error?'alert':'status'}>{error?errorSummary:message}</div>}</section></div></main>;
}

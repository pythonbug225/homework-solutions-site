import SiteHeader from '@/components/site-header';
import Studio from './studio-client';
import { catalog } from '@/lib/catalog';
export const dynamic='force-dynamic';
export default function StudioPage(){return <><SiteHeader active="studio"/><Studio importable={catalog.filter(r=>r.renderer==='latex').map(r=>({id:r.id,name:r.name,category:r.category,course:r.course,files:r.files}))}/></>;}

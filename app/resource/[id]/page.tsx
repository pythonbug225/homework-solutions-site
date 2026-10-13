import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import ResourceReader from './reader';
import { catalog } from '@/lib/catalog';
export default async function ResourcePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const resource=catalog.find(r=>r.id===id);return <><SiteHeader/><link rel="stylesheet" href="/library/assets/katex.min.css"/><link rel="stylesheet" href="/library/assets/btex.css"/><ResourceReader id={id} resource={resource} siblings={resource?catalog.filter(r=>r.course===resource.course&&r.category===resource.category).map(r=>({id:r.id,name:r.name})):[]}/><SiteFooter/></>;}

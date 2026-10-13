import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import LibraryClient from './library-client';
import { catalog } from '@/lib/catalog';
export default function Home(){return <><SiteHeader/><main className="home"><LibraryClient initial={catalog}/></main><SiteFooter/></>;}

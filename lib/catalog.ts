import raw from '@/data/catalog.json';
export type Resource={id:string;category:string;course:string;name:string;summary:string;origin?:string;renderer:string;kind:string;files:{name:string;url:string;githubUrl:string}[];bodyUrl:string;text?:string;headingCount:number};
export const catalog=raw as Resource[];
export const categories=['公共课','分析','代数','微分几何','拓扑','代数几何','数论和表示论','数学物理','概率和统计','应用','博资考'];

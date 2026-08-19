import { useEffect } from 'react';
import { useLocation,useNavigationType } from 'react-router-dom';
const getHashId=hash=>{const raw=hash.slice(1);try{return decodeURIComponent(raw)}catch{return raw}};
export default function ScrollToTop(){const {pathname,hash}=useLocation(),type=useNavigationType();useEffect(()=>{if(type==='POP')return;if(hash){const id=getHashId(hash),timer=window.setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),50);return()=>window.clearTimeout(timer)}window.scrollTo({top:0,left:0,behavior:'instant'})},[pathname,hash,type]);return null}

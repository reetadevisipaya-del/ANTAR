import { ArrowLeft, ChevronRight, Home } from 'lucide-react'

export default function InAppNav({
  rootLabel,
  currentLabel,
  parentLabel,
  backLabel,
  onBack,
}:{
  rootLabel:string
  currentLabel:string
  parentLabel?:string
  backLabel?:string
  onBack:()=>void
}){
  return <div className="in-app-nav">
    <button className="in-app-back" onClick={onBack}>
      <ArrowLeft size={16}/>
      <span>{backLabel||'Back'}</span>
    </button>
    <div className="in-app-crumbs" aria-label="Breadcrumb">
      <span><Home size={13}/>{rootLabel}</span>
      {parentLabel&&<><ChevronRight size={13}/><span>{parentLabel}</span></>}
      <ChevronRight size={13}/>
      <strong>{currentLabel}</strong>
    </div>
  </div>
}

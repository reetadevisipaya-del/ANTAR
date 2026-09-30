import { ArrowLeft, ChevronRight, Home } from 'lucide-react'

export default function InAppNav({
  rootLabel,
  currentLabel,
  parentLabel,
  backLabel,
  onBack,
  onRoot,
  onParent,
}:{
  rootLabel:string
  currentLabel:string
  parentLabel?:string
  backLabel?:string
  onBack:()=>void
  onRoot?:()=>void
  onParent?:()=>void
}){
  return <div className="in-app-nav">
    <button className="in-app-back" onClick={onBack}>
      <ArrowLeft size={16}/>
      <span>{backLabel||'Back'}</span>
    </button>
    <nav className="in-app-crumbs" aria-label="Breadcrumb">
      {onRoot
        ?<button className="in-app-crumb-button" onClick={onRoot}><Home size={13}/>{rootLabel}</button>
        :<span><Home size={13}/>{rootLabel}</span>}
      {parentLabel&&<>
        <ChevronRight size={13}/>
        {onParent
          ?<button className="in-app-crumb-button" onClick={onParent}>{parentLabel}</button>
          :<span>{parentLabel}</span>}
      </>}
      <ChevronRight size={13}/>
      <strong>{currentLabel}</strong>
    </nav>
  </div>
}

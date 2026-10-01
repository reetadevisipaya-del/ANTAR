import { ArrowLeft, ChevronRight, Home } from 'lucide-react'
import { useLocale } from './i18n'

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
  const { t } = useLocale()
  return <div className="in-app-nav">
    <button className="in-app-back" onClick={onBack}>
      <ArrowLeft size={16}/>
      <span>{t(backLabel||'Back')}</span>
    </button>
    <nav className="in-app-crumbs" aria-label="Breadcrumb">
      {onRoot
        ?<button className="in-app-crumb-button" onClick={onRoot}><Home size={13}/>{t(rootLabel)}</button>
        :<span><Home size={13}/ >{t(rootLabel)}</span>}
      {parentLabel&&<>
        <ChevronRight size={13}/>
        {onParent
          ?<button className="in-app-crumb-button" onClick={onParent}>{t(parentLabel)}</button>
          :<span >{t(parentLabel)}</span>}
      </>}
      <ChevronRight size={13}/>
      <strong >{t(currentLabel)}</strong>
    </nav>
  </div>
}

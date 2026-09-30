import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCheck,
  ClipboardCheck,
  FileText,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { supabase } from './supabase'

export type NotificationItem = {
  notification_id:string
  notification_type:string
  title:string
  body?:string|null
  conversation_id?:string|null
  message_id?:string|null
  child_id?:string|null
  child_name?:string|null
  read_at?:string|null
  created_at:string
}

export type NotificationDestination =
  | 'messages'
  | 'attendance'
  | 'reports'
  | 'schedule'
  | 'appointments'
  | 'documents'
  | 'homework'
  | 'home'

const destinationFor=(item:NotificationItem):NotificationDestination=>{
  if(item.notification_type==='message')return 'messages'
  if(item.notification_type==='attendance')return 'attendance'
  if(item.notification_type==='daily_report')return 'reports'
  if(item.notification_type==='schedule')return 'schedule'
  if(item.notification_type==='appointment')return 'appointments'
  if(item.notification_type==='document')return 'documents'
  if(item.title.toLowerCase().includes('homework'))return 'homework'
  return 'home'
}

const iconFor=(type:string)=>{
  if(type==='message')return MessageCircle
  if(type==='attendance')return ClipboardCheck
  if(type==='daily_report')return BookOpen
  if(type==='schedule'||type==='appointment')return CalendarDays
  if(type==='document')return FileText
  return Bell
}

const relative=(value:string)=>{
  const date=new Date(value)
  const diff=Date.now()-date.getTime()
  const min=Math.max(0,Math.floor(diff/60000))
  if(min<1)return 'Just now'
  if(min<60)return `${min}m ago`
  const hr=Math.floor(min/60)
  if(hr<24)return `${hr}h ago`
  const days=Math.floor(hr/24)
  if(days<7)return `${days}d ago`
  return date.toLocaleDateString([],{day:'2-digit',month:'short',year:'numeric'})
}

export default function Notifications({
  userId,
  onUnreadChange,
  onNavigate,
}:{
  userId:string
  onUnreadChange?:(count:number)=>void
  onNavigate?:(destination:NotificationDestination,item:NotificationItem)=>void
}){
  const [items,setItems]=useState<NotificationItem[]>([])
  const [filter,setFilter]=useState<'all'|'unread'>('all')
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState(false)
  const [status,setStatus]=useState('')

  const unread=useMemo(()=>items.filter(item=>!item.read_at).length,[items])
  const visible=useMemo(
    ()=>filter==='unread'?items.filter(item=>!item.read_at):items,
    [items,filter],
  )

  async function load(){
    const {data,error}=await supabase.rpc('notifications_my_feed',{p_limit:80})
    if(error){
      setStatus(error.message)
      setLoading(false)
      return
    }
    const next=(data||[]) as NotificationItem[]
    setItems(next)
    const count=next.filter(item=>!item.read_at).length
    onUnreadChange?.(count)
    setLoading(false)
  }

  useEffect(()=>{
    setLoading(true)
    void load()
    const timer=window.setInterval(()=>void load(),10000)
    return ()=>window.clearInterval(timer)
  },[userId])

  useEffect(()=>{onUnreadChange?.(unread)},[unread])

  async function markRead(item:NotificationItem){
    if(item.read_at)return
    setItems(current=>current.map(row=>row.notification_id===item.notification_id?{...row,read_at:new Date().toISOString()}:row))
    const {error}=await supabase.rpc('notifications_mark_read',{p_notification_id:item.notification_id})
    if(error){
      setStatus(error.message)
      await load()
    }
  }

  async function openItem(item:NotificationItem){
    await markRead(item)
    onNavigate?.(destinationFor(item),item)
  }

  async function markAll(){
    if(!unread)return
    setWorking(true)
    setStatus('')
    const {error}=await supabase.rpc('notifications_mark_all_read')
    if(error){
      setStatus(error.message)
      setWorking(false)
      return
    }
    const now=new Date().toISOString()
    setItems(current=>current.map(item=>item.read_at?item:{...item,read_at:now}))
    onUnreadChange?.(0)
    setWorking(false)
  }

  if(loading)return <div className="panel">Loading notifications…</div>

  return <div className="notification-center">
    <div className="notification-heading">
      <div>
        <span className="eyebrow">ANTAR Alerts</span>
        <h1>Notifications</h1>
        <p>Messages, attendance, reports, homework, schedules, appointments and documents in one place.</p>
      </div>
      <div className="notification-heading-actions">
        <button className="mini-button" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button>
        <button className="mini-button" onClick={()=>void markAll()} disabled={!unread||working}><CheckCheck size={15}/> Mark all read</button>
      </div>
    </div>

    {status&&<div className="status-message">{status}</div>}

    <div className="notification-summary">
      <button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>
        <strong>{items.length}</strong><span>All</span>
      </button>
      <button className={filter==='unread'?'active':''} onClick={()=>setFilter('unread')}>
        <strong>{unread}</strong><span>Unread</span>
      </button>
    </div>

    <div className="notification-list panel">
      {visible.map(item=>{
        const Icon=iconFor(item.notification_type)
        const unreadItem=!item.read_at
        return <article className={`notification-row ${unreadItem?'unread':''}`} key={item.notification_id}>
          <div className="notification-icon"><Icon size={18}/></div>
          <div className="notification-copy">
            <div className="notification-title-line">
              <strong>{item.title}</strong>
              <time>{relative(item.created_at)}</time>
            </div>
            {item.child_name&&<span className="notification-child">{item.child_name}</span>}
            {item.body&&<p>{item.body}</p>}
            <div className="notification-actions">
              <button className="mini-button" onClick={()=>void openItem(item)}>Open</button>
              {unreadItem&&<button className="text-button" onClick={()=>void markRead(item)}>Mark read</button>}
            </div>
          </div>
          {unreadItem&&<span className="notification-dot" aria-label="Unread"/>}
        </article>
      })}
      {!visible.length&&<div className="notification-empty">
        <Bell size={30}/>
        <strong>{filter==='unread'?'You’re all caught up':'No notifications yet'}</strong>
        <p>{filter==='unread'?'There are no unread ANTAR alerts right now.':'New child-specific updates and messages will appear here.'}</p>
      </div>}
    </div>
  </div>
}

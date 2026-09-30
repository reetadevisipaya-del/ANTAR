import { FormEvent, useEffect, useMemo, useState } from 'react'
import { LockKeyhole, MessageCircle, RefreshCw, Send, Users } from 'lucide-react'
import { supabase } from './supabase'

type Contact = {
  contact_user_id:string
  contact_name:string
  contact_email:string
  contact_role:string
  child_id:string
  child_name:string
  relationship_label:string
}

type Thread = {
  conversation_id:string
  child_id:string
  child_name:string
  other_user_id:string
  other_name:string
  other_email:string
  other_role:string
  relationship_label:string
  last_message?:string|null
  last_message_at?:string|null
  unread_count:number
  relationship_active:boolean
}

type ChatMessage = {
  message_id:string
  sender_id:string
  sender_name:string
  body:string
  created_at:string
  is_mine:boolean
}

const displayRole=(value?:string)=>
  value==='special_educator'?'Special Educator':
  value==='therapist'?'Therapist':
  value==='teacher'?'Teacher':
  value==='parent'?'Parent':
  (value||'ANTAR member').replaceAll('_',' ')

const timeLabel=(value?:string|null)=>{
  if(!value)return ''
  const date=new Date(value)
  const today=new Date()
  if(date.toDateString()===today.toDateString()){
    return date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
  }
  return date.toLocaleDateString([],{day:'2-digit',month:'short'})
}

export default function Messaging({
  userId,
  childId,
  mode,
}:{userId:string;childId?:string;mode:'parent'|'staff'}){
  const [contacts,setContacts]=useState<Contact[]>([])
  const [threads,setThreads]=useState<Thread[]>([])
  const [activeId,setActiveId]=useState('')
  const [messages,setMessages]=useState<ChatMessage[]>([])
  const [draft,setDraft]=useState('')
  const [loading,setLoading]=useState(true)
  const [working,setWorking]=useState(false)
  const [status,setStatus]=useState('')

  const visibleThreads=useMemo(
    ()=>childId?threads.filter(t=>t.child_id===childId):threads,
    [threads,childId],
  )

  const active=visibleThreads.find(t=>t.conversation_id===activeId)
    || threads.find(t=>t.conversation_id===activeId)

  async function loadOverview(keepSelection=true){
    const args=childId?{p_child_id:childId}:{}
    const [contactRes,threadRes]=await Promise.all([
      supabase.rpc('messaging_contacts',args),
      supabase.rpc('messaging_my_threads'),
    ])
    if(contactRes.error||threadRes.error){
      setStatus(contactRes.error?.message||threadRes.error?.message||'Unable to load messages.')
      setLoading(false)
      return
    }
    const nextContacts=(contactRes.data||[]) as Contact[]
    const nextThreads=((threadRes.data||[]) as Thread[]).map(t=>({
      ...t,
      unread_count:Number(t.unread_count||0),
    }))
    setContacts(nextContacts)
    setThreads(nextThreads)
    setLoading(false)
    if(!keepSelection && nextThreads.length){
      const candidates=childId?nextThreads.filter(t=>t.child_id===childId):nextThreads
      if(candidates[0]) setActiveId(candidates[0].conversation_id)
    }
  }

  async function loadMessages(conversationId:string,markRead=true){
    if(!conversationId)return
    const {data,error}=await supabase.rpc('messaging_thread_messages',{
      p_conversation_id:conversationId,
    })
    if(error){
      setStatus(error.message)
      return
    }
    setMessages((data||[]) as ChatMessage[])
    if(markRead){
      const read=await supabase.rpc('messaging_mark_read',{p_conversation_id:conversationId})
      if(!read.error){
        setThreads(current=>current.map(t=>t.conversation_id===conversationId?{...t,unread_count:0}:t))
      }
    }
  }

  useEffect(()=>{
    setLoading(true)
    setActiveId('')
    setMessages([])
    void loadOverview(false)
  },[userId,childId])

  useEffect(()=>{
    if(!activeId){
      setMessages([])
      return
    }
    void loadMessages(activeId)
    const timer=window.setInterval(()=>{
      void loadMessages(activeId,true)
      void loadOverview(true)
    },4000)
    return ()=>window.clearInterval(timer)
  },[activeId])

  async function openExisting(thread:Thread){
    setStatus('')
    setActiveId(thread.conversation_id)
    await loadMessages(thread.conversation_id)
  }

  async function startConversation(contact:Contact){
    setWorking(true)
    setStatus('Opening secure conversation…')
    const {data,error}=await supabase.rpc('messaging_open_thread',{
      p_child_id:contact.child_id,
      p_contact_user_id:contact.contact_user_id,
    })
    if(error){
      setStatus(error.message)
      setWorking(false)
      return
    }
    const conversationId=String(data)
    setActiveId(conversationId)
    await loadOverview(true)
    await loadMessages(conversationId)
    setStatus('')
    setWorking(false)
  }

  async function sendMessage(e:FormEvent){
    e.preventDefault()
    const body=draft.trim()
    if(!activeId||!body||working)return
    setWorking(true)
    setStatus('')
    const {error}=await supabase.rpc('messaging_send_message',{
      p_conversation_id:activeId,
      p_body:body,
    })
    if(error){
      setStatus(error.message)
      setWorking(false)
      return
    }
    setDraft('')
    await Promise.all([loadMessages(activeId),loadOverview(true)])
    setWorking(false)
  }

  if(loading)return <div className="panel">Loading secure ANTAR messages…</div>

  return <div className="antar-messaging">
    <div className="messaging-heading">
      <div>
        <span className="eyebrow">ANTAR Communication</span>
        <h1>{mode==='parent'?'Message your child’s care team':'Parent Messages'}</h1>
        <p>{mode==='parent'
          ?'Private, child-specific conversations with staff currently assigned to your child.'
          :'Private conversations only with parents linked to children you are currently assigned to.'}</p>
      </div>
      <button className="mini-button" onClick={()=>void loadOverview(true)} disabled={working}>
        <RefreshCw size={15}/> Refresh
      </button>
    </div>

    {status&&<div className="status-message">{status}</div>}

    <div className="messaging-layout">
      <aside className="message-inbox panel">
        <div className="message-section-title">
          <div><MessageCircle size={17}/><strong>Conversations</strong></div>
          <small>{visibleThreads.length}</small>
        </div>

        <div className="thread-list">
          {visibleThreads.map(thread=><button
            key={thread.conversation_id}
            className={`thread-row ${activeId===thread.conversation_id?'active':''}`}
            onClick={()=>void openExisting(thread)}
          >
            <div className="thread-avatar">{thread.other_name?.slice(0,1).toUpperCase()||'A'}</div>
            <div className="thread-copy">
              <div><strong>{thread.other_name}</strong><small>{timeLabel(thread.last_message_at)}</small></div>
              <span>{thread.relationship_label} · {thread.child_name}</span>
              <p>{thread.last_message||'Conversation ready — send the first message.'}</p>
            </div>
            {thread.unread_count>0&&<span className="unread-pill">{thread.unread_count}</span>}
          </button>)}
          {!visibleThreads.length&&<p className="empty-message">No conversations yet. Start one with an authorized contact below.</p>}
        </div>

        <div className="message-section-title contact-title">
          <div><Users size={17}/><strong>{mode==='parent'?'Care team':'Linked parents'}</strong></div>
        </div>

        <div className="contact-list">
          {contacts.map(contact=>{
            const existing=threads.find(t=>t.child_id===contact.child_id&&t.other_user_id===contact.contact_user_id)
            return <button
              key={`${contact.child_id}-${contact.contact_user_id}`}
              className="contact-row"
              disabled={working}
              onClick={()=>existing?void openExisting(existing):void startConversation(contact)}
            >
              <div>
                <strong>{contact.contact_name}</strong>
                <small>{contact.relationship_label} · {contact.child_name}</small>
              </div>
              <span>{existing?'Open':'Message'}</span>
            </button>
          })}
          {!contacts.length&&<p className="empty-message">No authorized messaging contacts are assigned right now.</p>}
        </div>

        <div className="message-privacy">
          <LockKeyhole size={15}/>
          <span>Only linked parents and assigned care-team staff can participate.</span>
        </div>
      </aside>

      <section className="message-panel panel">
        {active?<>

          <header className="chat-header">
            <div className="thread-avatar large">{active.other_name?.slice(0,1).toUpperCase()||'A'}</div>
            <div>
              <strong>{active.other_name}</strong>
              <span>{active.relationship_label} · {active.child_name}</span>
              <small>{displayRole(active.other_role)}</small>
            </div>
            <span className={`conversation-status ${active.relationship_active?'active':'inactive'}`}>
              {active.relationship_active?'Authorized':'Read only'}
            </span>
          </header>

          {!active.relationship_active&&<div className="message-readonly">
            This assignment is no longer active. Previous messages remain visible, but new messages are disabled.
          </div>}

          <div className="message-stream">
            {messages.map(message=><div
              key={message.message_id}
              className={`message-bubble-row ${message.is_mine?'mine':'theirs'}`}
            >
              <div className="message-bubble">
                {!message.is_mine&&<small>{message.sender_name}</small>}
                <p>{message.body}</p>
                <time>{new Date(message.created_at).toLocaleString([],{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time>
              </div>
            </div>)}
            {!messages.length&&<div className="chat-empty">
              <MessageCircle size={30}/>
              <strong>Start the conversation</strong>
              <p>Use this thread for child-specific learning, care, scheduling or follow-up communication.</p>
            </div>}
          </div>

          <form className="message-composer" onSubmit={sendMessage}>
            <textarea
              value={draft}
              onChange={e=>setDraft(e.target.value)}
              placeholder={active.relationship_active?'Write a private message…':'This conversation is read only.'}
              maxLength={5000}
              disabled={!active.relationship_active||working}
              onKeyDown={e=>{
                if(e.key==='Enter'&&!e.shiftKey){
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <button
              className="primary-button"
              disabled={!active.relationship_active||working||!draft.trim()}
            >
              <Send size={17}/> {working?'Sending…':'Send'}
            </button>
          </form>
          <p className="composer-note">Enter to send · Shift + Enter for a new line</p>
        </>:<div className="chat-placeholder">
          <MessageCircle size={38}/>
          <h2>ANTAR Messages</h2>
          <p>{mode==='parent'
            ?'Choose a member of your child’s assigned care team to start a private conversation.'
            :'Choose a linked parent to start or continue a child-specific conversation.'}</p>
        </div>}
      </section>
    </div>
  </div>
}

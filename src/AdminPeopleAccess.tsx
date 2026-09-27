import { FormEvent, useEffect, useState } from 'react'
import { MailPlus, ShieldCheck, UserPlus } from 'lucide-react'
import { supabase } from './supabase'

export type AdminMember = {
  id:string
  user_id:string
  email:string
  role:string
  status:string
  staff_code?:string|null
  profiles?:{full_name?:string;phone?:string}|null
}

const roleLabel=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default function AdminPeopleAccess({
  members,
  onRefresh,
}:{members:AdminMember[];onRefresh:()=>Promise<void>}){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [role,setRole]=useState('parent')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [currentUserId,setCurrentUserId]=useState('')

  useEffect(()=>{void supabase.auth.getUser().then(({data})=>setCurrentUserId(data.user?.id||''))},[])

  async function invite(e:FormEvent){
    e.preventDefault()
    if(!email.trim()){setMessage('Enter an email address.');return}
    setBusy(true)
    setMessage('Creating ANTAR access…')

    const {data,error}=await supabase.functions.invoke('invite-member',{
      body:{
        email:email.trim(),
        full_name:name.trim(),
        role,
      },
    })

    if(error){
      setMessage(error.message||'Unable to add this person.')
      setBusy(false)
      return
    }

    if(data?.error){
      setMessage(data.error)
      setBusy(false)
      return
    }

    setMessage(data?.message||'Access granted successfully.')
    setName('')
    setEmail('')
    setRole('parent')
    await onRefresh()
    setBusy(false)
  }

  async function patchMember(id:string,patch:Record<string,string>){
    setBusy(true)
    setMessage('Updating access…')
    const {error}=await supabase.from('institution_members').update(patch).eq('id',id)
    if(error){
      setMessage(error.message)
      setBusy(false)
      return
    }
    setMessage('Access updated.')
    await onRefresh()
    setBusy(false)
  }

  return <div className="people-access-stack">
    <div className="panel add-person-panel">
      <div className="panel-title">
        <div>
          <h2>Add Person & Give Access</h2>
          <p>Enter an email, choose the correct role and grant ANTAR access. New users receive a secure email invitation to set their password.</p>
        </div>
        <span className="feature-icon"><UserPlus size={21}/></span>
      </div>

      {message&&<div className="status-message admin-status">{message}</div>}

      <form className="add-person-form" onSubmit={invite}>
        <label>Full name
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Neha Sharma"/>
        </label>
        <label>Email address
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required/>
        </label>
        <label>Role
          <select value={role} onChange={e=>setRole(e.target.value)}>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
            <option value="special_educator">Special Educator</option>
            <option value="therapist">Therapist</option>
            <option value="institute_admin">Institute Admin</option>
          </select>
        </label>
        <button className="primary-button" disabled={busy}>
          <MailPlus size={16}/> {busy?'Working…':'Send Invite & Grant Access'}
        </button>
      </form>

      <div className="access-flow-note">
        <ShieldCheck size={17}/>
        <span><strong>Secure flow:</strong> ANTAR creates or reuses the Supabase Auth account on the server, attaches it to this institution, and never exposes administrator credentials in the browser.</span>
      </div>
    </div>

    <div className="panel">
      <div className="panel-title">
        <div>
          <h2>People & Access</h2>
          <p>Review everyone who can access this institution. You can change a role or suspend access at any time.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Access</th></tr></thead>
          <tbody>
            {members.map(member=><tr key={member.id}>
              <td>
                <strong>{member.profiles?.full_name||member.email.split('@')[0]}</strong>
                <small>{member.email}{member.staff_code?` · ${member.staff_code}`:''}</small>
              </td>
              <td>
                <select value={member.role} disabled={busy} onChange={e=>void patchMember(member.id,{role:e.target.value})}>
                  {['parent','teacher','special_educator','therapist','institute_admin'].map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </td>
              <td><span className={`badge ${member.status}`}>{roleLabel(member.status)}</span></td>
              <td>
                <button
                  className="mini-button"
                  disabled={busy||member.user_id===currentUserId}
                  title={member.user_id===currentUserId?'You cannot suspend yourself from this screen.':''}
                  onClick={()=>void patchMember(member.id,{status:member.status==='active'?'suspended':'active'})}
                >
                  {member.user_id===currentUserId?'Your account':member.status==='active'?'Suspend':'Activate'}
                </button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!members.length&&<p className="helper">No institution members found yet.</p>}
    </div>
  </div>
}

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link2, MailPlus, ShieldCheck, Unlink, UserPlus } from 'lucide-react'
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

type ClassRow={id:string;name:string;section?:string;academic_year?:string}
type ChildRow={id:string;first_name:string;last_name?:string;grade_or_program?:string;section?:string;student_identifier?:string}
type EnrollmentRow={class_id:string;child_id:string}
type CanonicalClassRow={class_id:string;class_name:string;section?:string;academic_year?:string}
type CanonicalChildRow={child_id:string;first_name:string;last_name?:string;student_identifier?:string;current_class_id?:string|null;current_class_name?:string|null;current_section?:string|null}
type ParentLink={id:string;parent_id:string;child_id:string;status:string}

const roleLabel=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default function AdminPeopleAccess({
  members,
  onRefresh,
}:{members:AdminMember[];onRefresh:()=>Promise<void>}){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [role,setRole]=useState('parent')
  const [inviteClassId,setInviteClassId]=useState('')
  const [inviteChildId,setInviteChildId]=useState('')

  const [classes,setClasses]=useState<ClassRow[]>([])
  const [children,setChildren]=useState<ChildRow[]>([])
  const [enrollments,setEnrollments]=useState<EnrollmentRow[]>([])
  const [links,setLinks]=useState<ParentLink[]>([])

  const [assignParentId,setAssignParentId]=useState('')
  const [assignClassId,setAssignClassId]=useState('')
  const [assignChildId,setAssignChildId]=useState('')

  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [currentUserId,setCurrentUserId]=useState('')

  const parents=useMemo(
    ()=>members.filter(m=>m.role==='parent'&&m.status==='active'),
    [members],
  )

  const rosterFor=(classId:string)=>{
    const ids=new Set(enrollments.filter(e=>e.class_id===classId).map(e=>e.child_id))
    return children.filter(child=>ids.has(child.id))
  }

  const classForChild=(childId:string)=>{
    const enrollment=enrollments.find(e=>e.child_id===childId)
    return classes.find(c=>c.id===enrollment?.class_id)
  }

  async function loadAccessData(){
    const [classRes,childRes]=await Promise.all([
      supabase.rpc('admin_classes_overview'),
      supabase.rpc('admin_children_class_status'),
    ])

    if(classRes.error||childRes.error){
      setMessage(classRes.error?.message||childRes.error?.message||'Unable to load class and child access.')
      return
    }

    const canonicalClasses=(classRes.data||[]) as CanonicalClassRow[]
    const canonicalChildren=(childRes.data||[]) as CanonicalChildRow[]

    const nextClasses:ClassRow[]=canonicalClasses.map(row=>({
      id:row.class_id,
      name:row.class_name,
      section:row.section,
      academic_year:row.academic_year,
    }))

    const nextChildren:ChildRow[]=canonicalChildren.map(row=>({
      id:row.child_id,
      first_name:row.first_name,
      last_name:row.last_name,
      grade_or_program:row.current_class_name||undefined,
      section:row.current_section||undefined,
      student_identifier:row.student_identifier,
    }))

    const nextEnrollments:EnrollmentRow[]=canonicalChildren
      .filter(row=>!!row.current_class_id)
      .map(row=>({class_id:String(row.current_class_id),child_id:row.child_id}))

    setClasses(nextClasses)
    setChildren(nextChildren)
    setEnrollments(nextEnrollments)

    setInviteClassId(current=>current&&nextClasses.some(c=>c.id===current)?current:(nextClasses[0]?.id||''))
    setAssignClassId(current=>current&&nextClasses.some(c=>c.id===current)?current:(nextClasses[0]?.id||''))
  }

  async function loadLinks(){
    if(!parents.length){
      setLinks([])
      setAssignParentId('')
      return
    }

    setAssignParentId(current=>current&&parents.some(p=>p.user_id===current)?current:parents[0].user_id)

    const {data,error}=await supabase
      .from('parent_child_links')
      .select('id,parent_id,child_id,status')
      .in('parent_id',parents.map(p=>p.user_id))

    if(error){setMessage(error.message);return}
    setLinks((data||[]) as ParentLink[])
  }

  useEffect(()=>{
    void supabase.auth.getUser().then(({data})=>setCurrentUserId(data.user?.id||''))
    void loadAccessData()
  },[])

  useEffect(()=>{void loadLinks()},[members])

  useEffect(()=>{
    const roster=rosterFor(inviteClassId)
    setInviteChildId(current=>current&&roster.some(c=>c.id===current)?current:(roster[0]?.id||''))
  },[inviteClassId,enrollments,children])

  useEffect(()=>{
    const roster=rosterFor(assignClassId)
    setAssignChildId(current=>current&&roster.some(c=>c.id===current)?current:(roster[0]?.id||''))
  },[assignClassId,enrollments,children])

  async function invite(e:FormEvent){
    e.preventDefault()
    if(!email.trim()){setMessage('Enter an email address.');return}
    if(role==='parent'&&(!inviteClassId||!inviteChildId)){
      setMessage('Choose the parent’s child by class and section before sending the invite.')
      return
    }

    setBusy(true)
    setMessage('Creating ANTAR access…')

    const {data,error}=await supabase.functions.invoke('invite-member',{
      body:{
        email:email.trim(),
        full_name:name.trim(),
        role,
        class_id:role==='parent'?inviteClassId:null,
        child_id:role==='parent'?inviteChildId:null,
      },
    })

    if(error){
      let detail=error.message||'Unable to add this person.'
      try{
        const response=(error as any).context
        if(response?.json){
          const body=await response.json()
          if(body?.error) detail=body.error
        }
      }catch{}
      setMessage(detail)
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
    await loadAccessData()
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

  async function assignParentChild(){
    if(!assignParentId||!assignClassId||!assignChildId){
      setMessage('Choose a parent, class and child first.')
      return
    }

    setBusy(true)
    setMessage('Assigning child access…')

    const {error}=await supabase.from('parent_child_links').upsert({
      parent_id:assignParentId,
      child_id:assignChildId,
      relationship:'Parent',
      status:'active',
    },{onConflict:'parent_id,child_id'})

    if(error){
      setMessage(error.message)
      setBusy(false)
      return
    }

    setMessage('Parent is now linked only through the child access you assigned. You can add another child separately if the family has siblings.')
    await loadLinks()
    setBusy(false)
  }

  async function revokeLink(linkId:string){
    setBusy(true)
    const {error}=await supabase
      .from('parent_child_links')
      .update({status:'revoked'})
      .eq('id',linkId)

    if(error){
      setMessage(error.message)
      setBusy(false)
      return
    }

    setMessage('Parent-child access revoked.')
    await loadLinks()
    setBusy(false)
  }

  const inviteRoster=rosterFor(inviteClassId)
  const assignRoster=rosterFor(assignClassId)
  const activeLinks=links.filter(link=>link.status==='active')

  return <div className="people-access-stack">
    <div className="panel add-person-panel">
      <div className="panel-title">
        <div>
          <h2>Add Person & Give Access</h2>
          <p>Enter an email, choose the correct role and grant ANTAR access. New users receive a secure email invitation to set their own password.</p>
        </div>
        <span className="feature-icon"><UserPlus size={21}/></span>
      </div>

      {message&&<div className="status-message admin-status">{message}</div>}

      <form className="add-person-form parent-aware" onSubmit={invite}>
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

        {role==='parent'&&<>
          <label>Child’s class & section
            <select value={inviteClassId} onChange={e=>setInviteClassId(e.target.value)} required>
              {classes.map(c=><option key={c.id} value={c.id}>{c.name}{c.section?` — Section ${c.section}`:''}</option>)}
            </select>
          </label>
          <label>Child
            <select value={inviteChildId} onChange={e=>setInviteChildId(e.target.value)} required>
              {inviteRoster.map(child=><option key={child.id} value={child.id}>
                {child.first_name} {child.last_name}{child.student_identifier?` — ${child.student_identifier}`:''}
              </option>)}
            </select>
          </label>
        </>}

        <button className="primary-button" disabled={busy}>
          <MailPlus size={16}/> {busy?'Working…':'Send Invite & Grant Access'}
        </button>
      </form>

      {role==='parent'&&<div className="parent-access-preview">
        <strong>Parent access preview</strong>
        <span>
          This parent will be linked to <b>{inviteRoster.find(c=>c.id===inviteChildId)?.first_name||'the selected enrolled child'}</b> in <b>{classes.find(c=>c.id===inviteClassId)?.name||'the selected class'}{classes.find(c=>c.id===inviteClassId)?.section?` · Section ${classes.find(c=>c.id===inviteClassId)?.section}`:''}</b>.
        </span>
        <small>They will not automatically see other children in the institution.</small>
      </div>}

      <div className="access-flow-note">
        <ShieldCheck size={17}/>
        <span><strong>Secure flow:</strong> ANTAR creates or reuses the Supabase Auth account on the server, attaches it to this institution, and never exposes administrator credentials in the browser.</span>
      </div>
    </div>

    <div className="panel parent-access-panel">
      <div className="panel-title">
        <div>
          <h2>Parent → Child Access</h2>
          <p>For existing parent accounts, choose the exact class, section and child they are allowed to see. Add siblings one at a time when needed.</p>
        </div>
        <span className="feature-icon"><Link2 size={21}/></span>
      </div>

      {parents.length?<div className="parent-link-form">
        <label>Parent
          <select value={assignParentId} onChange={e=>setAssignParentId(e.target.value)}>
            {parents.map(parent=><option key={parent.user_id} value={parent.user_id}>{parent.profiles?.full_name||parent.email} — {parent.email}</option>)}
          </select>
        </label>
        <label>Class & section
          <select value={assignClassId} onChange={e=>setAssignClassId(e.target.value)}>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name}{c.section?` — Section ${c.section}`:''}</option>)}
          </select>
        </label>
        <label>Child
          <select value={assignChildId} onChange={e=>setAssignChildId(e.target.value)}>
            {assignRoster.map(child=><option key={child.id} value={child.id}>{child.first_name} {child.last_name}{child.student_identifier?` — ${child.student_identifier}`:''}</option>)}
          </select>
        </label>
        <button className="primary-button" disabled={busy||!assignChildId} onClick={()=>void assignParentChild()}>Assign Child Access</button>
      </div>:<p className="helper">Add a Parent account first, then assign the child they can access.</p>}

      <div className="parent-link-list">
        {activeLinks.map(link=>{
          const parent=members.find(m=>m.user_id===link.parent_id)
          const child=children.find(c=>c.id===link.child_id)
          const cls=classForChild(link.child_id)
          return <div className="parent-link-card" key={link.id}>
            <div>
              <strong>{parent?.profiles?.full_name||parent?.email||'Parent'}</strong>
              <small>{parent?.email}</small>
            </div>
            <span className="link-arrow">→</span>
            <div>
              <strong>{child?`${child.first_name} ${child.last_name||''}`:'Child'}</strong>
              <small>{cls?.name||child?.grade_or_program||'Class not set'}{cls?.section?` · Section ${cls.section}`:''}</small>
            </div>
            <button className="mini-button danger" disabled={busy} onClick={()=>void revokeLink(link.id)}><Unlink size={14}/> Revoke</button>
          </div>
        })}
        {!activeLinks.length&&<p className="helper">No active parent-child links yet.</p>}
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
          <thead><tr><th>Person</th><th>Role</th><th>Child Access</th><th>Status</th><th>Access</th></tr></thead>
          <tbody>
            {members.map(member=>{
              const memberLinks=activeLinks.filter(link=>link.parent_id===member.user_id)
              return <tr key={member.id}>
                <td>
                  <strong>{member.profiles?.full_name||member.email.split('@')[0]}</strong>
                  <small>{member.email}{member.staff_code?` · ${member.staff_code}`:''}</small>
                </td>
                <td>
                  <select value={member.role} disabled={busy} onChange={e=>void patchMember(member.id,{role:e.target.value})}>
                    {['parent','teacher','special_educator','therapist','institute_admin'].map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </td>
                <td>
                  {member.role==='parent'
                    ? <div className="child-access-cell">
                        {memberLinks.length
                          ? memberLinks.map(link=>{
                              const child=children.find(c=>c.id===link.child_id)
                              const cls=classForChild(link.child_id)
                              return <span key={link.id}>{child?.first_name||'Child'} · {cls?.name||child?.grade_or_program||'Class'}{cls?.section?` ${cls.section}`:''}</span>
                            })
                          : <span className="muted">No child assigned</span>}
                      </div>
                    : <span className="muted">—</span>}
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
              </tr>
            })}
          </tbody>
        </table>
      </div>
      {!members.length&&<p className="helper">No institution members found yet.</p>}
    </div>
  </div>
}

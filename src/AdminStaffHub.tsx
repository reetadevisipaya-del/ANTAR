import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { supabase } from './supabase'

type StaffClass={
  assignment_id:string
  class_id:string
  class_name:string
  section?:string|null
  academic_year?:string|null
  active:boolean
  student_count:number
}

type StaffChild={
  assignment_id?:string
  child_id:string
  child_name:string
  student_identifier?:string|null
  assignment_type?:string
  class_id?:string|null
  class_name?:string|null
  section?:string|null
  access_source?:string
}

type StaffProfile={
  user_id:string
  email:string
  full_name:string
  phone?:string|null
  role:string
  status:string
  staff_code?:string|null
  created_at:string
  classes:StaffClass[]
  direct_children:StaffChild[]
  accessible_students:StaffChild[]
}

type ClassOption={
  class_id:string
  class_name:string
  section?:string|null
  academic_year?:string|null
  student_count:number
}

type ChildOption={
  child_id:string
  first_name:string
  last_name?:string|null
  student_identifier?:string|null
  current_class_id?:string|null
  current_class_name?:string|null
  current_section?:string|null
}

const pretty=(value?:string|null)=>value?value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):'—'

export default function AdminStaffHub({
  initialChildId,
  onOpenChild,
  onOpenPeople,
  onOpenClasses,
}:{
  initialChildId?:string
  onOpenChild:(childId:string)=>void
  onOpenPeople:()=>void
  onOpenClasses:()=>void
}){
  const [staff,setStaff]=useState<StaffProfile[]>([])
  const [classes,setClasses]=useState<ClassOption[]>([])
  const [children,setChildren]=useState<ChildOption[]>([])
  const [selectedId,setSelectedId]=useState('')
  const [query,setQuery]=useState('')
  const [roleFilter,setRoleFilter]=useState('all')
  const [studentQuery,setStudentQuery]=useState('')
  const [classChoice,setClassChoice]=useState('')
  const [childChoice,setChildChoice]=useState(initialChildId||'')
  const [editing,setEditing]=useState(false)
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)

  async function load(preferred?:string){
    setLoading(true)
    setMessage('')
    const [staffRes,classRes,childRes]=await Promise.all([
      supabase.rpc('admin_staff_management_overview'),
      supabase.rpc('admin_classes_overview'),
      supabase.rpc('admin_children_class_status'),
    ])
    if(staffRes.error||classRes.error||childRes.error){
      setMessage(staffRes.error?.message||classRes.error?.message||childRes.error?.message||'Unable to load staff management.')
      setLoading(false)
      return
    }
    const next=((staffRes.data||[]) as StaffProfile[]).map(row=>({
      ...row,
      classes:Array.isArray(row.classes)?row.classes:[],
      direct_children:Array.isArray(row.direct_children)?row.direct_children:[],
      accessible_students:Array.isArray(row.accessible_students)?row.accessible_students:[],
    }))
    const nextClasses=((classRes.data||[]) as ClassOption[]).map(row=>({...row,student_count:Number(row.student_count||0)}))
    const nextChildren=(childRes.data||[]) as ChildOption[]
    setStaff(next)
    setClasses(nextClasses)
    setChildren(nextChildren)

    let wanted=preferred||selectedId
    if(initialChildId){
      const assigned=next.find(member=>member.direct_children.some(child=>child.child_id===initialChildId))
      if(assigned)wanted=assigned.user_id
    }
    setSelectedId(wanted&&next.some(member=>member.user_id===wanted)?wanted:(next.find(member=>member.status==='active')?.user_id||next[0]?.user_id||''))
    setClassChoice(current=>current&&nextClasses.some(cls=>cls.class_id===current)?current:(nextClasses[0]?.class_id||''))
    setChildChoice(current=>current&&nextChildren.some(child=>child.child_id===current)?current:(initialChildId&&nextChildren.some(child=>child.child_id===initialChildId)?initialChildId:(nextChildren[0]?.child_id||'')))
    setLoading(false)
  }

  useEffect(()=>{void load()},[initialChildId])

  const selected=staff.find(member=>member.user_id===selectedId)||null

  useEffect(()=>{
    if(!selected)return
    setName(selected.full_name||'')
    setPhone(selected.phone||'')
    setEditing(false)
    setStudentQuery('')
  },[selectedId])

  const filteredStaff=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return staff.filter(member=>{
      if(roleFilter!=='all'&&member.role!==roleFilter)return false
      if(!q)return true
      return [member.full_name,member.email,member.staff_code,member.role]
        .filter(Boolean)
        .some(value=>String(value).toLowerCase().includes(q))
    })
  },[staff,query,roleFilter])

  const visibleStudents=useMemo(()=>{
    if(!selected)return []
    const q=studentQuery.trim().toLowerCase()
    return selected.accessible_students.filter(child=>{
      if(!q)return true
      return [child.child_name,child.student_identifier,child.class_name,child.section]
        .filter(Boolean)
        .some(value=>String(value).toLowerCase().includes(q))
    })
  },[selected,studentQuery])

  async function saveProfile(){
    if(!selected)return
    if(!name.trim())return setMessage('Staff name cannot be empty.')
    setBusy(true)
    setMessage('Saving staff profile…')
    const {error}=await supabase.rpc('admin_update_staff_profile',{
      p_staff_id:selected.user_id,
      p_full_name:name.trim(),
      p_phone:phone.trim()||null,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage('Staff contact profile updated.')
    setEditing(false)
    await load(selected.user_id)
    setBusy(false)
  }

  async function assignClass(){
    if(!selected||!classChoice)return
    if(selected.role==='therapist')return setMessage('Therapists are assigned directly to students, not whole classes.')
    if(selected.status!=='active')return setMessage('Reactivate this staff account before adding assignments.')
    setBusy(true)
    setMessage('Assigning class…')
    const {error}=await supabase.rpc('admin_assign_staff_to_class',{
      p_class_id:classChoice,
      p_staff_id:selected.user_id,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage('Class assigned successfully.')
    await load(selected.user_id)
    setBusy(false)
  }

  async function removeClass(classId:string){
    if(!selected)return
    setBusy(true)
    setMessage('Removing class access…')
    const {error}=await supabase.rpc('admin_unassign_staff_from_class',{
      p_class_id:classId,
      p_staff_id:selected.user_id,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage('Class assignment removed.')
    await load(selected.user_id)
    setBusy(false)
  }

  async function assignChild(){
    if(!selected||!childChoice)return
    if(selected.status!=='active')return setMessage('Reactivate this staff account before adding assignments.')
    setBusy(true)
    setMessage(selected.role==='therapist'?'Adding student to therapy caseload…':'Assigning student…')
    const {error}=await supabase.rpc('admin_assign_staff_child',{
      p_staff_id:selected.user_id,
      p_child_id:childChoice,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage(selected.role==='therapist'?'Student added to therapist caseload.':'Student assignment added.')
    await load(selected.user_id)
    setBusy(false)
  }

  async function removeChild(assignmentId?:string){
    if(!selected||!assignmentId)return
    setBusy(true)
    setMessage('Removing student assignment…')
    const {error}=await supabase.rpc('admin_unassign_staff_child',{p_assignment_id:assignmentId})
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage('Student assignment removed.')
    await load(selected.user_id)
    setBusy(false)
  }

  if(loading)return <div className="panel">Loading staff profiles and assignments…</div>

  return <div className="admin-staff-hub">
    <section className="panel admin-staff-directory">
      <div className="admin-staff-directory-head">
        <div>
          <span className="eyebrow">Institute Team</span>
          <h2>Staff & Caseloads</h2>
          <p>One place for teacher classes, special-educator access, therapist caseloads and student profiles.</p>
        </div>
        <button className="primary-button" onClick={onOpenPeople}><Plus size={15}/> Invite Staff</button>
      </div>

      <div className="admin-staff-filters">
        <label><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search staff"/></label>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
          <option value="all">All staff</option>
          <option value="teacher">Teachers</option>
          <option value="special_educator">Special educators</option>
          <option value="therapist">Therapists</option>
        </select>
      </div>

      <div className="admin-staff-list">
        {filteredStaff.map(member=><button key={member.user_id} className={selectedId===member.user_id?'active':''} onClick={()=>setSelectedId(member.user_id)}>
          <span className="staff-directory-avatar">{member.full_name.slice(0,1).toUpperCase()}</span>
          <span>
            <strong>{member.full_name}</strong>
            <small>{pretty(member.role)}{member.staff_code?' · '+member.staff_code:''}</small>
            <em>{member.classes.length} class{member.classes.length===1?'':'es'} · {member.accessible_students.length} student{member.accessible_students.length===1?'':'s'}</em>
          </span>
          <b className={member.status==='active'?'active':'inactive'}>{pretty(member.status)}</b>
        </button>)}
        {!filteredStaff.length&&<div className="child-record-empty">No staff match this view.</div>}
      </div>
    </section>

    <section className="admin-staff-detail">
      {selected?<div className="admin-staff-detail-stack">
        <article className="panel admin-staff-profile-head">
          <div className="admin-staff-profile-main">
            <span className="staff-profile-avatar">{selected.full_name.slice(0,1).toUpperCase()}</span>
            <div>
              <span className="eyebrow">{pretty(selected.role)}</span>
              <h2>{selected.full_name}</h2>
              <p>{selected.email}{selected.staff_code?' · '+selected.staff_code:''}</p>
            </div>
          </div>
          <div className="admin-staff-profile-actions">
            <button className="mini-button" onClick={()=>setEditing(v=>!v)}><Pencil size={14}/> {editing?'Close Edit':'Edit Contact'}</button>
            <button className="mini-button" onClick={onOpenPeople}><ShieldCheck size={14}/> Role & Access</button>
          </div>
        </article>

        {message&&<div className="status-message admin-status">{message}</div>}

        {editing&&<article className="panel staff-contact-editor">
          <div className="panel-title"><div><h3>Contact Profile</h3><p>Basic contact information shown to authorized families and staff.</p></div></div>
          <div className="staff-contact-form">
            <label>Full name<input value={name} onChange={e=>setName(e.target.value)}/></label>
            <label>Phone<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Optional phone number"/></label>
            <button className="primary-button" onClick={()=>void saveProfile()} disabled={busy||selected.status!=='active'}><CheckCircle2 size={15}/> Save Profile</button>
          </div>
        </article>}

        <section className="admin-staff-summary-grid">
          <div><BookOpen size={18}/><span><small>Assigned Classes</small><strong>{selected.classes.length}</strong></span></div>
          <div><Users size={18}/><span><small>{selected.role==='therapist'?'Therapy Caseload':'Direct Students'}</small><strong>{selected.direct_children.length}</strong></span></div>
          <div><UserRound size={18}/><span><small>Total Student Access</small><strong>{selected.accessible_students.length}</strong></span></div>
          <div><ShieldCheck size={18}/><span><small>Account Status</small><strong>{pretty(selected.status)}</strong></span></div>
        </section>

        <section className="admin-staff-management-grid">
          <article className="panel staff-assignment-card">
            <div className="staff-assignment-head">
              <div><BookOpen size={17}/><span><strong>Class Assignments</strong><small>For teachers and special educators</small></span></div>
              <button onClick={onOpenClasses}>Manage Classes</button>
            </div>
            {selected.role==='therapist'?<div className="staff-info-note"><Stethoscope size={17}/><span>Therapists use child-specific caseload assignments below instead of class-wide access.</span></div>:<>
              <div className="staff-assignment-form">
                <select value={classChoice} onChange={e=>setClassChoice(e.target.value)}>
                  {classes.map(cls=><option key={cls.class_id} value={cls.class_id}>{cls.class_name}{cls.section?' — Section '+cls.section:''} · {cls.student_count} students</option>)}
                </select>
                <button className="primary-button" disabled={busy||!classChoice||selected.status!=='active'} onClick={()=>void assignClass()}><Plus size={14}/> Assign Class</button>
              </div>
              <div className="staff-current-assignments">
                {selected.classes.map(cls=><div key={cls.class_id}>
                  <span className="staff-assignment-icon"><BookOpen size={15}/></span>
                  <span><strong>{cls.class_name}{cls.section?' — Section '+cls.section:''}</strong><small>{cls.student_count} students · {cls.academic_year||'Academic year'}</small></span>
                  <button className="icon-action danger" onClick={()=>void removeClass(cls.class_id)} disabled={busy} aria-label="Remove class"><Trash2 size={14}/></button>
                </div>)}
                {!selected.classes.length&&<p className="helper">No classes assigned yet.</p>}
              </div>
            </>}
          </article>

          <article className="panel staff-assignment-card">
            <div className="staff-assignment-head">
              <div>{selected.role==='therapist'?<Stethoscope size={17}/>:<Users size={17}/>}<span><strong>{selected.role==='therapist'?'Therapy Caseload':'Direct Student Assignment'}</strong><small>{selected.role==='therapist'?'Students this therapist supports':'Child-specific access in addition to class access'}</small></span></div>
            </div>
            <div className="staff-assignment-form">
              <select value={childChoice} onChange={e=>setChildChoice(e.target.value)}>
                {children.map(child=><option key={child.child_id} value={child.child_id}>{child.first_name} {child.last_name||''}{child.current_class_name?' · '+child.current_class_name+(child.current_section?' '+child.current_section:''):''}</option>)}
              </select>
              <button className="primary-button" disabled={busy||!childChoice||selected.status!=='active'} onClick={()=>void assignChild()}><Plus size={14}/> {selected.role==='therapist'?'Add to Caseload':'Assign Student'}</button>
            </div>
            <div className="staff-current-assignments">
              {selected.direct_children.map(child=><div key={child.assignment_id||child.child_id}>
                <span className="staff-assignment-icon"><UserRound size={15}/></span>
                <span><strong>{child.child_name}</strong><small>{child.class_name||'No class'}{child.section?' · Section '+child.section:''}{child.student_identifier?' · '+child.student_identifier:''}</small></span>
                <button className="mini-button" onClick={()=>onOpenChild(child.child_id)}>Open</button>
                <button className="icon-action danger" onClick={()=>void removeChild(child.assignment_id)} disabled={busy} aria-label="Remove student assignment"><Trash2 size={14}/></button>
              </div>)}
              {!selected.direct_children.length&&<p className="helper">{selected.role==='therapist'?'No students in this therapy caseload yet.':'No direct student assignments.'}</p>}
            </div>
          </article>
        </section>

        <article className="panel staff-student-access">
          <div className="staff-assignment-head">
            <div><Users size={17}/><span><strong>Students This Staff Member Can Access</strong><small>Combined class enrollment and direct assignments</small></span></div>
            <span className="staff-count-pill">{selected.accessible_students.length}</span>
          </div>
          <div className="staff-student-search"><Search size={14}/><input value={studentQuery} onChange={e=>setStudentQuery(e.target.value)} placeholder="Search student, class or roll number"/></div>
          <div className="staff-access-student-list">
            {visibleStudents.map(child=><button key={child.child_id} onClick={()=>onOpenChild(child.child_id)}>
              <span className="staff-directory-avatar small">{child.child_name.slice(0,1).toUpperCase()}</span>
              <span><strong>{child.child_name}</strong><small>{child.class_name||'No class'}{child.section?' · Section '+child.section:''}{child.student_identifier?' · '+child.student_identifier:''}</small></span>
              <em>{child.access_source==='class'?'Via class':pretty(child.access_source)}</em>
              <ChevronRight size={16}/>
            </button>)}
            {!visibleStudents.length&&<div className="child-record-empty">No accessible students match this search.</div>}
          </div>
        </article>

        <article className="panel staff-account-card">
          <div className="staff-assignment-head">
            <div><ShieldCheck size={17}/><span><strong>Account & Access</strong><small>Authentication and institute membership</small></span></div>
            <button onClick={onOpenPeople}>Manage in People & Access</button>
          </div>
          <dl className="structured-dl">
            <div><dt>Role</dt><dd>{pretty(selected.role)}</dd></div>
            <div><dt>Status</dt><dd>{pretty(selected.status)}</dd></div>
            <div><dt>Email</dt><dd><Mail size={12}/> {selected.email}</dd></div>
            <div><dt>Phone</dt><dd><Phone size={12}/> {selected.phone||'Not added'}</dd></div>
            <div><dt>Staff ID</dt><dd>{selected.staff_code||'Not assigned'}</dd></div>
          </dl>
        </article>
      </div>:<div className="panel child-record-empty-detail"><Users size={28}/><h2>No staff selected</h2><p>Choose a teacher, special educator or therapist from the directory.</p></div>}
    </section>
  </div>
}

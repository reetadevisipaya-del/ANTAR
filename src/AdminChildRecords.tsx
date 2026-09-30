import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Baby,
  BookOpen,
  CalendarDays,
  FileHeart,
  FileText,
  FolderOpen,
  HeartPulse,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react'
import { supabase } from './supabase'

type Person={
  name?:string
  email?:string
  phone?:string|null
  relationship?:string
  role?:string
  assignment?:string
}

type ChildRecord={
  child_id:string
  first_name:string
  last_name?:string|null
  date_of_birth?:string|null
  student_identifier?:string|null
  blood_group?:string|null
  support_profile?:string|null
  active:boolean
  created_at:string
  class_id?:string|null
  class_name?:string|null
  class_section?:string|null
  academic_year?:string|null
  parents:Person[]
  staff:Person[]
  document_count:number
  medical_document_count:number
  appointment_count:number
  upcoming_appointment_count:number
  therapy_count:number
  upcoming_therapy_count:number
}

type AdminDestination='classes'|'documents'|'care'|'assignments'

const pretty=(value?:string|null)=>value?value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):'—'
const dateLabel=(value?:string|null)=>{
  if(!value)return 'Not added'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString([],{day:'2-digit',month:'short',year:'numeric'})
}

const blankForm={
  first_name:'',
  last_name:'',
  student_identifier:'',
  date_of_birth:'',
  blood_group:'',
  support_profile:'',
  active:true,
}

export default function AdminChildRecords({
  onNavigate,
  onChanged,
}:{
  onNavigate:(destination:AdminDestination)=>void
  onChanged?:()=>void
}){
  const [rows,setRows]=useState<ChildRecord[]>([])
  const [selectedId,setSelectedId]=useState('')
  const [query,setQuery]=useState('')
  const [showInactive,setShowInactive]=useState(false)
  const [editing,setEditing]=useState(false)
  const [creating,setCreating]=useState(false)
  const [form,setForm]=useState(blankForm)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')

  async function load(preferredId?:string){
    setLoading(true)
    const {data,error}=await supabase.rpc('admin_child_records_overview')
    if(error){
      setStatus(error.message)
      setRows([])
      setLoading(false)
      return
    }
    const next=((data||[]) as ChildRecord[]).map(row=>({
      ...row,
      parents:Array.isArray(row.parents)?row.parents:[],
      staff:Array.isArray(row.staff)?row.staff:[],
      document_count:Number(row.document_count||0),
      medical_document_count:Number(row.medical_document_count||0),
      appointment_count:Number(row.appointment_count||0),
      upcoming_appointment_count:Number(row.upcoming_appointment_count||0),
      therapy_count:Number(row.therapy_count||0),
      upcoming_therapy_count:Number(row.upcoming_therapy_count||0),
    }))
    setRows(next)
    const wanted=preferredId||selectedId
    setSelectedId(wanted&&next.some(r=>r.child_id===wanted)?wanted:(next.find(r=>r.active)?.child_id||next[0]?.child_id||''))
    setLoading(false)
  }

  useEffect(()=>{void load()},[])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    return rows.filter(row=>{
      if(!showInactive&&!row.active)return false
      if(!q)return true
      return [
        row.first_name,row.last_name,row.student_identifier,row.class_name,row.class_section,
      ].filter(Boolean).some(value=>String(value).toLowerCase().includes(q))
    })
  },[rows,query,showInactive])

  const selected=rows.find(row=>row.child_id===selectedId)||null

  function startEdit(row:ChildRecord){
    setCreating(false)
    setEditing(true)
    setForm({
      first_name:row.first_name||'',
      last_name:row.last_name||'',
      student_identifier:row.student_identifier||'',
      date_of_birth:row.date_of_birth||'',
      blood_group:row.blood_group||'',
      support_profile:row.support_profile||'',
      active:Boolean(row.active),
    })
    setStatus('')
  }

  function startCreate(){
    setCreating(true)
    setEditing(true)
    setForm(blankForm)
    setStatus('')
  }

  async function save(e:FormEvent){
    e.preventDefault()
    if(!form.first_name.trim())return setStatus('First name is required.')
    setBusy(true)
    setStatus(creating?'Creating child record…':'Saving child record…')
    const {data,error}=await supabase.rpc('admin_save_child_record',{
      p_child_id:creating?null:selected?.child_id||null,
      p_first_name:form.first_name.trim(),
      p_last_name:form.last_name.trim()||null,
      p_student_identifier:form.student_identifier.trim()||null,
      p_date_of_birth:form.date_of_birth||null,
      p_blood_group:form.blood_group.trim()||null,
      p_support_profile:form.support_profile.trim()||null,
      p_active:form.active,
    })
    if(error){
      setStatus(error.message)
      setBusy(false)
      return
    }
    setEditing(false)
    setCreating(false)
    setStatus(creating?'Child record created. Add class enrollment and access links next.':'Child record updated.')
    await load(String(data||selected?.child_id||''))
    onChanged?.()
    setBusy(false)
  }

  if(loading)return <div className="panel">Loading structured child records…</div>

  return <div className="child-records-system">
    <section className="panel child-records-directory">
      <div className="child-records-title">
        <div>
          <span className="eyebrow">Institute Records</span>
          <h2>Child Records</h2>
          <p>One structured record for identity, school placement, support, family access, staff and care.</p>
        </div>
        <button className="primary-button" onClick={startCreate}><Plus size={16}/> Add Child</button>
      </div>

      {status&&<div className="status-message admin-status">{status}</div>}

      <div className="child-record-controls">
        <label className="child-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, student no. or class"/></label>
        <label className="child-inactive-toggle"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Show inactive</label>
      </div>

      <div className="child-record-list">
        {filtered.map(row=><button key={row.child_id} className={`child-record-list-item ${selectedId===row.child_id?'active':''}`} onClick={()=>{setSelectedId(row.child_id);setEditing(false);setCreating(false)}}>
          <span className="child-record-avatar">{row.first_name.slice(0,1).toUpperCase()}</span>
          <span>
            <strong>{row.first_name} {row.last_name||''}</strong>
            <small>{row.class_name||'No class'}{row.class_section?` · Section ${row.class_section}`:''}</small>
            <em>{row.student_identifier||'Student number not added'}</em>
          </span>
          <b className={row.active?'active':'inactive'}>{row.active?'Active':'Inactive'}</b>
        </button>)}
        {!filtered.length&&<div className="child-record-empty">No child records match this view.</div>}
      </div>
    </section>

    <section className="child-record-detail">
      {editing?<form className="panel child-record-editor" onSubmit={save}>
        <div className="child-record-detail-head">
          <div>
            <span className="eyebrow">{creating?'New Child Record':'Edit Core Record'}</span>
            <h2>{creating?'Add a child':`${selected?.first_name||''} ${selected?.last_name||''}`}</h2>
            <p>Keep identity, health and support information concise and current. Class placement is managed separately.</p>
          </div>
          <button type="button" className="mini-button" onClick={()=>{setEditing(false);setCreating(false)}}>Cancel</button>
        </div>

        <div className="child-record-form-grid">
          <label>First name<input value={form.first_name} onChange={e=>setForm(v=>({...v,first_name:e.target.value}))} required/></label>
          <label>Last name<input value={form.last_name} onChange={e=>setForm(v=>({...v,last_name:e.target.value}))}/></label>
          <label>Roll / Student No.<input value={form.student_identifier} onChange={e=>setForm(v=>({...v,student_identifier:e.target.value}))} placeholder="Institute student number"/></label>
          <label>Date of birth<input type="date" value={form.date_of_birth} onChange={e=>setForm(v=>({...v,date_of_birth:e.target.value}))}/></label>
          <label>Blood group<input value={form.blood_group} onChange={e=>setForm(v=>({...v,blood_group:e.target.value}))} placeholder="e.g. B+"/></label>
          <label className="child-active-field"><span>Status</span><select value={form.active?'active':'inactive'} onChange={e=>setForm(v=>({...v,active:e.target.value==='active'}))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label className="wide">Support profile<textarea value={form.support_profile} onChange={e=>setForm(v=>({...v,support_profile:e.target.value}))} placeholder="Learning, communication, sensory, mobility or care supports that staff should know."/></label>
        </div>
        <div className="child-record-save"><button className="primary-button" disabled={busy}>{busy?'Saving…':creating?'Create Child Record':'Save Changes'}</button></div>
      </form>:selected?<div className="child-record-detail-stack">
        <div className="panel child-record-profile-head">
          <div className="child-record-heading-main">
            <span className="child-record-large-avatar">{selected.first_name.slice(0,1).toUpperCase()}</span>
            <div>
              <span className="eyebrow">Child Record</span>
              <h2>{selected.first_name} {selected.last_name||''}</h2>
              <p>{selected.student_identifier||'Student number not added'} · {selected.active?'Active record':'Inactive record'}</p>
            </div>
          </div>
          <button className="mini-button" onClick={()=>startEdit(selected)}><Pencil size={14}/> Edit Core Record</button>
        </div>

        <div className="child-record-summary-grid">
          <div className="child-record-summary-card"><UserRound size={18}/><span><small>Date of birth</small><strong>{dateLabel(selected.date_of_birth)}</strong></span></div>
          <div className="child-record-summary-card"><BookOpen size={18}/><span><small>Class</small><strong>{selected.class_name||'Not enrolled'}</strong></span></div>
          <div className="child-record-summary-card"><Users size={18}/><span><small>Section</small><strong>{selected.class_section||'—'}</strong></span></div>
          <div className="child-record-summary-card"><HeartPulse size={18}/><span><small>Blood group</small><strong>{selected.blood_group||'Not added'}</strong></span></div>
        </div>

        <div className="child-record-section-grid">
          <article className="panel child-record-section">
            <div className="child-record-section-head"><div><BookOpen size={17}/><span><strong>Education & Enrollment</strong><small>Canonical class placement</small></span></div><button onClick={()=>onNavigate('classes')}>Manage</button></div>
            <dl className="structured-dl">
              <div><dt>Class / Programme</dt><dd>{selected.class_name||'Not enrolled'}</dd></div>
              <div><dt>Section</dt><dd>{selected.class_section||'—'}</dd></div>
              <div><dt>Academic year</dt><dd>{selected.academic_year||'—'}</dd></div>
              <div><dt>Roll / Student No.</dt><dd>{selected.student_identifier||'Not added'}</dd></div>
            </dl>
          </article>

          <article className="panel child-record-section">
            <div className="child-record-section-head"><div><HeartPulse size={17}/><span><strong>Support & Health</strong><small>Core profile visible to authorized users</small></span></div><button onClick={()=>startEdit(selected)}>Edit</button></div>
            <dl className="structured-dl">
              <div><dt>Blood group</dt><dd>{selected.blood_group||'Not added'}</dd></div>
              <div><dt>Date of birth</dt><dd>{dateLabel(selected.date_of_birth)}</dd></div>
            </dl>
            <div className="support-profile-box"><small>Support profile</small><p>{selected.support_profile||'No support profile has been added yet.'}</p></div>
          </article>

          <article className="panel child-record-section">
            <div className="child-record-section-head"><div><Users size={17}/><span><strong>Parent / Family Access</strong><small>Who can see this child in Parent Portal</small></span></div><button onClick={()=>onNavigate('assignments')}>Manage</button></div>
            <div className="structured-people-list">
              {selected.parents.map((person,index)=><div key={person.email||index}><span className="structured-person-icon"><UserRound size={15}/></span><span><strong>{person.name||person.email}</strong><small>{person.relationship||'Parent'} · {person.email}</small>{person.phone&&<em>{person.phone}</em>}</span></div>)}
              {!selected.parents.length&&<p className="helper">No active parent access link.</p>}
            </div>
          </article>

          <article className="panel child-record-section">
            <div className="child-record-section-head"><div><Stethoscope size={17}/><span><strong>Assigned Care Team</strong><small>Teachers, special educators and therapists</small></span></div><button onClick={()=>onNavigate('assignments')}>Manage</button></div>
            <div className="structured-people-list">
              {selected.staff.map((person,index)=><div key={person.email||index}><span className="structured-person-icon"><ShieldCheck size={15}/></span><span><strong>{person.name||person.email}</strong><small>{pretty(person.assignment||person.role)} · {person.email}</small>{person.phone&&<em>{person.phone}</em>}</span></div>)}
              {!selected.staff.length&&<p className="helper">No active staff assignment.</p>}
            </div>
          </article>
        </div>

        <article className="panel child-record-records">
          <div className="child-record-section-head"><div><FolderOpen size={17}/><span><strong>Records & Care Summary</strong><small>Quick status across connected ANTAR modules</small></span></div></div>
          <div className="record-module-grid">
            <button onClick={()=>onNavigate('documents')}><FileText size={18}/><span><strong>{selected.document_count}</strong><small>Documents</small></span></button>
            <button onClick={()=>onNavigate('documents')}><FileHeart size={18}/><span><strong>{selected.medical_document_count}</strong><small>Medical / assessment</small></span></button>
            <button onClick={()=>onNavigate('care')}><CalendarDays size={18}/><span><strong>{selected.appointment_count}</strong><small>Appointments · {selected.upcoming_appointment_count} upcoming</small></span></button>
            <button onClick={()=>onNavigate('care')}><Stethoscope size={18}/><span><strong>{selected.therapy_count}</strong><small>Therapy sessions · {selected.upcoming_therapy_count} upcoming</small></span></button>
          </div>
        </article>
      </div>:<div className="panel child-record-empty-detail"><Baby size={30}/><h2>Select a child record</h2><p>Choose a record from the directory or add a new child.</p></div>}
    </section>
  </div>
}

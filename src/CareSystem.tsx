import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, MapPin, Stethoscope, Trash2, UserRound } from 'lucide-react'
import { supabase } from './supabase'

type ChildOption = {
  child_id: string
  first_name: string
  last_name?: string
  grade_or_program?: string
  section?: string
  can_manage_therapy?: boolean
}

type Appointment = {
  appointment_id: string
  appointment_type: string
  title: string
  description?: string
  starts_at: string
  ends_at: string
  location?: string
  provider_name?: string
  status: string
}

type Therapy = {
  session_id: string
  therapist_id: string
  therapist_name?: string
  therapist_email?: string
  therapy_type: string
  starts_at: string
  ends_at: string
  status: string
  session_summary?: string
  goals_addressed?: string
  home_support_note?: string
}

type Therapist = {
  therapist_id: string
  full_name?: string
  email?: string
}

const appointmentTypes = [
  ['therapy','Therapy'],
  ['medical','Medical'],
  ['school_meeting','School Meeting'],
  ['assessment','Assessment'],
  ['other','Other'],
] as const

const appointmentStatuses = ['requested','scheduled','completed','cancelled','no_show'] as const
const therapyStatuses = ['scheduled','completed','cancelled','no_show'] as const

const pretty = (value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

function toLocalDateTime(value:string){
  const d=new Date(value)
  return d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'})
}

function localIso(date:string,time:string){
  return new Date(`${date}T${time}:00`).toISOString()
}

function CareManager({mode}:{mode:'staff'|'admin'}){
  const [tab,setTab]=useState<'appointments'|'therapy'>('appointments')
  const [children,setChildren]=useState<ChildOption[]>([])
  const [childId,setChildId]=useState('')
  const [appointments,setAppointments]=useState<Appointment[]>([])
  const [therapy,setTherapy]=useState<Therapy[]>([])
  const [therapists,setTherapists]=useState<Therapist[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  const [aType,setAType]=useState('medical')
  const [aTitle,setATitle]=useState('')
  const [aDescription,setADescription]=useState('')
  const [aDate,setADate]=useState(new Date().toISOString().slice(0,10))
  const [aStart,setAStart]=useState('10:00')
  const [aEnd,setAEnd]=useState('11:00')
  const [aProvider,setAProvider]=useState('')
  const [aLocation,setALocation]=useState('')

  const [therapyType,setTherapyType]=useState('')
  const [therapyDate,setTherapyDate]=useState(new Date().toISOString().slice(0,10))
  const [therapyStart,setTherapyStart]=useState('11:00')
  const [therapyEnd,setTherapyEnd]=useState('12:00')
  const [therapyStatus,setTherapyStatus]=useState('scheduled')
  const [therapistId,setTherapistId]=useState('')
  const [summary,setSummary]=useState('')
  const [goals,setGoals]=useState('')
  const [homeNote,setHomeNote]=useState('')

  async function loadChildren(){
    setLoading(true)
    const rpc=mode==='admin'?'admin_document_children':'staff_care_children'
    const {data,error}=await supabase.rpc(rpc)
    if(error){setMessage(error.message);setLoading(false);return}
    const next=((data||[]) as ChildOption[]).map(c=>({...c,can_manage_therapy:mode==='admin'?true:Boolean(c.can_manage_therapy)}))
    setChildren(next)
    setChildId(current=>current&&next.some(c=>c.child_id===current)?current:(next[0]?.child_id||''))
    setLoading(false)
  }

  async function loadCare(target=childId){
    if(!target){setAppointments([]);setTherapy([]);setTherapists([]);return}
    const [a,t,tr]=await Promise.all([
      supabase.rpc('care_appointments',{p_child_id:target}),
      supabase.rpc('care_therapy_sessions',{p_child_id:target}),
      supabase.rpc('care_therapists_for_child',{p_child_id:target}),
    ])
    if(a.error||t.error||tr.error){
      setMessage(a.error?.message||t.error?.message||tr.error?.message||'Unable to load care records.')
      return
    }
    setAppointments((a.data||[]) as Appointment[])
    setTherapy((t.data||[]) as Therapy[])
    const nextTherapists=(tr.data||[]) as Therapist[]
    setTherapists(nextTherapists)
    setTherapistId(current=>current&&nextTherapists.some(x=>x.therapist_id===current)?current:(nextTherapists[0]?.therapist_id||''))
  }

  useEffect(()=>{void loadChildren()},[mode])
  useEffect(()=>{void loadCare()},[childId])

  const selectedChild=children.find(c=>c.child_id===childId)
  const canManageTherapy=mode==='admin'||Boolean(selectedChild?.can_manage_therapy)

  async function addAppointment(){
    if(!childId||!aTitle.trim()) return setMessage('Choose a child and enter an appointment title.')
    if(aEnd<=aStart) return setMessage('End time must be after start time.')
    setBusy(true)
    const {error}=await supabase.rpc('save_child_appointment',{
      p_child_id:childId,
      p_appointment_type:aType,
      p_title:aTitle.trim(),
      p_description:aDescription.trim()||null,
      p_starts_at:localIso(aDate,aStart),
      p_ends_at:localIso(aDate,aEnd),
      p_location:aLocation.trim()||null,
      p_provider_name:aProvider.trim()||null,
      p_status:'scheduled',
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setATitle('');setADescription('');setAProvider('');setALocation('')
    await loadCare(childId)
    setMessage('Appointment saved. The linked parent can see it now.')
    setBusy(false)
  }

  async function setAppointmentStatus(id:string,status:string){
    const {error}=await supabase.rpc('update_child_appointment_status',{p_appointment_id:id,p_status:status})
    if(error){setMessage(error.message);return}
    await loadCare(childId)
    setMessage('Appointment status updated.')
  }

  async function removeAppointment(id:string){
    const {error}=await supabase.rpc('remove_child_appointment',{p_appointment_id:id})
    if(error){setMessage(error.message);return}
    await loadCare(childId)
    setMessage('Appointment removed.')
  }

  async function addTherapy(){
    if(!canManageTherapy) return setMessage('Only the assigned therapist or institute admin can add therapy sessions.')
    if(!therapyType.trim()) return setMessage('Enter the therapy type.')
    if(mode==='admin'&&!therapistId) return setMessage('Choose the assigned therapist.')
    if(therapyEnd<=therapyStart) return setMessage('End time must be after start time.')
    setBusy(true)
    const {error}=await supabase.rpc('save_therapy_session',{
      p_child_id:childId,
      p_therapist_id:therapistId||null,
      p_therapy_type:therapyType.trim(),
      p_starts_at:localIso(therapyDate,therapyStart),
      p_ends_at:localIso(therapyDate,therapyEnd),
      p_status:therapyStatus,
      p_session_summary:summary.trim()||null,
      p_goals_addressed:goals.trim()||null,
      p_home_support_note:homeNote.trim()||null,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setTherapyType('');setSummary('');setGoals('');setHomeNote('')
    await loadCare(childId)
    setMessage('Therapy session saved. The linked parent can see it now.')
    setBusy(false)
  }

  async function setTherapySessionStatus(id:string,status:string){
    const {error}=await supabase.rpc('update_therapy_session_status',{p_session_id:id,p_status:status})
    if(error){setMessage(error.message);return}
    await loadCare(childId)
    setMessage('Therapy session status updated.')
  }

  async function removeTherapy(id:string){
    const {error}=await supabase.rpc('remove_therapy_session',{p_session_id:id})
    if(error){setMessage(error.message);return}
    await loadCare(childId)
    setMessage('Therapy session removed.')
  }

  return <div className="panel care-panel">
    <div className="panel-title"><div>
      <h2>Appointments & Therapy Sessions</h2>
      <p>Manage child-specific appointments and therapy records. Parents see only records for their linked child.</p>
    </div></div>

    {message&&<div className="status-message admin-status">{message}</div>}
    {loading?<p>Loading care workspace…</p>:<>
      <div className="attendance-toolbar">
        <label>Child
          <select value={childId} onChange={e=>setChildId(e.target.value)}>
            {children.map(c=><option key={c.child_id} value={c.child_id}>{c.first_name} {c.last_name}{c.grade_or_program?` — ${c.grade_or_program}`:''}{c.section?` ${c.section}`:''}</option>)}
          </select>
        </label>
      </div>

      <div className="care-tabs">
        <button className={tab==='appointments'?'active':''} onClick={()=>setTab('appointments')}><CalendarDays size={16}/> Appointments</button>
        <button className={tab==='therapy'?'active':''} onClick={()=>setTab('therapy')}><Stethoscope size={16}/> Therapy Sessions</button>
      </div>

      {tab==='appointments'?<>
        <div className="care-form-grid">
          <label>Type<select value={aType} onChange={e=>setAType(e.target.value)}>{appointmentTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Title<input value={aTitle} onChange={e=>setATitle(e.target.value)} placeholder="e.g. Pediatric Review"/></label>
          <label>Date<input type="date" value={aDate} onChange={e=>setADate(e.target.value)}/></label>
          <label>Start<input type="time" value={aStart} onChange={e=>setAStart(e.target.value)}/></label>
          <label>End<input type="time" value={aEnd} onChange={e=>setAEnd(e.target.value)}/></label>
          <label>Provider<input value={aProvider} onChange={e=>setAProvider(e.target.value)} placeholder="Doctor / therapist / staff"/></label>
          <label>Location<input value={aLocation} onChange={e=>setALocation(e.target.value)} placeholder="Clinic / room"/></label>
          <label className="wide">Notes<textarea value={aDescription} onChange={e=>setADescription(e.target.value)} placeholder="Optional appointment details"/></label>
        </div>
        <div className="attendance-save"><button className="primary-button" disabled={busy||!aTitle.trim()} onClick={()=>void addAppointment()}><CheckCircle2 size={16}/> {busy?'Saving…':'Save Appointment'}</button></div>

        <div className="care-list">
          {appointments.map(item=><div className="care-card" key={item.appointment_id}>
            <div>
              <span className="care-kicker">{pretty(item.appointment_type)}</span>
              <strong>{item.title}</strong>
              <small><Clock3 size={13}/> {toLocalDateTime(item.starts_at)} – {new Date(item.ends_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>
              {(item.provider_name||item.location)&&<small><MapPin size={13}/> {[item.provider_name,item.location].filter(Boolean).join(' · ')}</small>}
              {item.description&&<p>{item.description}</p>}
            </div>
            <div className="care-actions">
              <select value={item.status} onChange={e=>void setAppointmentStatus(item.appointment_id,e.target.value)}>
                {appointmentStatuses.map(s=><option key={s} value={s}>{pretty(s)}</option>)}
              </select>
              <button className="mini-button danger" onClick={()=>void removeAppointment(item.appointment_id)}><Trash2 size={14}/> Remove</button>
            </div>
          </div>)}
          {!appointments.length&&<p className="helper">No appointments created yet.</p>}
        </div>
      </>:<>
        {!canManageTherapy&&<div className="status-message">Therapy records are read-only here. Only the assigned therapist or Institute Admin can create or update them.</div>}
        {canManageTherapy&&<>
          <div className="care-form-grid">
            <label>Therapy type<input value={therapyType} onChange={e=>setTherapyType(e.target.value)} placeholder="e.g. Speech Therapy"/></label>
            {mode==='admin'&&<label>Therapist<select value={therapistId} onChange={e=>setTherapistId(e.target.value)}><option value="">Choose assigned therapist…</option>{therapists.map(t=><option key={t.therapist_id} value={t.therapist_id}>{t.full_name||t.email||'Therapist'}</option>)}</select></label>}
            <label>Date<input type="date" value={therapyDate} onChange={e=>setTherapyDate(e.target.value)}/></label>
            <label>Start<input type="time" value={therapyStart} onChange={e=>setTherapyStart(e.target.value)}/></label>
            <label>End<input type="time" value={therapyEnd} onChange={e=>setTherapyEnd(e.target.value)}/></label>
            <label>Status<select value={therapyStatus} onChange={e=>setTherapyStatus(e.target.value)}>{therapyStatuses.map(s=><option key={s} value={s}>{pretty(s)}</option>)}</select></label>
            <label className="wide">Session summary<textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="What happened in the session?"/></label>
            <label className="wide">Goals addressed<textarea value={goals} onChange={e=>setGoals(e.target.value)} placeholder="Goals worked on"/></label>
            <label className="wide">Home support note<textarea value={homeNote} onChange={e=>setHomeNote(e.target.value)} placeholder="Optional note for family"/></label>
          </div>
          <div className="attendance-save"><button className="primary-button" disabled={busy||!therapyType.trim()||(mode==='admin'&&!therapistId)} onClick={()=>void addTherapy()}><CheckCircle2 size={16}/> {busy?'Saving…':'Save Therapy Session'}</button></div>
        </>}

        <div className="care-list">
          {therapy.map(item=><div className="care-card" key={item.session_id}>
            <div>
              <span className="care-kicker">Therapy Session</span>
              <strong>{item.therapy_type}</strong>
              <small><Clock3 size={13}/> {toLocalDateTime(item.starts_at)} – {new Date(item.ends_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>
              <small><UserRound size={13}/> {item.therapist_name||item.therapist_email||'Assigned therapist'}</small>
              {item.session_summary&&<p>{item.session_summary}</p>}
              {item.goals_addressed&&<small>Goals: {item.goals_addressed}</small>}
              {item.home_support_note&&<small>Home support: {item.home_support_note}</small>}
            </div>
            {canManageTherapy&&<div className="care-actions">
              <select value={item.status} onChange={e=>void setTherapySessionStatus(item.session_id,e.target.value)}>
                {therapyStatuses.map(s=><option key={s} value={s}>{pretty(s)}</option>)}
              </select>
              <button className="mini-button danger" onClick={()=>void removeTherapy(item.session_id)}><Trash2 size={14}/> Remove</button>
            </div>}
          </div>)}
          {!therapy.length&&<p className="helper">No therapy sessions recorded yet.</p>}
        </div>
      </>}
    </>}
  </div>
}

export function StaffCare(){
  return <CareManager mode="staff"/>
}

export function AdminCare(){
  return <CareManager mode="admin"/>
}

export function ParentAppointments({childId}:{childId:string}){
  const [rows,setRows]=useState<Appointment[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{void (async()=>{
    setLoading(true)
    const {data,error}=await supabase.rpc('care_appointments',{p_child_id:childId})
    if(error){setError(error.message);setRows([])}else setRows((data||[]) as Appointment[])
    setLoading(false)
  })()},[childId])

  const ordered=useMemo(()=>[...rows].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()),[rows])

  return <>
    <div className="section-head"><h1>Appointments</h1><p>Medical, therapy, assessment and school appointments shared by your child’s authorized team.</p></div>
    <div className="panel care-list">
      {error&&<div className="status-message">{error}</div>}
      {loading?<p>Loading appointments…</p>:ordered.length?ordered.map(item=><div className="care-card parent-care-card" key={item.appointment_id}>
        <div>
          <span className="care-kicker">{pretty(item.appointment_type)}</span>
          <strong>{item.title}</strong>
          <small><Clock3 size={13}/> {toLocalDateTime(item.starts_at)} – {new Date(item.ends_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>
          {(item.provider_name||item.location)&&<small><MapPin size={13}/> {[item.provider_name,item.location].filter(Boolean).join(' · ')}</small>}
          {item.description&&<p>{item.description}</p>}
        </div>
        <span className={`badge ${item.status==='cancelled'?'inactive':'active'}`}>{pretty(item.status)}</span>
      </div>):<p>No appointments scheduled.</p>}
    </div>
  </>
}

export function ParentTherapy({childId}:{childId:string}){
  const [rows,setRows]=useState<Therapy[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{void (async()=>{
    setLoading(true)
    const {data,error}=await supabase.rpc('care_therapy_sessions',{p_child_id:childId})
    if(error){setError(error.message);setRows([])}else setRows((data||[]) as Therapy[])
    setLoading(false)
  })()},[childId])

  return <>
    <div className="section-head"><h1>Therapy Sessions</h1><p>Therapy schedule, session summaries, goals and home-support notes shared for your child.</p></div>
    <div className="panel care-list">
      {error&&<div className="status-message">{error}</div>}
      {loading?<p>Loading therapy sessions…</p>:rows.length?rows.map(item=><div className="care-card parent-care-card" key={item.session_id}>
        <div>
          <span className="care-kicker">Therapy</span>
          <strong>{item.therapy_type}</strong>
          <small><Clock3 size={13}/> {toLocalDateTime(item.starts_at)} – {new Date(item.ends_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>
          <small><UserRound size={13}/> {item.therapist_name||item.therapist_email||'Assigned therapist'}</small>
          {item.session_summary&&<p>{item.session_summary}</p>}
          {item.goals_addressed&&<small>Goals addressed: {item.goals_addressed}</small>}
          {item.home_support_note&&<small>Home support: {item.home_support_note}</small>}
        </div>
        <span className={`badge ${item.status==='cancelled'?'inactive':'active'}`}>{pretty(item.status)}</span>
      </div>):<p>No therapy sessions recorded yet.</p>}
    </div>
  </>
}

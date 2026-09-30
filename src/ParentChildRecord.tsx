import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileHeart,
  FileText,
  HeartPulse,
  MessageCircle,
  Phone,
  School,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react'

type Child={
  id:string
  first_name:string
  last_name?:string
  grade_or_program?:string
  section?:string
  student_identifier?:string
  blood_group?:string
  support_profile?:string
}
type Staff={staff_id:string;assignment_type:string;profiles?:{full_name?:string;phone?:string}|null}
type AnyRow=Record<string,any>
type Destination='reports'|'homework'|'attendance'|'care'|'documents'|'messages'|'appointments'

const pretty=(value?:string)=>value?value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):'—'
const dateLabel=(value?:string)=>{
  if(!value)return '—'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString([],{day:'2-digit',month:'short',year:'numeric'})
}
const dateTimeLabel=(value?:string)=>{
  if(!value)return '—'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?value:d.toLocaleString([],{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
}

export default function ParentChildRecord({
  child,
  staff,
  attendance,
  reports,
  homework,
  appointments,
  therapy,
  documents,
  health,
  onNavigate,
}:{
  child:Child
  staff:Staff[]
  attendance:AnyRow[]
  reports:AnyRow[]
  homework:AnyRow[]
  appointments:AnyRow[]
  therapy:AnyRow[]
  documents:AnyRow[]
  health:AnyRow[]
  onNavigate:(destination:Destination)=>void
}){
  const now=Date.now()
  const upcoming=[
    ...appointments.filter(x=>new Date(x.starts_at).getTime()>=now&&x.status!=='cancelled').map(x=>({
      kind:'Appointment',title:x.title||'Appointment',starts_at:x.starts_at,
    })),
    ...therapy.filter(x=>new Date(x.starts_at).getTime()>=now&&x.status!=='cancelled').map(x=>({
      kind:'Therapy',title:x.therapy_type||'Therapy session',starts_at:x.starts_at,
    })),
  ].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime())

  const attendanceRows=attendance.filter(x=>x.status)
  const attended=attendanceRows.filter(x=>['present','late'].includes(String(x.status))).length
  const attendancePercent=attendanceRows.length?Math.round(attended*100/attendanceRows.length):null
  const medicalDocs=documents.filter(x=>['medical','prescription'].includes(String(x.document_type))||/medical|prescription|assessment/i.test(String(x.title||'')))
  const activeHealth=health.filter(x=>x.is_active!==false)

  return <div className="parent-child-record">
    <section className="panel parent-child-record-hero">
      <div className="parent-child-record-title">
        <span className="child-record-large-avatar">{child.first_name.slice(0,1).toUpperCase()}</span>
        <div>
          <span className="eyebrow">Child Record</span>
          <h1>{child.first_name} {child.last_name||''}</h1>
          <p>{child.student_identifier||'Student number not added'} · {child.grade_or_program||'Class not added'}{child.section?' · Section '+child.section:''}</p>
        </div>
      </div>
      <button className="primary-button" onClick={()=>onNavigate('messages')}><MessageCircle size={16}/> Message Care Team</button>
    </section>

    <section className="child-record-summary-grid">
      <div className="child-record-summary-card"><School size={18}/><span><small>Class</small><strong>{child.grade_or_program||'Not added'}</strong></span></div>
      <div className="child-record-summary-card"><Users size={18}/><span><small>Section</small><strong>{child.section||'Not added'}</strong></span></div>
      <div className="child-record-summary-card"><UserRound size={18}/><span><small>Roll / Student No.</small><strong>{child.student_identifier||'Not added'}</strong></span></div>
      <div className="child-record-summary-card"><HeartPulse size={18}/><span><small>Blood Group</small><strong>{child.blood_group||'Not added'}</strong></span></div>
    </section>

    <section className="child-record-section-grid">
      <article className="panel child-record-section">
        <div className="child-record-section-head"><div><School size={17}/><span><strong>Education & Identity</strong><small>Core institute record</small></span></div></div>
        <dl className="structured-dl">
          <div><dt>Full name</dt><dd>{child.first_name} {child.last_name||''}</dd></div>
          <div><dt>Class / programme</dt><dd>{child.grade_or_program||'Not added'}</dd></div>
          <div><dt>Section</dt><dd>{child.section||'Not added'}</dd></div>
          <div><dt>Roll / Student No.</dt><dd>{child.student_identifier||'Not added'}</dd></div>
        </dl>
      </article>

      <article className="panel child-record-section">
        <div className="child-record-section-head"><div><HeartPulse size={17}/><span><strong>Support & Health</strong><small>Important care information</small></span></div></div>
        <dl className="structured-dl">
          <div><dt>Blood group</dt><dd>{child.blood_group||'Not added'}</dd></div>
          <div><dt>Active health records</dt><dd>{activeHealth.length}</dd></div>
        </dl>
        <div className="support-profile-box"><small>Support profile</small><p>{child.support_profile||'No support profile has been added yet.'}</p></div>
        {activeHealth.slice(0,3).map(row=><div className="structured-record-note" key={row.id}><strong>{row.title||pretty(row.record_type)}</strong><span>{row.details||'No additional details.'}</span></div>)}
      </article>

      <article className="panel child-record-section">
        <div className="child-record-section-head"><div><Users size={17}/><span><strong>Assigned Care Team</strong><small>Teachers, special educators and therapists</small></span></div><button onClick={()=>onNavigate('messages')}>Message</button></div>
        <div className="structured-people-list">
          {staff.map(member=><div key={member.staff_id}><span className="structured-person-icon"><Stethoscope size={15}/></span><span><strong>{member.profiles?.full_name||'Staff member'}</strong><small>{pretty(member.assignment_type)}</small>{member.profiles?.phone&&<em>{member.profiles.phone}</em>}</span>{member.profiles?.phone&&<a href={'tel:'+member.profiles.phone} className="icon-action"><Phone size={14}/></a>}</div>)}
          {!staff.length&&<p className="helper">No care-team member has been assigned yet.</p>}
        </div>
      </article>

      <article className="panel child-record-section">
        <div className="child-record-section-head"><div><FileHeart size={17}/><span><strong>Medical & Secure Records</strong><small>Documents shared by the institution and care team</small></span></div><button onClick={()=>onNavigate('documents')}>Open</button></div>
        <dl className="structured-dl">
          <div><dt>Total documents</dt><dd>{documents.length}</dd></div>
          <div><dt>Medical / prescription</dt><dd>{medicalDocs.length}</dd></div>
          <div><dt>Latest record</dt><dd>{documents[0]?.title||'No records yet'}</dd></div>
        </dl>
      </article>
    </section>

    <article className="panel child-record-records">
      <div className="child-record-section-head"><div><FileText size={17}/><span><strong>Learning & Care Record</strong><small>Quick view across connected ANTAR modules</small></span></div></div>
      <div className="record-module-grid parent-record-modules">
        <button onClick={()=>onNavigate('attendance')}><ClipboardCheck size={18}/><span><strong>{attendancePercent===null?'—':String(attendancePercent)+'%'}</strong><small>Attendance</small></span><ChevronRight size={15}/></button>
        <button onClick={()=>onNavigate('homework')}><BookOpen size={18}/><span><strong>{homework.length}</strong><small>Today’s homework</small></span><ChevronRight size={15}/></button>
        <button onClick={()=>onNavigate('reports')}><FileText size={18}/><span><strong>{reports.length}</strong><small>Daily reports</small></span><ChevronRight size={15}/></button>
        <button onClick={()=>onNavigate('documents')}><FileHeart size={18}/><span><strong>{documents.length}</strong><small>Documents</small></span><ChevronRight size={15}/></button>
        <button onClick={()=>onNavigate('appointments')}><CalendarDays size={18}/><span><strong>{appointments.length}</strong><small>Appointments</small></span><ChevronRight size={15}/></button>
        <button onClick={()=>onNavigate('care')}><Activity size={18}/><span><strong>{therapy.length}</strong><small>Therapy sessions</small></span><ChevronRight size={15}/></button>
      </div>
    </article>

    <section className="parent-child-latest-grid">
      <article className="panel child-record-section">
        <div className="child-record-section-head"><div><ClipboardCheck size={17}/><span><strong>Latest School Update</strong><small>Most recent learning record</small></span></div><button onClick={()=>onNavigate('reports')}>View reports</button></div>
        <dl className="structured-dl">
          <div><dt>Attendance</dt><dd>{attendance[0]?pretty(attendance[0].status)+' · '+dateLabel(attendance[0].attendance_date):'No attendance yet'}</dd></div>
          <div><dt>Latest report</dt><dd>{reports[0]?.summary||'No report yet'}</dd></div>
          <div><dt>Today’s homework</dt><dd>{homework[0]?.title||'No homework posted'}</dd></div>
        </dl>
      </article>

      <article className="panel child-record-section">
        <div className="child-record-section-head"><div><CalendarDays size={17}/><span><strong>Next Care Event</strong><small>Upcoming therapy or appointment</small></span></div><button onClick={()=>onNavigate('appointments')}>View care</button></div>
        {upcoming[0]?<div className="next-care-record"><span>{upcoming[0].kind}</span><strong>{upcoming[0].title}</strong><p>{dateTimeLabel(upcoming[0].starts_at)}</p></div>:<div className="child-record-empty">No upcoming care event is scheduled.</div>}
      </article>
    </section>
  </div>
}

import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileHeart,
  FileText,
  MessageCircle,
  Phone,
  RefreshCw,
  UserRound,
  Users,
} from 'lucide-react'

type Child = {
  id:string
  first_name:string
  last_name?:string
  grade_or_program?:string
  section?:string
  student_identifier?:string
  blood_group?:string
  support_profile?:string
}

type Staff = {
  staff_id:string
  assignment_type:string
  profiles?:{full_name?:string;phone?:string}|null
}

type AnyRow = Record<string,any>

const pretty=(value?:string)=>
  value
    ? value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
    : '—'

const dateLabel=(value?:string)=>{
  if(!value)return '—'
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return value
  return date.toLocaleDateString([],{day:'2-digit',month:'short',year:'numeric'})
}

const dateTimeLabel=(value?:string)=>{
  if(!value)return '—'
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return value
  return date.toLocaleString([],{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
}

export default function ParentDashboard({
  child,
  attendance,
  reports,
  homework,
  appointments,
  therapy,
  documents,
  staff,
  unreadNotifications,
  onNavigate,
  onRefresh,
}:{
  child:Child
  attendance:AnyRow[]
  reports:AnyRow[]
  homework:AnyRow[]
  appointments:AnyRow[]
  therapy:AnyRow[]
  documents:AnyRow[]
  staff:Staff[]
  unreadNotifications:number
  onNavigate:(view:'child'|'reports'|'homework'|'schedule'|'attendance'|'care'|'documents'|'messages'|'notifications'|'appointments'|'medical')=>void
  onRefresh:()=>void
}){
  const attendanceRows=attendance.filter(row=>row.status)
  const attended=attendanceRows.filter(row=>['present','late'].includes(String(row.status))).length
  const attendancePercent=attendanceRows.length
    ? Math.round((attended/attendanceRows.length)*100)
    : null
  const latestAttendance=attendanceRows[0]
  const latestReport=reports[0]
  const now=Date.now()

  const upcoming=[
    ...appointments
      .filter(item=>new Date(item.starts_at).getTime()>=now && item.status!=='cancelled')
      .map(item=>({
        id:item.id||item.appointment_id,
        kind:'Appointment',
        title:item.title||'Appointment',
        starts_at:item.starts_at,
        detail:[item.provider_name,item.location].filter(Boolean).join(' · '),
      })),
    ...therapy
      .filter(item=>new Date(item.starts_at).getTime()>=now && item.status!=='cancelled')
      .map(item=>({
        id:item.id||item.session_id,
        kind:'Therapy',
        title:item.therapy_type||'Therapy session',
        starts_at:item.starts_at,
        detail:item.status?pretty(item.status):'Scheduled',
      })),
  ].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime())

  const medicalDocuments=documents
    .filter(item=>['medical','prescription'].includes(String(item.document_type)) || /medical|prescription|report|assessment/i.test(String(item.title||'')))
    .slice(0,3)

  return <div className="parent-dashboard">
    <section className="parent-dashboard-hero">
      <div className="parent-hero-main">
        <span className="eyebrow">My Child Dashboard</span>
        <h1>{child.first_name} {child.last_name||''}</h1>
        <p>School, therapy, records and care-team updates in one clear place.</p>
        <div className="child-identity-grid">
          <div><small>Class</small><strong>{child.grade_or_program||'Not added'}</strong></div>
          <div><small>Section</small><strong>{child.section||'Not added'}</strong></div>
          <div><small>Roll / Student No.</small><strong>{child.student_identifier||'Not added'}</strong></div>
          <div><small>Blood Group</small><strong>{child.blood_group||'Not added'}</strong></div>
        </div>
      </div>
      <div className="parent-hero-actions">
        <button className="mini-button" onClick={onRefresh}><RefreshCw size={15}/> Refresh</button>
        <button className="primary-button" onClick={()=>onNavigate('messages')}><MessageCircle size={16}/> Message Staff</button>
      </div>
    </section>

    <section className="parent-overview-grid">
      <button className="parent-overview-card" onClick={()=>onNavigate('attendance')}>
        <span className="parent-overview-icon"><ClipboardCheck size={20}/></span>
        <div><small>Attendance</small><strong>{attendancePercent===null?'No records':`${attendancePercent}%`}</strong><p>{latestAttendance?`${pretty(latestAttendance.status)} · ${dateLabel(latestAttendance.attendance_date)}`:'No attendance recorded yet'}</p></div>
        <ChevronRight size={17}/>
      </button>

      <button className="parent-overview-card" onClick={()=>onNavigate('homework')}>
        <span className="parent-overview-icon"><BookOpen size={20}/></span>
        <div><small>Today’s Homework</small><strong>{homework.length?`${homework.length} task${homework.length===1?'':'s'}`:'No homework'}</strong><p>{homework[0]?.title||'Nothing posted for today'}</p></div>
        <ChevronRight size={17}/>
      </button>

      <button className="parent-overview-card" onClick={()=>onNavigate('appointments')}>
        <span className="parent-overview-icon"><CalendarDays size={20}/></span>
        <div><small>Next Care Event</small><strong>{upcoming[0]?.kind||'Nothing scheduled'}</strong><p>{upcoming[0]?`${upcoming[0].title} · ${dateTimeLabel(upcoming[0].starts_at)}`:'No upcoming therapy or appointment'}</p></div>
        <ChevronRight size={17}/>
      </button>

      <button className="parent-overview-card" onClick={()=>onNavigate('notifications')}>
        <span className="parent-overview-icon"><Activity size={20}/></span>
        <div><small>New Updates</small><strong>{unreadNotifications}</strong><p>{unreadNotifications===1?'1 unread ANTAR notification':`${unreadNotifications} unread ANTAR notifications`}</p></div>
        <ChevronRight size={17}/>
      </button>
    </section>

    <section className="parent-dashboard-columns">
      <div className="parent-dashboard-section">
        <div className="parent-section-head">
          <div><BookOpen size={18}/><span><strong>Homework</strong><small>Today</small></span></div>
          <button onClick={()=>onNavigate('homework')}>View all</button>
        </div>
        <div className="parent-compact-list">
          {homework.slice(0,3).map(item=><div className="parent-compact-row" key={item.homework_id||item.id}>
            <div><strong>{item.title}</strong><p>{item.details||'No extra instructions'}</p></div>
            {item.due_at&&<small>Due {dateTimeLabel(item.due_at)}</small>}
          </div>)}
          {!homework.length&&<div className="parent-empty-state"><BookOpen size={22}/><span>No homework has been posted for today.</span></div>}
        </div>
      </div>

      <div className="parent-dashboard-section">
        <div className="parent-section-head">
          <div><CalendarDays size={18}/><span><strong>Upcoming Therapy & Appointments</strong><small>Next scheduled care</small></span></div>
          <button onClick={()=>onNavigate('appointments')}>View all</button>
        </div>
        <div className="parent-compact-list">
          {upcoming.slice(0,3).map(item=><div className="parent-compact-row care" key={`${item.kind}-${item.id}`}>
            <span className="parent-care-type">{item.kind}</span>
            <div><strong>{item.title}</strong><p>{dateTimeLabel(item.starts_at)}{item.detail?` · ${item.detail}`:''}</p></div>
          </div>)}
          {!upcoming.length&&<div className="parent-empty-state"><CalendarDays size={22}/><span>No upcoming therapy sessions or appointments.</span></div>}
        </div>
      </div>

      <div className="parent-dashboard-section">
        <div className="parent-section-head">
          <div><FileHeart size={18}/><span><strong>Medical Records</strong><small>Important records in one place</small></span></div>
          <button onClick={()=>onNavigate('documents')}>Open records</button>
        </div>
        <div className="parent-compact-list">
          {medicalDocuments.map(item=><div className="parent-compact-row" key={item.id}>
            <span className="parent-record-icon"><FileText size={17}/></span>
            <div><strong>{item.title||'Medical record'}</strong><p>{pretty(item.document_type)} · {dateLabel(item.record_date||item.created_at)}</p></div>
          </div>)}
          {!medicalDocuments.length&&<div className="parent-empty-state"><FileHeart size={22}/><span>No medical or prescription records have been added yet.</span></div>}
        </div>
      </div>

      <div className="parent-dashboard-section">
        <div className="parent-section-head">
          <div><Users size={18}/><span><strong>Assigned Staff</strong><small>Your child’s care team</small></span></div>
          <button onClick={()=>onNavigate('messages')}>Messages</button>
        </div>
        <div className="parent-staff-list">
          {staff.slice(0,5).map(member=><div className="parent-staff-row" key={member.staff_id}>
            <span className="parent-staff-avatar"><UserRound size={17}/></span>
            <div><strong>{member.profiles?.full_name||'Staff member'}</strong><small>{pretty(member.assignment_type)}</small></div>
            <div className="parent-staff-actions">
              {member.profiles?.phone&&<a href={`tel:${member.profiles.phone}`} className="icon-action" aria-label="Call staff"><Phone size={15}/></a>}
              <button className="icon-action" onClick={()=>onNavigate('messages')} aria-label="Send message"><MessageCircle size={15}/></button>
            </div>
          </div>)}
          {!staff.length&&<div className="parent-empty-state"><Users size={22}/><span>No staff assignments have been added yet.</span></div>}
        </div>
      </div>
    </section>

    <section className="parent-dashboard-bottom">
      <button className="parent-latest-report" onClick={()=>onNavigate('reports')}>
        <span className="parent-overview-icon"><FileText size={20}/></span>
        <div>
          <small>Latest Daily Report</small>
          <strong>{latestReport?.summary||'No daily report yet'}</strong>
          <p>{latestReport?.report_date?dateLabel(latestReport.report_date):'Your child’s latest school update will appear here.'}</p>
        </div>
        <ChevronRight size={18}/>
      </button>
      <button className="parent-profile-shortcut" onClick={()=>onNavigate('child')}>
        <UserRound size={19}/>
        <span><strong>Support Profile</strong><small>View child details and support information</small></span>
        <ChevronRight size={18}/>
      </button>
    </section>
  </div>
}

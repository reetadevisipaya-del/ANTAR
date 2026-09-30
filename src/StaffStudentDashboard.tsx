import { useEffect, useMemo, useState } from 'react'
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
  RefreshCw,
  UserRound,
  Users,
} from 'lucide-react'
import { supabase } from './supabase'

type Action='attendance'|'report'|'homework'|'documents'|'care'|'messages'

type DashboardData={
  child?:{
    id:string
    first_name:string
    last_name?:string
    grade_or_program?:string
    section?:string
    student_identifier?:string
    blood_group?:string
    support_profile?:string
    class_id?:string
    class_name?:string
    class_section?:string
  }
  attendance?:{
    total_records:number
    attended_records:number
    percentage:number|null
    latest?:{
      attendance_date:string
      status:string
      note?:string|null
    }|null
  }
  homework?:Array<Record<string,any>>
  appointments?:Array<Record<string,any>>
  therapy?:Array<Record<string,any>>
  medical_documents?:Array<Record<string,any>>
  assigned_staff?:Array<{
    staff_id:string
    staff_name:string
    phone?:string|null
    staff_role:string
    assignment_label:string
  }>
  latest_report?:Record<string,any>|null
  unread_count?:number
}

const pretty=(value?:string|null)=>
  value?value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):'—'

const dateLabel=(value?:string|null)=>{
  if(!value)return '—'
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return value
  return date.toLocaleDateString([],{day:'2-digit',month:'short',year:'numeric'})
}

const dateTimeLabel=(value?:string|null)=>{
  if(!value)return '—'
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return value
  return date.toLocaleString([],{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
}

export default function StaffStudentDashboard({
  childId,
  onAction,
}:{
  childId:string
  onAction:(action:Action)=>void
}){
  const [data,setData]=useState<DashboardData|null>(null)
  const [loading,setLoading]=useState(true)
  const [status,setStatus]=useState('')

  async function load(){
    if(!childId){setData(null);setLoading(false);return}
    setLoading(true)
    setStatus('')
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})
    const {data,error}=await supabase.rpc('staff_student_dashboard',{
      p_child_id:childId,
      p_date:today,
    })
    if(error){
      setStatus(error.message)
      setData(null)
    }else{
      setData((data||{}) as DashboardData)
    }
    setLoading(false)
  }

  useEffect(()=>{void load()},[childId])

  const upcoming=useMemo(()=>{
    if(!data)return []
    return [
      ...(data.appointments||[]).map(item=>({
        id:item.appointment_id,
        kind:'Appointment',
        title:item.title||'Appointment',
        starts_at:item.starts_at,
        detail:[item.provider_name,item.location].filter(Boolean).join(' · '),
      })),
      ...(data.therapy||[]).map(item=>({
        id:item.session_id,
        kind:'Therapy',
        title:item.therapy_type||'Therapy session',
        starts_at:item.starts_at,
        detail:[item.therapist_name,pretty(item.status)].filter(Boolean).join(' · '),
      })),
    ].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime())
  },[data])

  if(loading)return <div className="panel">Loading student overview…</div>
  if(status)return <div className="status-message">{status}</div>
  if(!data?.child)return <div className="panel">Choose a student to open their dashboard.</div>

  const child=data.child
  const attendance=data.attendance
  const homework=data.homework||[]
  const records=data.medical_documents||[]
  const staff=data.assigned_staff||[]
  const report=data.latest_report

  return <div className="staff-student-dashboard">
    <section className="staff-student-hero">
      <div>
        <span className="eyebrow">Student Overview</span>
        <h1>{child.first_name} {child.last_name||''}</h1>
        <p>Learning, attendance, care, records and parent communication for this student.</p>
        <div className="staff-student-identity">
          <div><small>Class</small><strong>{child.class_name||child.grade_or_program||'Not added'}</strong></div>
          <div><small>Section</small><strong>{child.class_section||child.section||'Not added'}</strong></div>
          <div><small>Roll / Student No.</small><strong>{child.student_identifier||'Not added'}</strong></div>
          <div><small>Blood Group</small><strong>{child.blood_group||'Not added'}</strong></div>
        </div>
      </div>
      <button className="mini-button" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button>
    </section>

    <section className="staff-student-quick-actions">
      <button onClick={()=>onAction('attendance')}><ClipboardCheck size={17}/><span><strong>Attendance</strong><small>View / mark</small></span></button>
      <button onClick={()=>onAction('report')}><FileText size={17}/><span><strong>Daily Report</strong><small>View / add</small></span></button>
      <button onClick={()=>onAction('homework')}><BookOpen size={17}/><span><strong>Homework</strong><small>View / add</small></span></button>
      <button onClick={()=>onAction('documents')}><FileHeart size={17}/><span><strong>Records</strong><small>View / upload</small></span></button>
      <button onClick={()=>onAction('care')}><CalendarDays size={17}/><span><strong>Care</strong><small>View / schedule</small></span></button>
      <button onClick={()=>onAction('messages')}><MessageCircle size={17}/><span><strong>Parent Message</strong><small>Open chat</small></span></button>
    </section>

    <section className="staff-student-overview-grid">
      <button onClick={()=>onAction('attendance')} className="staff-overview-card">
        <span className="staff-overview-icon"><ClipboardCheck size={19}/></span>
        <div>
          <small>Attendance · last 30 records</small>
          <strong>{attendance?.percentage===null||attendance?.percentage===undefined?'No records':`${attendance.percentage}%`}</strong>
          <p>{attendance?.latest?`${pretty(attendance.latest.status)} · ${dateLabel(attendance.latest.attendance_date)}`:'No attendance yet'}</p>
        </div>
        <ChevronRight size={17}/>
      </button>

      <button onClick={()=>onAction('homework')} className="staff-overview-card">
        <span className="staff-overview-icon"><BookOpen size={19}/></span>
        <div>
          <small>Today’s Homework</small>
          <strong>{homework.length?`${homework.length} task${homework.length===1?'':'s'}`:'No homework'}</strong>
          <p>{homework[0]?.title||'Nothing posted for today'}</p>
        </div>
        <ChevronRight size={17}/>
      </button>

      <button onClick={()=>onAction('care')} className="staff-overview-card">
        <span className="staff-overview-icon"><CalendarDays size={19}/></span>
        <div>
          <small>Next Care Event</small>
          <strong>{upcoming[0]?.kind||'Nothing scheduled'}</strong>
          <p>{upcoming[0]?`${upcoming[0].title} · ${dateTimeLabel(upcoming[0].starts_at)}`:'No upcoming therapy or appointment'}</p>
        </div>
        <ChevronRight size={17}/>
      </button>

      <button onClick={()=>onAction('messages')} className="staff-overview-card">
        <span className="staff-overview-icon"><Activity size={19}/></span>
        <div>
          <small>Unread Child Updates</small>
          <strong>{Number(data.unread_count||0)}</strong>
          <p>Messages and child-specific ANTAR alerts</p>
        </div>
        <ChevronRight size={17}/>
      </button>
    </section>

    <section className="staff-student-columns">
      <div className="staff-student-section">
        <div className="staff-student-section-head">
          <div><BookOpen size={17}/><span><strong>Homework</strong><small>Today</small></span></div>
          <button onClick={()=>onAction('homework')}>Add / manage</button>
        </div>
        <div className="staff-student-list">
          {homework.slice(0,3).map(item=><div className="staff-student-row" key={item.homework_id}>
            <div><strong>{item.title}</strong><p>{item.details||'No extra instructions'}</p></div>
            {item.due_at&&<small>Due {dateTimeLabel(item.due_at)}</small>}
          </div>)}
          {!homework.length&&<div className="staff-student-empty">No homework posted today.</div>}
        </div>
      </div>

      <div className="staff-student-section">
        <div className="staff-student-section-head">
          <div><CalendarDays size={17}/><span><strong>Upcoming Therapy & Appointments</strong><small>Next care items</small></span></div>
          <button onClick={()=>onAction('care')}>Add / manage</button>
        </div>
        <div className="staff-student-list">
          {upcoming.slice(0,3).map(item=><div className="staff-student-row care" key={`${item.kind}-${item.id}`}>
            <span className="staff-care-badge">{item.kind}</span>
            <div><strong>{item.title}</strong><p>{dateTimeLabel(item.starts_at)}{item.detail?` · ${item.detail}`:''}</p></div>
          </div>)}
          {!upcoming.length&&<div className="staff-student-empty">No upcoming therapy or appointments.</div>}
        </div>
      </div>

      <div className="staff-student-section">
        <div className="staff-student-section-head">
          <div><FileHeart size={17}/><span><strong>Medical & Prescription Records</strong><small>Secure child documents</small></span></div>
          <button onClick={()=>onAction('documents')}>Upload / manage</button>
        </div>
        <div className="staff-student-list">
          {records.slice(0,3).map(item=><div className="staff-student-row" key={item.id}>
            <span className="staff-row-icon"><FileText size={16}/></span>
            <div><strong>{item.title}</strong><p>{pretty(item.document_type)} · {dateLabel(item.record_date||item.created_at)}</p></div>
          </div>)}
          {!records.length&&<div className="staff-student-empty">No medical or prescription records uploaded yet.</div>}
        </div>
      </div>

      <div className="staff-student-section">
        <div className="staff-student-section-head">
          <div><Users size={17}/><span><strong>Assigned Staff</strong><small>Current care team</small></span></div>
          <button onClick={()=>onAction('messages')}>Message parent</button>
        </div>
        <div className="staff-student-list">
          {staff.map(member=><div className="staff-member-row" key={member.staff_id}>
            <span className="staff-row-icon"><UserRound size={16}/></span>
            <div><strong>{member.staff_name}</strong><p>{pretty(member.assignment_label||member.staff_role)}</p></div>
            {member.phone&&<a className="icon-action" href={`tel:${member.phone}`} aria-label="Call staff"><Phone size={14}/></a>}
          </div>)}
          {!staff.length&&<div className="staff-student-empty">No care-team assignment found.</div>}
        </div>
      </div>
    </section>

    <section className="staff-student-bottom">
      <button className="staff-latest-report" onClick={()=>onAction('report')}>
        <span className="staff-overview-icon"><FileText size={19}/></span>
        <div>
          <small>Latest Daily Report</small>
          <strong>{report?.summary||'No daily report yet'}</strong>
          <p>{report?.report_date?dateLabel(report.report_date):'Add today’s learning and wellbeing update.'}</p>
        </div>
        <span className="staff-action-label">{report?'Update':'Add report'}</span>
      </button>

      <div className="staff-support-profile">
        <div className="staff-support-profile-head"><HeartPulse size={18}/><strong>Support Profile</strong></div>
        <p>{child.support_profile||'No support profile has been added yet.'}</p>
        <small>Student identity and core profile fields are institute-managed; teaching and care updates can be added through the actions above.</small>
      </div>
    </section>
  </div>
}

import { useEffect, useMemo, useState } from 'react'
import { Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileText, MessageCircle, Plus, School, Trash2, Users } from 'lucide-react'
import { supabase } from './supabase'
import { AdminSchedule, StaffSchedule } from './ScheduleSystem'
import { StaffDocuments } from './DocumentSystem'
import { StaffCare, TherapistStudents } from './CareSystem'
import Messaging from './Messaging'
import Notifications, { type NotificationDestination } from './Notifications'

type StaffClass = {
  class_id: string
  name: string
  section?: string
  academic_year?: string
  student_count: number
}

type Student = {
  child_id: string
  first_name: string
  last_name?: string
  grade_or_program?: string
  section?: string
  student_identifier?: string
}

type StaffDirectoryRow = {
  user_id: string
  email: string
  role: string
}

type AdminClassRow = {
  class_id: string
  class_name: string
  section?: string
  academic_year?: string
  staff_id?: string | null
  staff_email?: string | null
  staff_role?: string | null
  active?: boolean | null
}

type AdminClassOverview = {
  class_id: string
  class_name: string
  section?: string
  academic_year?: string
  student_count: number
}

type AdminChildClassRow = {
  child_id: string
  first_name: string
  last_name?: string
  student_identifier?: string
  current_class_id?: string | null
  current_class_name?: string | null
  current_section?: string | null
}

type AdminRosterRow = {
  enrollment_id: string
  child_id: string
  first_name: string
  last_name?: string
  student_identifier?: string
}

const label = (value?: string) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''

export function StaffAttendancePortal({ userId, role }: { userId: string; role?: string }) {
  const isTherapist=role==='therapist'
  const [tab, setTab] = useState<'home' | 'classes' | 'students' | 'report' | 'homework' | 'messages' | 'notifications' | 'documents' | 'care' | 'schedule' | 'attendance'>('home')
  const [classes, setClasses] = useState<StaffClass[]>([])
  const [rosters, setRosters] = useState<Record<string, Student[]>>({})
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({})
  const [homework, setHomework] = useState<Array<{homework_id:string;title:string;details?:string;homework_date:string;due_at?:string}>>([])
  const [homeworkTitle, setHomeworkTitle] = useState('')
  const [homeworkDetails, setHomeworkDetails] = useState('')
  const [reportSummary, setReportSummary] = useState('')
  const [reportLearning, setReportLearning] = useState('')
  const [reportActivity, setReportActivity] = useState('')
  const [reportWellbeing, setReportWellbeing] = useState('')
  const [reportParentNote, setReportParentNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [notificationUnread,setNotificationUnread]=useState(0)

  async function loadClasses() {
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.rpc('staff_my_classes')
    if (error) {
      setMessage(error.message)
      setClasses([])
      setLoading(false)
      return
    }
    const next = ((data || []) as StaffClass[]).map(row => ({...row, student_count:Number(row.student_count || 0)}))
    setClasses(next)
    setSelectedClass(current => current && next.some(c => c.class_id === current) ? current : (next[0]?.class_id || ''))
    setLoading(false)
  }

  async function loadRoster(classId:string) {
    if(!classId) return
    const {data,error}=await supabase.rpc('staff_class_roster',{p_class_id:classId})
    if(error){setMessage(error.message);return}
    const next=(data||[]) as Student[]
    setRosters(prev=>({...prev,[classId]:next}))
    if(classId===selectedClass){
      setSelectedStudent(current=>current&&next.some(s=>s.child_id===current)?current:(next[0]?.child_id||''))
    }
  }

  async function loadAttendance(classId:string, attendanceDate:string) {
    if(!classId) return
    const roster=rosters[classId]||[]
    if(!roster.length){setAttendance({});return}
    const {data,error}=await supabase.rpc('staff_class_attendance',{p_class_id:classId,p_date:attendanceDate})
    if(error){setMessage(error.message);return}
    const next:Record<string,'present'|'absent'>={}
    roster.forEach(student=>{next[student.child_id]='present'})
    ;(data||[]).forEach((row:{child_id:string;status:string|null})=>{
      if(row.status==='present'||row.status==='absent') next[row.child_id]=row.status
    })
    setAttendance(next)
  }

  async function loadHomework(classId:string, homeworkDate:string) {
    if(!classId){setHomework([]);return}
    const {data,error}=await supabase.rpc('staff_class_homework',{p_class_id:classId,p_date:homeworkDate})
    if(error){setMessage(error.message);return}
    setHomework((data||[]) as typeof homework)
  }

  function clearReport(){
    setReportSummary('')
    setReportLearning('')
    setReportActivity('')
    setReportWellbeing('')
    setReportParentNote('')
  }

  async function loadReport(classId:string, childId:string, reportDate:string){
    if(!classId||!childId){clearReport();return}
    const {data,error}=await supabase.rpc('staff_child_daily_report',{
      p_class_id:classId,
      p_child_id:childId,
      p_date:reportDate,
    })
    if(error){setMessage(error.message);return}
    const row=(data||[])[0] as any
    if(!row){clearReport();return}
    setReportSummary(row.summary||'')
    setReportLearning(row.learning_notes||'')
    setReportActivity(row.activity_notes||'')
    setReportWellbeing(row.wellbeing_notes||'')
    setReportParentNote(row.parent_note||'')
  }

  useEffect(()=>{void loadClasses()},[userId])

  useEffect(()=>{
    let mounted=true
    async function loadNotificationCount(){
      const {data,error}=await supabase.rpc('notifications_unread_count')
      if(mounted&&!error) setNotificationUnread(Number(data||0))
    }
    void loadNotificationCount()
    const timer=window.setInterval(()=>void loadNotificationCount(),10000)
    return ()=>{mounted=false;window.clearInterval(timer)}
  },[userId])

  useEffect(()=>{
    if(!selectedClass) return
    if(!rosters[selectedClass]){void loadRoster(selectedClass);return}
    const roster=rosters[selectedClass]||[]
    setSelectedStudent(current=>current&&roster.some(s=>s.child_id===current)?current:(roster[0]?.child_id||''))
    void loadAttendance(selectedClass,date)
  },[selectedClass,date,rosters])

  useEffect(()=>{
    if(selectedClass && tab==='homework') void loadHomework(selectedClass,date)
  },[selectedClass,date,tab])

  useEffect(()=>{
    if(tab==='report' && selectedClass && selectedStudent) void loadReport(selectedClass,selectedStudent,date)
  },[tab,selectedClass,selectedStudent,date])

  async function openClass(classId:string){
    setSelectedClass(classId)
    if(!rosters[classId]) await loadRoster(classId)
    setTab('attendance')
  }

  async function saveAttendance(){
    const roster=rosters[selectedClass]||[]
    if(!selectedClass||!roster.length){setMessage('No students are enrolled in this class.');return}
    setSaving(true)
    setMessage('Saving attendance…')
    const records=roster.map(student=>({child_id:student.child_id,status:attendance[student.child_id]||'present'}))
    const {error}=await supabase.rpc('staff_save_class_attendance',{p_class_id:selectedClass,p_date:date,p_records:records})
    if(error){setMessage(error.message);setSaving(false);return}
    await loadAttendance(selectedClass,date)
    setMessage('Attendance saved. Parent Portal will show the same record.')
    setSaving(false)
  }

  async function saveReport(){
    if(!selectedClass||!selectedStudent){setMessage('Choose a class and student first.');return}
    setSaving(true)
    setMessage('Saving daily report…')
    const {error}=await supabase.rpc('staff_save_child_daily_report',{
      p_class_id:selectedClass,
      p_child_id:selectedStudent,
      p_date:date,
      p_summary:reportSummary.trim()||'Daily update',
      p_learning_notes:reportLearning.trim()||null,
      p_activity_notes:reportActivity.trim()||null,
      p_wellbeing_notes:reportWellbeing.trim()||null,
      p_parent_note:reportParentNote.trim()||null,
    })
    if(error){setMessage(error.message);setSaving(false);return}
    await loadReport(selectedClass,selectedStudent,date)
    setMessage('Daily report saved. The linked parent can see it now.')
    setSaving(false)
  }

  async function addHomework(){
    if(!selectedClass){setMessage('Choose a class first.');return}
    if(!homeworkTitle.trim()){setMessage('Enter the homework title.');return}
    setSaving(true)
    setMessage('Adding homework…')
    const {error}=await supabase.rpc('staff_add_class_homework',{
      p_class_id:selectedClass,
      p_date:date,
      p_title:homeworkTitle.trim(),
      p_details:homeworkDetails.trim()||null,
      p_due_at:null,
    })
    if(error){setMessage(error.message);setSaving(false);return}
    setHomeworkTitle('')
    setHomeworkDetails('')
    await loadHomework(selectedClass,date)
    setMessage('Homework added for the whole class. Linked parents can see it now.')
    setSaving(false)
  }

  async function removeHomework(homeworkId:string){
    const {error}=await supabase.rpc('staff_remove_class_homework',{p_homework_id:homeworkId})
    if(error){setMessage(error.message);return}
    await loadHomework(selectedClass,date)
    setMessage('Homework removed from the daily board.')
  }

  function markAllPresent(){
    const next:Record<string,'present'|'absent'>={}
    ;(rosters[selectedClass]||[]).forEach(student=>{next[student.child_id]='present'})
    setAttendance(next)
  }

  const allStudents=useMemo(()=>{
    const unique=new Map<string,Student>()
    Object.values(rosters).flat().forEach(student=>unique.set(student.child_id,student))
    return [...unique.values()]
  },[rosters])

  useEffect(()=>{
    if(tab==='students') void Promise.all(classes.map(c=>loadRoster(c.class_id)))
  },[tab,classes.length])

  const currentClass=classes.find(c=>c.class_id===selectedClass)
  const roster=rosters[selectedClass]||[]
  const currentStudent=roster.find(s=>s.child_id===selectedStudent)

  return <div className="staff-portal">
    <div className="staff-nav">
      <button className={tab==='home'?'active':''} onClick={()=>setTab('home')}><School size={17}/>Home</button>
      {!isTherapist&&<button className={tab==='classes'?'active':''} onClick={()=>setTab('classes')}><BookOpen size={17}/>My Classes</button>}
      <button className={tab==='students'?'active':''} onClick={()=>setTab('students')}><Users size={17}/>{isTherapist?'My Students':'Students'}</button>
      {!isTherapist&&<button className={tab==='report'?'active':''} onClick={()=>setTab('report')}><FileText size={17}/>Daily Report</button>}
      {!isTherapist&&<button className={tab==='homework'?'active':''} onClick={()=>setTab('homework')}><BookOpen size={17}/>Homework</button>}
      <button className={tab==='messages'?'active':''} onClick={()=>setTab('messages')}><MessageCircle size={17}/>Messages</button>
      <button className={tab==='notifications'?'active':''} onClick={()=>setTab('notifications')}><Bell size={17}/>Notifications{notificationUnread>0&&<b className="nav-unread-badge">{notificationUnread>99?'99+':notificationUnread}</b>}</button>
      <button className={tab==='documents'?'active':''} onClick={()=>setTab('documents')}><FileText size={17}/>Documents</button>
      <button className={tab==='care'?'active':''} onClick={()=>setTab('care')}><CalendarDays size={17}/>Appointments & Therapy</button>
      {!isTherapist&&<button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}><CalendarDays size={17}/>Schedule</button>}
      {!isTherapist&&<button className={tab==='attendance'?'active':''} onClick={()=>setTab('attendance')}><ClipboardCheck size={17}/>Attendance</button>}
    </div>

    {message&&<div className="status-message admin-status">{message}</div>}

    {loading?<div className="panel">Loading assigned classes…</div>:
    tab==='home'?<>
      <div className="dashboard-hero">
        <span className="eyebrow">{isTherapist?'Therapist Portal':'Teacher Portal'}</span>
        <h1>{isTherapist?'Your therapy caseload and care schedule.':'Daily school updates in one place.'}</h1>
        <p>{isTherapist?'View your assigned students by class, schedule appointments, record therapy sessions and share parent-facing updates.':'Manage attendance, individual daily reports, and a class-wide homework board.'}</p>
      </div>
      <div className="feature-grid">
        {isTherapist?<button className="feature-card" onClick={()=>setTab('students')}><span className="feature-icon"><Users size={21}/></span><span><strong>My Students</strong><small>Assigned therapy students with class details</small></span><span className="arrow">→</span></button>:<button className="feature-card" onClick={()=>setTab('classes')}><span className="feature-icon"><School size={21}/></span><span><strong>{classes.length} assigned classes</strong><small>Classes assigned by the institute</small></span><span className="arrow">→</span></button>}
        {!isTherapist&&<button className="feature-card" onClick={()=>setTab('report')}><span className="feature-icon"><FileText size={21}/></span><span><strong>Daily Report</strong><small>Write a daily update for one student</small></span><span className="arrow">→</span></button>}
        {!isTherapist&&<button className="feature-card" onClick={()=>setTab('homework')}><span className="feature-icon"><BookOpen size={21}/></span><span><strong>Daily Homework</strong><small>Add homework for the whole class</small></span><span className="arrow">→</span></button>}
        <button className="feature-card" onClick={()=>setTab('messages')}><span className="feature-icon"><MessageCircle size={21}/></span><span><strong>Parent Messages</strong><small>Private child-specific conversations with linked parents</small></span><span className="arrow">→</span></button>
        <button className="feature-card" onClick={()=>setTab('notifications')}><span className="feature-icon"><Bell size={21}/></span><span><strong>{notificationUnread} unread alert{notificationUnread===1?'':'s'}</strong><small>Messages and important ANTAR updates</small></span><span className="arrow">→</span></button>
        <button className="feature-card" onClick={()=>setTab('documents')}><span className="feature-icon"><FileText size={21}/></span><span><strong>Documents</strong><small>Upload secure student records</small></span><span className="arrow">→</span></button>
        <button className="feature-card" onClick={()=>setTab('care')}><span className="feature-icon"><CalendarDays size={21}/></span><span><strong>Appointments & Therapy</strong><small>Manage child care schedules and sessions</small></span><span className="arrow">→</span></button>
        {!isTherapist&&<button className="feature-card" onClick={()=>setTab('schedule')}><span className="feature-icon"><CalendarDays size={21}/></span><span><strong>Schedule</strong><small>Add class timetable and events</small></span><span className="arrow">→</span></button>}
        {!isTherapist&&<button className="feature-card" onClick={()=>setTab('attendance')}><span className="feature-icon"><ClipboardCheck size={21}/></span><span><strong>Attendance</strong><small>Present or Absent, then save</small></span><span className="arrow">→</span></button>}
      </div>
    </>:
    tab==='classes'?<div className="panel">
      <div className="panel-title"><div><h2>My Classes</h2><p>Only classes assigned to your logged-in Teacher account appear here.</p></div></div>
      <div className="feature-grid">
        {classes.map(c=><button key={c.class_id} className="feature-card" onClick={()=>void openClass(c.class_id)}>
          <span className="feature-icon"><School size={21}/></span>
          <span><strong>{c.name}{c.section?` — Section ${c.section}`:''}</strong><small>{c.student_count} student{c.student_count===1?'':'s'} · {c.academic_year||'Academic year'}</small></span>
          <span className="arrow">→</span>
        </button>)}
      </div>
    </div>:
    tab==='students'?(isTherapist?<TherapistStudents/>:<div className="panel">
      <div className="panel-title"><div><h2>Students</h2><p>Students enrolled in the classes assigned to you.</p></div></div>
      <div className="cards-list">
        {allStudents.map(student=><div className="person-row" key={student.child_id}><div><strong>{student.first_name} {student.last_name}</strong><small>{student.grade_or_program||'Class not set'}{student.section?` · Section ${student.section}`:''}</small></div><span className="badge active">Student</span></div>)}
        {!allStudents.length&&<p>Open My Classes first to load class rosters.</p>}
      </div>
    </div>):
    tab==='report'?<div className="panel">
      <div className="panel-title"><div><h2>Daily School Report</h2><p>Select a class and student. One report is saved per student per day and can be updated during the day.</p></div></div>
      <div className="attendance-toolbar">
        <label>Class<select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>{classes.map(c=><option key={c.class_id} value={c.class_id}>{c.name}{c.section?` — ${c.section}`:''}</option>)}</select></label>
        <label>Student<select value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}>{roster.map(s=><option key={s.child_id} value={s.child_id}>{s.first_name} {s.last_name}</option>)}</select></label>
        <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      </div>
      {currentStudent&&<p className="helper"><strong>{currentStudent.first_name} {currentStudent.last_name}</strong> · {currentStudent.grade_or_program}{currentStudent.section?` · Section ${currentStudent.section}`:''}</p>}
      <div className="report-form">
        <label>Daily summary<textarea placeholder="Short overall update for the day" value={reportSummary} onChange={e=>setReportSummary(e.target.value)}/></label>
        <label>Learning update<textarea placeholder="What was learned or worked on today?" value={reportLearning} onChange={e=>setReportLearning(e.target.value)}/></label>
        <label>Activities<textarea placeholder="Activities, participation or classroom work" value={reportActivity} onChange={e=>setReportActivity(e.target.value)}/></label>
        <label>Wellbeing<textarea placeholder="Optional wellbeing / mood note" value={reportWellbeing} onChange={e=>setReportWellbeing(e.target.value)}/></label>
        <label>Note for parent<textarea placeholder="Optional note for home" value={reportParentNote} onChange={e=>setReportParentNote(e.target.value)}/></label>
      </div>
      <div className="attendance-save"><button className="primary-button" disabled={!selectedStudent||saving} onClick={()=>void saveReport()}><CheckCircle2 size={17}/> {saving?'Saving…':'Save Daily Report'}</button></div>
    </div>:
    tab==='homework'?<div className="panel">
      <div className="panel-title"><div><h2>Daily Homework</h2><p>Homework is posted once for the selected class and is visible to every linked parent whose child is enrolled in that class.</p></div></div>
      <div className="attendance-toolbar">
        <label>Class<select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>{classes.map(c=><option key={c.class_id} value={c.class_id}>{c.name}{c.section?` — ${c.section}`:''}</option>)}</select></label>
        <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      </div>
      <div className="panel homework-compose">
        <h3>Add homework for {currentClass?currentClass.name:'class'}</h3>
        <div className="inline-form">
          <input placeholder="Homework title e.g. Maths — Exercise 5" value={homeworkTitle} onChange={e=>setHomeworkTitle(e.target.value)}/>
          <input placeholder="Instructions / pages / notes (optional)" value={homeworkDetails} onChange={e=>setHomeworkDetails(e.target.value)}/>
          <button className="primary-button" disabled={saving||!homeworkTitle.trim()} onClick={()=>void addHomework()}><Plus size={16}/> Add Homework</button>
        </div>
      </div>
      <div className="cards-list">
        {homework.map(item=><div className="person-row" key={item.homework_id}>
          <div><strong>{item.title}</strong><small>{item.details||'No extra instructions'} · {item.homework_date}</small></div>
          <button className="mini-button danger" onClick={()=>void removeHomework(item.homework_id)}><Trash2 size={14}/> Remove</button>
        </div>)}
        {!homework.length&&<p className="helper">No homework posted for this class on this date.</p>}
      </div>
    </div>:
    tab==='messages'?<Messaging userId={userId} mode="staff"/>:
    tab==='notifications'?<Notifications userId={userId} onUnreadChange={setNotificationUnread} onNavigate={(destination:NotificationDestination)=>{
      const target=destination==='appointments'?'care':destination==='reports'?'report':destination
      if(isTherapist&&['attendance','homework','report','schedule'].includes(target)) setTab('home')
      else setTab(target as typeof tab)
    }}/>:
    tab==='documents'?<StaffDocuments/>:
    tab==='care'?<StaffCare/>:
    tab==='schedule'?<StaffSchedule classes={classes}/>:
    <div className="panel">
      <div className="panel-title"><div><h2>Attendance</h2><p>Choose a class and date, mark Present or Absent, then save.</p></div></div>
      <div className="attendance-toolbar">
        <label>Class<select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>{classes.map(c=><option key={c.class_id} value={c.class_id}>{c.name}{c.section?` — ${c.section}`:''}</option>)}</select></label>
        <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <button className="mini-button" onClick={markAllPresent}>Mark all present</button>
      </div>
      {currentClass&&<p className="helper"><strong>{currentClass.name}{currentClass.section?` — Section ${currentClass.section}`:''}</strong></p>}
      <div className="cards-list">
        {roster.map(student=>{const status=attendance[student.child_id]||'present';return <div className="attendance-row" key={student.child_id}>
          <div><strong>{student.first_name} {student.last_name}</strong><small>{student.grade_or_program}{student.section?` · Section ${student.section}`:''}</small></div>
          <div className="attendance-actions">
            <button className={`attendance-pill ${status==='present'?'selected':''}`} onClick={()=>setAttendance(prev=>({...prev,[student.child_id]:'present'}))}>Present</button>
            <button className={`attendance-pill ${status==='absent'?'selected':''}`} onClick={()=>setAttendance(prev=>({...prev,[student.child_id]:'absent'}))}>Absent</button>
          </div>
        </div>})}
        {!roster.length&&<p>No students are enrolled in this class yet.</p>}
      </div>
      <div className="attendance-save"><button className="primary-button" disabled={!roster.length||saving} onClick={()=>void saveAttendance()}><CheckCircle2 size={17}/> {saving?'Saving…':'Save Attendance'}</button></div>
    </div>}
  </div>
}

export function AdminClassAssignmentPanel() {
  const [assignments, setAssignments] = useState<AdminClassRow[]>([])
  const [overview, setOverview] = useState<AdminClassOverview[]>([])
  const [children, setChildren] = useState<AdminChildClassRow[]>([])
  const [rosters, setRosters] = useState<Record<string, AdminRosterRow[]>>({})
  const [staff, setStaff] = useState<StaffDirectoryRow[]>([])
  const [choice, setChoice] = useState<Record<string, string>>({})

  const [className, setClassName] = useState('')
  const [classSection, setClassSection] = useState('')
  const [academicYear, setAcademicYear] = useState('2026-27')

  const [enrollClassId, setEnrollClassId] = useState('')
  const [enrollChildId, setEnrollChildId] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)

    const [assignmentResult, staffResult, overviewResult, childrenResult] = await Promise.all([
      supabase.rpc('admin_class_assignments'),
      supabase.rpc('admin_staff_directory'),
      supabase.rpc('admin_classes_overview'),
      supabase.rpc('admin_children_class_status'),
    ])

    if (assignmentResult.error || staffResult.error || overviewResult.error || childrenResult.error) {
      setMessage(
        assignmentResult.error?.message ||
        staffResult.error?.message ||
        overviewResult.error?.message ||
        childrenResult.error?.message ||
        'Unable to load classes.'
      )
      setLoading(false)
      return
    }

    const nextOverview=((overviewResult.data || []) as AdminClassOverview[]).map(row=>({
      ...row,
      student_count:Number(row.student_count||0),
    }))

    const rosterEntries=await Promise.all(
      nextOverview.map(async cls=>{
        const result=await supabase.rpc('admin_class_students',{p_class_id:cls.class_id})
        return [cls.class_id,result.error?[]:(result.data||[]) as AdminRosterRow[]] as const
      })
    )

    setAssignments((assignmentResult.data || []) as AdminClassRow[])
    setStaff((staffResult.data || []) as StaffDirectoryRow[])
    setOverview(nextOverview)
    setChildren((childrenResult.data || []) as AdminChildClassRow[])
    setRosters(Object.fromEntries(rosterEntries))
    setEnrollClassId(current=>current&&nextOverview.some(x=>x.class_id===current)?current:(nextOverview[0]?.class_id||''))
    setEnrollChildId(current=>current&&((childrenResult.data||[]) as AdminChildClassRow[]).some(x=>x.child_id===current)?current:(((childrenResult.data||[]) as AdminChildClassRow[])[0]?.child_id||''))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const assignmentMap = useMemo(() => {
    const map = new Map<string, AdminClassRow[]>()
    assignments.forEach(row=>{
      if(!row.staff_id || !row.active) return
      if(!map.has(row.class_id)) map.set(row.class_id,[])
      map.get(row.class_id)!.push(row)
    })
    return map
  }, [assignments])

  const unassignedChildren=useMemo(
    ()=>children.filter(child=>!child.current_class_id),
    [children],
  )

  async function createClass() {
    if(!className.trim()){
      setMessage('Enter a class name first.')
      return
    }

    setBusy(true)
    setMessage('Creating class…')
    const {error}=await supabase.rpc('admin_create_class',{
      p_name:className.trim(),
      p_section:classSection.trim()||null,
      p_academic_year:academicYear.trim()||null,
    })

    if(error){
      setMessage(error.message)
      setBusy(false)
      return
    }

    setClassName('')
    setClassSection('')
    setMessage('Class created. You can now enroll children and assign staff.')
    await load()
    setBusy(false)
  }

  async function enrollChild() {
    if(!enrollClassId || !enrollChildId){
      setMessage('Choose both a class and a child.')
      return
    }

    setBusy(true)
    setMessage('Saving enrollment…')
    const {error}=await supabase.rpc('admin_enroll_child',{
      p_class_id:enrollClassId,
      p_child_id:enrollChildId,
    })

    if(error){
      setMessage(error.message)
      setBusy(false)
      return
    }

    setMessage('Child enrollment updated successfully.')
    await load()
    setBusy(false)
  }

  async function unenrollChild(childId:string) {
    setBusy(true)
    setMessage('Removing child from class…')
    const {error}=await supabase.rpc('admin_unenroll_child',{p_child_id:childId})
    if(error){
      setMessage(error.message)
      setBusy(false)
      return
    }

    setMessage('Child removed from the class. You can enroll them into another class anytime.')
    await load()
    setBusy(false)
  }

  async function assign(classId: string) {
    const staffId = choice[classId]
    if (!staffId) {
      setMessage('Choose a staff member first.')
      return
    }

    setBusy(true)
    setMessage('Assigning class…')
    const { error } = await supabase.rpc('admin_assign_staff_to_class', {
      p_class_id: classId,
      p_staff_id: staffId,
    })

    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }

    setMessage('Class assigned successfully.')
    await load()
    setBusy(false)
  }

  if (loading) return <div className="panel">Loading classes and enrollments…</div>

  return <div className="class-admin-workspace">
    {message && <div className="status-message admin-status">{message}</div>}

    <div className="panel class-setup-panel">
      <div className="panel-title">
        <div>
          <h2>Classes, Sections & Student Enrollment</h2>
          <p>Create the official class structure first, then enroll each child into exactly one active class. Parent access will use this enrollment.</p>
        </div>
      </div>

      <div className="class-admin-grid">
        <div className="class-admin-card">
          <div className="class-admin-card-head">
            <span className="feature-icon"><School size={20}/></span>
            <div><strong>Create class</strong><small>Add a grade/programme and section.</small></div>
          </div>
          <label>Class / programme
            <input value={className} onChange={e=>setClassName(e.target.value)} placeholder="e.g. Grade 5"/>
          </label>
          <label>Section
            <input value={classSection} onChange={e=>setClassSection(e.target.value)} placeholder="e.g. A"/>
          </label>
          <label>Academic year
            <input value={academicYear} onChange={e=>setAcademicYear(e.target.value)} placeholder="2026-27"/>
          </label>
          <button className="primary-button" disabled={busy} onClick={()=>void createClass()}><Plus size={16}/> Create Class</button>
        </div>

        <div className="class-admin-card">
          <div className="class-admin-card-head">
            <span className="feature-icon"><Users size={20}/></span>
            <div><strong>Enroll or move child</strong><small>One child can have only one active class enrollment.</small></div>
          </div>
          <label>Child
            <select value={enrollChildId} onChange={e=>setEnrollChildId(e.target.value)}>
              {children.map(child=><option key={child.child_id} value={child.child_id}>
                {child.first_name} {child.last_name}{child.current_class_name?` — currently ${child.current_class_name}${child.current_section?` ${child.current_section}`:''}`:' — not enrolled'}
              </option>)}
            </select>
          </label>
          <label>Class & section
            <select value={enrollClassId} onChange={e=>setEnrollClassId(e.target.value)}>
              {overview.map(cls=><option key={cls.class_id} value={cls.class_id}>
                {cls.class_name}{cls.section?` — Section ${cls.section}`:''}{cls.academic_year?` · ${cls.academic_year}`:''}
              </option>)}
            </select>
          </label>
          <button className="primary-button" disabled={busy||!enrollClassId||!enrollChildId} onClick={()=>void enrollChild()}>
            <CheckCircle2 size={16}/> Save Enrollment
          </button>
        </div>
      </div>

      <div className="class-status-strip">
        <span><strong>{overview.length}</strong> active classes</span>
        <span><strong>{children.length-unassignedChildren.length}</strong> enrolled children</span>
        <span><strong>{unassignedChildren.length}</strong> not enrolled</span>
      </div>

      {!!unassignedChildren.length&&<div className="unenrolled-box">
        <strong>Children needing a class</strong>
        <div>
          {unassignedChildren.map(child=><span key={child.child_id}>{child.first_name} {child.last_name}</span>)}
        </div>
      </div>}
    </div>

    <div className="class-roster-grid">
      {overview.map(cls=>{
        const classAssignments=assignmentMap.get(cls.class_id)||[]
        const roster=rosters[cls.class_id]||[]

        return <div className="panel class-roster-card" key={cls.class_id}>
          <div className="class-roster-heading">
            <div>
              <span className="eyebrow">{cls.academic_year||'Academic year'}</span>
              <h3>{cls.class_name}{cls.section?` — Section ${cls.section}`:''}</h3>
              <p>{cls.student_count} enrolled student{cls.student_count===1?'':'s'}</p>
            </div>
            <span className="class-count-badge">{cls.student_count}</span>
          </div>

          <div className="class-staff-box">
            <strong>Assigned staff</strong>
            <small>
              {classAssignments.length
                ? classAssignments.map(a=>`${a.staff_email} (${label(a.staff_role||'')})`).join(', ')
                : 'No teacher or special educator assigned'}
            </small>
            <div className="class-assign-inline">
              <select value={choice[cls.class_id]||''} onChange={e=>setChoice(prev=>({...prev,[cls.class_id]:e.target.value}))}>
                <option value="">Choose staff…</option>
                {staff.map(s=><option key={s.user_id} value={s.user_id}>{s.email} — {label(s.role)}</option>)}
              </select>
              <button className="mini-button" disabled={busy||!choice[cls.class_id]} onClick={()=>void assign(cls.class_id)}>Assign</button>
            </div>
          </div>

          <div className="class-student-list">
            <strong>Enrolled children</strong>
            {roster.map(student=><div className="class-student-row" key={student.child_id}>
              <div>
                <b>{student.first_name} {student.last_name}</b>
                <small>{student.student_identifier||'Student ID not set'}</small>
              </div>
              <button className="mini-button danger" disabled={busy} onClick={()=>void unenrollChild(student.child_id)}><Trash2 size={14}/> Remove</button>
            </div>)}
            {!roster.length&&<p className="helper">No children enrolled in this class yet.</p>}
          </div>
        </div>
      })}
    </div>

    <AdminSchedule/>
  </div>
}

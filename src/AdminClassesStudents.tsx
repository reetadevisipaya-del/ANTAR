import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, GraduationCap, Plus, School, Trash2, UserRoundPlus, Users } from 'lucide-react'
import { supabase } from './supabase'

type ClassRow={
  class_id:string
  class_name:string
  section?:string
  academic_year?:string
  student_count:number
}

type ChildRow={
  child_id:string
  first_name:string
  last_name?:string
  student_identifier?:string
  current_class_id?:string|null
  current_class_name?:string|null
  current_section?:string|null
}

type RosterRow={
  enrollment_id:string
  child_id:string
  first_name:string
  last_name?:string
  student_identifier?:string
}

type StaffRow={
  user_id:string
  email:string
  role:string
}

type AssignmentRow={
  class_id:string
  class_name:string
  section?:string
  staff_id?:string|null
  staff_email?:string|null
  staff_role?:string|null
  active?:boolean|null
}

const label=(value?:string|null)=>value?value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):''

export default function AdminClassesStudents({onOpenChild}:{onOpenChild?:(childId:string)=>void}={}){
  const [classes,setClasses]=useState<ClassRow[]>([])
  const [children,setChildren]=useState<ChildRow[]>([])
  const [rosters,setRosters]=useState<Record<string,RosterRow[]>>({})
  const [staff,setStaff]=useState<StaffRow[]>([])
  const [assignments,setAssignments]=useState<AssignmentRow[]>([])
  const [selectedClassId,setSelectedClassId]=useState('')

  const [newName,setNewName]=useState('')
  const [newSection,setNewSection]=useState('')
  const [newYear,setNewYear]=useState('2026-27')

  const [studentToEnroll,setStudentToEnroll]=useState('')
  const [targetClassId,setTargetClassId]=useState('')
  const [staffChoice,setStaffChoice]=useState('')

  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function load(){
    setLoading(true)
    const [classRes,childRes,staffRes,assignmentRes]=await Promise.all([
      supabase.rpc('admin_classes_overview'),
      supabase.rpc('admin_children_class_status'),
      supabase.rpc('admin_staff_directory'),
      supabase.rpc('admin_class_assignments'),
    ])

    if(classRes.error||childRes.error||staffRes.error||assignmentRes.error){
      setMessage(classRes.error?.message||childRes.error?.message||staffRes.error?.message||assignmentRes.error?.message||'Unable to load class system.')
      setLoading(false)
      return
    }

    const nextClasses=((classRes.data||[]) as ClassRow[]).map(row=>({...row,student_count:Number(row.student_count||0)}))
    const nextChildren=(childRes.data||[]) as ChildRow[]
    const rosterPairs=await Promise.all(nextClasses.map(async cls=>{
      const result=await supabase.rpc('admin_class_students',{p_class_id:cls.class_id})
      return [cls.class_id,result.error?[]:(result.data||[]) as RosterRow[]] as const
    }))

    setClasses(nextClasses)
    setChildren(nextChildren)
    setStaff((staffRes.data||[]) as StaffRow[])
    setAssignments((assignmentRes.data||[]) as AssignmentRow[])
    setRosters(Object.fromEntries(rosterPairs))

    setSelectedClassId(current=>current&&nextClasses.some(c=>c.class_id===current)?current:(nextClasses[0]?.class_id||''))
    setTargetClassId(current=>current&&nextClasses.some(c=>c.class_id===current)?current:(nextClasses[0]?.class_id||''))
    setStudentToEnroll(current=>current&&nextChildren.some(c=>c.child_id===current)?current:(nextChildren.find(c=>!c.current_class_id)?.child_id||nextChildren[0]?.child_id||''))
    setLoading(false)
  }

  useEffect(()=>{void load()},[])

  const selectedClass=classes.find(c=>c.class_id===selectedClassId)
  const selectedRoster=selectedClassId?(rosters[selectedClassId]||[]):[]
  const unassigned=useMemo(()=>children.filter(c=>!c.current_class_id),[children])
  const selectedAssignments=useMemo(
    ()=>assignments.filter(a=>a.class_id===selectedClassId&&a.staff_id&&a.active),
    [assignments,selectedClassId],
  )

  async function createClass(){
    if(!newName.trim()){setMessage('Enter a class or programme name.');return}
    setBusy(true)
    setMessage('Creating class…')
    const {data,error}=await supabase.rpc('admin_create_class',{
      p_name:newName.trim(),
      p_section:newSection.trim()||null,
      p_academic_year:newYear.trim()||null,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setNewName('')
    setNewSection('')
    setMessage('Class created successfully.')
    await load()
    if(data)setSelectedClassId(String(data))
    setBusy(false)
  }

  async function enroll(){
    if(!studentToEnroll||!targetClassId){setMessage('Choose a student and a class.');return}
    setBusy(true)
    setMessage('Saving enrollment…')
    const {error}=await supabase.rpc('admin_enroll_child',{
      p_class_id:targetClassId,
      p_child_id:studentToEnroll,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setSelectedClassId(targetClassId)
    setMessage('Student enrollment saved. Parent access will now use this class assignment.')
    await load()
    setBusy(false)
  }

  async function removeFromClass(childId:string){
    setBusy(true)
    const {error}=await supabase.rpc('admin_unenroll_child',{p_child_id:childId})
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage('Student removed from the active class.')
    await load()
    setBusy(false)
  }

  async function assignStaff(){
    if(!selectedClassId||!staffChoice){setMessage('Choose a staff member first.');return}
    setBusy(true)
    const {error}=await supabase.rpc('admin_assign_staff_to_class',{
      p_class_id:selectedClassId,
      p_staff_id:staffChoice,
    })
    if(error){setMessage(error.message);setBusy(false);return}
    setMessage('Staff assigned to this class.')
    setStaffChoice('')
    await load()
    setBusy(false)
  }

  if(loading)return <div className="panel">Loading Classes & Students…</div>

  return <div className="classes-students-system">
    {message&&<div className="status-message admin-status">{message}</div>}

    <div className="cs-summary-grid">
      <div className="cs-summary-card"><School size={20}/><div><strong>{classes.length}</strong><span>Active classes</span></div></div>
      <div className="cs-summary-card"><Users size={20}/><div><strong>{children.length-unassigned.length}</strong><span>Enrolled students</span></div></div>
      <div className="cs-summary-card"><UserRoundPlus size={20}/><div><strong>{unassigned.length}</strong><span>Need class assignment</span></div></div>
    </div>

    <div className="panel cs-create-panel">
      <div className="panel-title"><div><h2>Create a Class</h2><p>Build the official class + section structure used everywhere else in ANTAR.</p></div></div>
      <div className="cs-create-form">
        <label>Class / Programme<input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Grade 5"/></label>
        <label>Section<input value={newSection} onChange={e=>setNewSection(e.target.value)} placeholder="e.g. A"/></label>
        <label>Academic year<input value={newYear} onChange={e=>setNewYear(e.target.value)} placeholder="2026-27"/></label>
        <button className="primary-button" disabled={busy} onClick={()=>void createClass()}><Plus size={16}/> Create Class</button>
      </div>
    </div>

    <div className="cs-layout">
      <aside className="panel cs-class-list">
        <div className="panel-title"><div><h2>Classes</h2><p>Select a class to manage its students and staff.</p></div></div>
        <div className="cs-class-buttons">
          {classes.map(cls=><button
            key={cls.class_id}
            className={selectedClassId===cls.class_id?'cs-class-button active':'cs-class-button'}
            onClick={()=>setSelectedClassId(cls.class_id)}
          >
            <span><strong>{cls.class_name}{cls.section?` · ${cls.section}`:''}</strong><small>{cls.academic_year||'Academic year not set'}</small></span>
            <b>{cls.student_count}</b>
          </button>)}
        </div>

        {!!unassigned.length&&<div className="cs-unassigned">
          <strong>Not enrolled</strong>
          <div>{unassigned.map(child=><span key={child.child_id}>{child.first_name} {child.last_name}</span>)}</div>
        </div>}
      </aside>

      <section className="panel cs-class-detail">
        {selectedClass?<div className="cs-class-detail-inner">
          <div className="cs-detail-head">
            <div>
              <span className="eyebrow">Class roster</span>
              <h2>{selectedClass.class_name}{selectedClass.section?` — Section ${selectedClass.section}`:''}</h2>
              <p>{selectedClass.academic_year||'Academic year not set'} · {selectedRoster.length} enrolled student{selectedRoster.length===1?'':'s'}</p>
            </div>
            <span className="class-count-badge">{selectedRoster.length}</span>
          </div>

          <div className="cs-enroll-box">
            <div>
              <strong>Enroll or move a student</strong>
              <small>If the student is already in another class, ANTAR moves them here and closes the old active enrollment.</small>
            </div>
            <div className="cs-enroll-controls">
              <select value={studentToEnroll} onChange={e=>setStudentToEnroll(e.target.value)}>
                {children.map(child=><option key={child.child_id} value={child.child_id}>
                  {child.first_name} {child.last_name}{child.current_class_name?` — currently ${child.current_class_name}${child.current_section?` ${child.current_section}`:''}`:' — not enrolled'}
                </option>)}
              </select>
              <select value={targetClassId||selectedClassId} onChange={e=>setTargetClassId(e.target.value)}>
                {classes.map(cls=><option key={cls.class_id} value={cls.class_id}>{cls.class_name}{cls.section?` — Section ${cls.section}`:''}</option>)}
              </select>
              <button className="primary-button" disabled={busy||!studentToEnroll} onClick={()=>void enroll()}><CheckCircle2 size={16}/> Save Enrollment</button>
            </div>
          </div>

          <div className="cs-staff-box">
            <div>
              <strong>Class staff</strong>
              <small>{selectedAssignments.length?selectedAssignments.map(a=>`${a.staff_email} (${label(a.staff_role)})`).join(', '):'No teacher or special educator assigned yet.'}</small>
            </div>
            <div className="cs-staff-controls">
              <select value={staffChoice} onChange={e=>setStaffChoice(e.target.value)}>
                <option value="">Choose Teacher / Special Educator…</option>
                {staff.map(s=><option key={s.user_id} value={s.user_id}>{s.email} — {label(s.role)}</option>)}
              </select>
              <button className="mini-button" disabled={busy||!staffChoice} onClick={()=>void assignStaff()}>Assign Staff</button>
            </div>
          </div>

          <div className="cs-roster">
            <div className="cs-roster-head">
              <strong>Students in this class</strong>
              <span>{selectedRoster.length} total</span>
            </div>
            {selectedRoster.map((student,index)=><div className="cs-student-row" key={student.child_id}>
              <span className="cs-student-number">{String(index+1).padStart(2,'0')}</span>
              <div className="cs-student-avatar">{student.first_name.slice(0,1).toUpperCase()}</div>
              <div className="cs-student-copy">
                <strong>{student.first_name} {student.last_name}</strong>
                <small>{student.student_identifier||'Student ID not set'} · {selectedClass.class_name}{selectedClass.section?` ${selectedClass.section}`:''}</small>
              </div>
              <span className="badge active">Enrolled</span>
              {onOpenChild&&<button className="mini-button" onClick={()=>onOpenChild(student.child_id)}>Open Profile</button>}
              <button className="mini-button danger" disabled={busy} onClick={()=>void removeFromClass(student.child_id)}><Trash2 size={14}/> Remove</button>
            </div>)}
            {!selectedRoster.length&&<div className="cs-empty-roster"><GraduationCap size={28}/><strong>No students enrolled yet</strong><span>Use “Enroll or move a student” above to build this class roster.</span></div>}
          </div>
        </div>:<div className="cs-empty-roster"><BookOpen size={28}/><strong>Create your first class</strong><span>Classes will appear here with their enrolled students.</span></div>}
      </section>
    </div>
  </div>
}

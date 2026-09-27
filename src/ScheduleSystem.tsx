import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, MapPin, Trash2 } from 'lucide-react'
import { supabase } from './supabase'

type ClassOption = {
  class_id: string
  name?: string
  class_name?: string
  section?: string
  academic_year?: string
}

type ScheduleEvent = {
  event_id: string
  class_id: string
  title: string
  description?: string
  event_type: string
  starts_at: string
  ends_at: string
  location?: string
}

type SlotDraft = {
  event_id?: string
  type: string
  title: string
  location: string
  description: string
}

const slotTypes = [
  ['class','Class'],
  ['therapy','Therapy'],
  ['activity','Activity'],
  ['assessment','Assessment'],
  ['meeting','Meeting'],
  ['lunch','Lunch'],
  ['break','Break'],
  ['other','Other'],
] as const

const hours = [8,9,10,11,12,13,14,15]
const pad = (n:number)=>String(n).padStart(2,'0')
const slotKey = (hour:number)=>`${pad(hour)}:00`
const slotLabel = (hour:number)=>{
  const from=new Date(2000,0,1,hour,0)
  const to=new Date(2000,0,1,hour+1,0)
  const fmt=(d:Date)=>d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})
  return `${fmt(from)} – ${fmt(to)}`
}

function dayRange(date:string){
  const from=new Date(`${date}T00:00:00`)
  const to=new Date(from)
  to.setDate(to.getDate()+1)
  return {from:from.toISOString(),to:to.toISOString()}
}

function className(c:ClassOption){
  return c.name||c.class_name||'Class'
}

function eventAtHour(events:ScheduleEvent[],hour:number){
  return events.find(e=>new Date(e.starts_at).getHours()===hour)
}

function defaultDraft(event?:ScheduleEvent):SlotDraft{
  if(!event) return {type:'class',title:'',location:'',description:''}
  return {
    event_id:event.event_id,
    type:event.event_type,
    title:event.title||'',
    location:event.location||'',
    description:event.description||'',
  }
}

function TimetableManager({classes,heading,subheading}:{classes:ClassOption[];heading:string;subheading:string}){
  const [selectedClass,setSelectedClass]=useState('')
  const [date,setDate]=useState(new Date().toISOString().slice(0,10))
  const [events,setEvents]=useState<ScheduleEvent[]>([])
  const [drafts,setDrafts]=useState<Record<string,SlotDraft>>({})
  const [savingSlot,setSavingSlot]=useState('')
  const [message,setMessage]=useState('')

  useEffect(()=>{
    setSelectedClass(current=>current&&classes.some(c=>c.class_id===current)?current:(classes[0]?.class_id||''))
  },[classes])

  async function load(){
    if(!selectedClass){setEvents([]);setDrafts({});return}
    setMessage('')
    const range=dayRange(date)
    const {data,error}=await supabase.rpc('class_schedule_for_staff',{
      p_class_id:selectedClass,
      p_from:range.from,
      p_to:range.to,
    })
    if(error){setMessage(error.message);setEvents([]);return}

    const next=(data||[]) as ScheduleEvent[]
    setEvents(next)
    const nextDrafts:Record<string,SlotDraft>={}
    hours.forEach(hour=>{
      const key=slotKey(hour)
      nextDrafts[key]=defaultDraft(eventAtHour(next,hour))
    })
    setDrafts(nextDrafts)
  }

  useEffect(()=>{void load()},[selectedClass,date])

  function updateDraft(key:string,patch:Partial<SlotDraft>){
    setDrafts(prev=>({...prev,[key]:{...(prev[key]||defaultDraft()),...patch}}))
  }

  async function saveSlot(hour:number){
    if(!selectedClass){setMessage('Choose a class first.');return}
    const key=slotKey(hour)
    const draft=drafts[key]||defaultDraft()

    if(!draft.title.trim() && !['lunch','break'].includes(draft.type)){
      setMessage('Enter the subject or activity name for this slot.')
      return
    }

    setSavingSlot(key)
    setMessage('Saving timetable slot…')
    const starts=new Date(`${date}T${key}:00`)
    const {error}=await supabase.rpc('upsert_class_timetable_slot',{
      p_class_id:selectedClass,
      p_starts_at:starts.toISOString(),
      p_slot_type:draft.type,
      p_title:draft.title.trim()||null,
      p_location:draft.location.trim()||null,
      p_description:draft.description.trim()||null,
    })

    if(error){setMessage(error.message);setSavingSlot('');return}
    await load()
    setMessage(`${slotLabel(hour)} updated. Parents in this class can see the change.`)
    setSavingSlot('')
  }

  async function clearSlot(hour:number){
    const event=eventAtHour(events,hour)
    if(!event) return
    setSavingSlot(slotKey(hour))
    const {error}=await supabase.rpc('remove_class_schedule_event',{p_event_id:event.event_id})
    if(error){setMessage(error.message);setSavingSlot('');return}
    await load()
    setMessage(`${slotLabel(hour)} cleared.`)
    setSavingSlot('')
  }

  return <div className="panel timetable-panel">
    <div className="panel-title">
      <div>
        <h2>{heading}</h2>
        <p>{subheading}</p>
      </div>
    </div>

    {message&&<div className="status-message admin-status">{message}</div>}

    <div className="attendance-toolbar timetable-toolbar">
      <label>Class
        <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
          {classes.map(c=><option key={c.class_id} value={c.class_id}>{className(c)}{c.section?` — Section ${c.section}`:''}</option>)}
        </select>
      </label>
      <label>Date
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      </label>
    </div>

    <div className="timetable">
      <div className="timetable-head timetable-row">
        <span>Time</span><span>Type</span><span>Subject / Activity</span><span>Room</span><span>Notes</span><span>Action</span>
      </div>

      {hours.map(hour=>{
        const key=slotKey(hour)
        const draft=drafts[key]||defaultDraft()
        const existing=eventAtHour(events,hour)
        return <div className={`timetable-row ${existing?'filled':''}`} key={key}>
          <div className="time-cell"><Clock3 size={15}/><strong>{slotLabel(hour)}</strong></div>
          <select value={draft.type} onChange={e=>{
            const type=e.target.value
            updateDraft(key,{
              type,
              title:type==='lunch'?'Lunch':type==='break'?'Break':draft.title,
            })
          }}>
            {slotTypes.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
          <input
            value={draft.title}
            placeholder={draft.type==='class'?'e.g. Maths / English':draft.type==='lunch'?'Lunch':draft.type==='break'?'Break':'e.g. Speech Therapy'}
            onChange={e=>updateDraft(key,{title:e.target.value})}
            disabled={draft.type==='lunch'||draft.type==='break'}
          />
          <input value={draft.location} placeholder="Room / location" onChange={e=>updateDraft(key,{location:e.target.value})}/>
          <input value={draft.description} placeholder="Optional note" onChange={e=>updateDraft(key,{description:e.target.value})}/>
          <div className="slot-actions">
            <button className="mini-button slot-save" disabled={savingSlot===key} onClick={()=>void saveSlot(hour)}>
              <CheckCircle2 size={14}/> {existing?'Update':'Save'}
            </button>
            {existing&&<button className="mini-button danger" disabled={savingSlot===key} onClick={()=>void clearSlot(hour)}><Trash2 size={14}/> Clear</button>}
          </div>
        </div>
      })}
    </div>

    <p className="helper timetable-help">Demo timetable uses fixed one-hour slots from 8:00 AM to 4:00 PM. Saving or updating a slot instantly changes the timetable visible to linked parents.</p>
  </div>
}

export function StaffSchedule({classes}:{classes:ClassOption[]}){
  return <TimetableManager
    classes={classes}
    heading="Class Timetable"
    subheading="Choose one of your assigned classes, then fill the one-hour school-day slots. Use Class for subjects such as Maths, or choose Lunch, Therapy, Activity, Assessment, Meeting or Break."
  />
}

export function AdminSchedule(){
  const [classes,setClasses]=useState<ClassOption[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    void (async()=>{
      const {data,error}=await supabase.rpc('admin_class_assignments')
      if(error){setError(error.message);setLoading(false);return}
      const map=new Map<string,ClassOption>()
      ;(data||[]).forEach((row:any)=>{
        if(!map.has(row.class_id)) map.set(row.class_id,{
          class_id:row.class_id,
          class_name:row.class_name,
          section:row.section,
          academic_year:row.academic_year,
        })
      })
      setClasses([...map.values()])
      setLoading(false)
    })()
  },[])

  if(loading)return <div className="panel">Loading timetable classes…</div>
  if(error)return <div className="status-message">{error}</div>

  return <TimetableManager
    classes={classes}
    heading="Institute Timetable"
    subheading="Choose any class and build its day using one-hour time slots. Teacher and Admin updates use the same class timetable."
  />
}

export function ParentSchedule({childId}:{childId:string}){
  const [date,setDate]=useState(new Date().toISOString().slice(0,10))
  const [events,setEvents]=useState<Array<ScheduleEvent&{class_name:string;section?:string}>>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  async function load(){
    setLoading(true)
    setError('')
    const range=dayRange(date)
    const {data,error}=await supabase.rpc('parent_child_schedule',{
      p_child_id:childId,
      p_from:range.from,
      p_to:range.to,
    })
    if(error){setError(error.message);setEvents([]);setLoading(false);return}
    setEvents((data||[]) as Array<ScheduleEvent&{class_name:string;section?:string}>)
    setLoading(false)
  }

  useEffect(()=>{void load()},[childId,date])

  const firstClass=events[0]
  const displayClass=firstClass?`${firstClass.class_name}${firstClass.section?` — Section ${firstClass.section}`:''}`:'Your child’s class'

  const slotEvents=useMemo(()=>{
    const map=new Map<number,ScheduleEvent&{class_name:string;section?:string}>()
    events.forEach(e=>map.set(new Date(e.starts_at).getHours(),e))
    return map
  },[events])

  return <>
    <div className="section-head">
      <h1>Timetable</h1>
      <p>{displayClass} · Daily one-hour schedule shared by the institute.</p>
    </div>
    <div className="panel timetable-panel">
      <div className="attendance-toolbar timetable-toolbar">
        <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      </div>

      {error&&<div className="status-message">{error}</div>}

      {loading?<p>Loading timetable…</p>:<div className="student-timetable">
        {hours.map(hour=>{
          const event=slotEvents.get(hour)
          return <div className={`student-slot ${event?'filled':'empty'}`} key={hour}>
            <div className="student-slot-time"><Clock3 size={16}/><strong>{slotLabel(hour)}</strong></div>
            {event?<div className="student-slot-event">
              <span className={`timetable-type type-${event.event_type}`}>{event.event_type.replaceAll('_',' ')}</span>
              <strong>{event.title}</strong>
              {event.location&&<small><MapPin size={13}/> {event.location}</small>}
              {event.description&&<p>{event.description}</p>}
            </div>:<div className="student-slot-empty">No event added</div>}
          </div>
        })}
      </div>}
    </div>
  </>
}

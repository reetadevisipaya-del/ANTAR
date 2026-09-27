import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Plus, Trash2 } from 'lucide-react'
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

const eventTypes = [
  ['class','Class'],
  ['therapy','Therapy'],
  ['activity','Activity'],
  ['meeting','Meeting'],
  ['assessment','Assessment'],
  ['other','Other'],
] as const

function dayRange(date:string){
  const from=new Date(`${date}T00:00:00`)
  const to=new Date(from)
  to.setDate(to.getDate()+1)
  return {from:from.toISOString(),to:to.toISOString()}
}

function formatTime(value:string){
  return new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
}

function ScheduleManager({classes,heading,subheading}:{classes:ClassOption[];heading:string;subheading:string}){
  const [selectedClass,setSelectedClass]=useState('')
  const [date,setDate]=useState(new Date().toISOString().slice(0,10))
  const [title,setTitle]=useState('')
  const [eventType,setEventType]=useState('class')
  const [startTime,setStartTime]=useState('09:00')
  const [endTime,setEndTime]=useState('10:00')
  const [location,setLocation]=useState('')
  const [description,setDescription]=useState('')
  const [events,setEvents]=useState<ScheduleEvent[]>([])
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')

  useEffect(()=>{
    setSelectedClass(current=>current&&classes.some(c=>c.class_id===current)?current:(classes[0]?.class_id||''))
  },[classes])

  async function load(){
    if(!selectedClass){setEvents([]);return}
    const range=dayRange(date)
    const {data,error}=await supabase.rpc('class_schedule_for_staff',{
      p_class_id:selectedClass,
      p_from:range.from,
      p_to:range.to,
    })
    if(error){setMessage(error.message);setEvents([]);return}
    setEvents((data||[]) as ScheduleEvent[])
  }

  useEffect(()=>{void load()},[selectedClass,date])

  async function save(){
    if(!selectedClass){setMessage('Choose a class first.');return}
    if(!title.trim()){setMessage('Enter an event title.');return}
    const starts=new Date(`${date}T${startTime}:00`)
    const ends=new Date(`${date}T${endTime}:00`)
    if(ends<=starts){setMessage('End time must be after start time.');return}

    setSaving(true)
    setMessage('Saving schedule event…')
    const {error}=await supabase.rpc('save_class_schedule_event',{
      p_class_id:selectedClass,
      p_title:title.trim(),
      p_description:description.trim()||null,
      p_event_type:eventType,
      p_starts_at:starts.toISOString(),
      p_ends_at:ends.toISOString(),
      p_location:location.trim()||null,
    })
    if(error){setMessage(error.message);setSaving(false);return}

    setTitle('')
    setDescription('')
    setLocation('')
    await load()
    setMessage('Schedule event saved. Linked parents can see it now.')
    setSaving(false)
  }

  async function remove(eventId:string){
    const {error}=await supabase.rpc('remove_class_schedule_event',{p_event_id:eventId})
    if(error){setMessage(error.message);return}
    await load()
    setMessage('Schedule event removed.')
  }

  const className=(c:ClassOption)=>c.name||c.class_name||'Class'

  return <div className="panel">
    <div className="panel-title">
      <div>
        <h2>{heading}</h2>
        <p>{subheading}</p>
      </div>
    </div>

    {message&&<div className="status-message admin-status">{message}</div>}

    <div className="attendance-toolbar">
      <label>Class
        <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
          {classes.map(c=><option key={c.class_id} value={c.class_id}>{className(c)}{c.section?` — ${c.section}`:''}</option>)}
        </select>
      </label>
      <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    </div>

    <div className="report-form">
      <label>Event title<input placeholder="e.g. Maths, Speech Therapy, Assessment" value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>Event type
        <select value={eventType} onChange={e=>setEventType(e.target.value)}>
          {eventTypes.map(([value,label])=><option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Start time<input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></label>
      <label>End time<input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></label>
      <label>Location<input placeholder="e.g. Classroom 5A / Therapy Room" value={location} onChange={e=>setLocation(e.target.value)}/></label>
      <label>Notes<textarea placeholder="Optional details for families" value={description} onChange={e=>setDescription(e.target.value)}/></label>
    </div>

    <div className="attendance-save">
      <button className="primary-button" disabled={saving||!selectedClass||!title.trim()} onClick={()=>void save()}>
        <Plus size={16}/> {saving?'Saving…':'Save Schedule Event'}
      </button>
    </div>

    <div className="cards-list">
      {events.map(event=><div className="person-row" key={event.event_id}>
        <div>
          <strong><CalendarDays size={15}/> {event.title}</strong>
          <small>{formatTime(event.starts_at)}–{formatTime(event.ends_at)} · {event.event_type.replaceAll('_',' ')}{event.location?` · ${event.location}`:''}</small>
          {event.description&&<p>{event.description}</p>}
        </div>
        <button className="mini-button danger" onClick={()=>void remove(event.event_id)}><Trash2 size={14}/> Remove</button>
      </div>)}
      {!events.length&&<p className="helper">No schedule events for this class on this date.</p>}
    </div>
  </div>
}

export function StaffSchedule({classes}:{classes:ClassOption[]}){
  return <ScheduleManager
    classes={classes}
    heading="Schedule / Timetable"
    subheading="Choose one of your assigned classes and add an event. Every enrolled child’s linked parent will see it."
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

  if(loading)return <div className="panel">Loading schedule classes…</div>
  if(error)return <div className="status-message">{error}</div>

  return <ScheduleManager
    classes={classes}
    heading="Class Schedule"
    subheading="Institute Admin can add schedule events for any class. Linked parents see only events for their child’s enrolled class."
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

  const ordered=useMemo(()=>[...events].sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()),[events])

  return <>
    <div className="section-head">
      <h1>Schedule</h1>
      <p>Class timetable, therapy, activities, meetings and assessments shared by your child’s institution.</p>
    </div>
    <div className="panel">
      <div className="attendance-toolbar">
        <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      </div>
      {error&&<div className="status-message">{error}</div>}
      {loading?<p>Loading schedule…</p>:<div className="cards-list">
        {ordered.map(event=><div className="record-card" key={event.event_id}>
          <strong><CalendarDays size={15}/> {event.title}</strong>
          <p>{formatTime(event.starts_at)}–{formatTime(event.ends_at)} · {event.class_name}{event.section?` Section ${event.section}`:''}</p>
          {event.location&&<small><MapPin size={13}/> {event.location}</small>}
          {event.description&&<p>{event.description}</p>}
        </div>)}
        {!ordered.length&&<p>No schedule events for this date.</p>}
      </div>}
    </div>
  </>
}

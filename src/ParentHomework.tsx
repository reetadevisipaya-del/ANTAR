import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { supabase } from './supabase'

type HomeworkRow = {
  homework_id: string
  class_id: string
  class_name: string
  section?: string
  title: string
  details?: string
  homework_date: string
  due_at?: string
}

export default function ParentHomework({childId}:{childId:string}){
  const [date,setDate]=useState(new Date().toISOString().slice(0,10))
  const [rows,setRows]=useState<HomeworkRow[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  async function load(){
    setLoading(true)
    setError('')
    const {data,error}=await supabase.rpc('parent_child_homework',{p_child_id:childId,p_date:date})
    if(error){
      setError(error.message)
      setRows([])
    }else{
      setRows((data||[]) as HomeworkRow[])
    }
    setLoading(false)
  }

  useEffect(()=>{void load()},[childId,date])

  return <>
    <div className="section-head">
      <h1>Homework</h1>
      <p>Daily homework posted by your child’s class teacher.</p>
    </div>
    <div className="panel">
      <div className="attendance-toolbar">
        <label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      </div>
      {error&&<div className="status-message">{error}</div>}
      {loading?<p>Loading homework…</p>:<div className="cards-list">
        {rows.map(row=><div className="record-card" key={row.homework_id}>
          <div className="person-row">
            <div>
              <strong><BookOpen size={15}/> {row.title}</strong>
              <small>{row.class_name}{row.section?` · Section ${row.section}`:''} · {row.homework_date}</small>
            </div>
            <span className="badge active">Homework</span>
          </div>
          {row.details&&<p>{row.details}</p>}
        </div>)}
        {!rows.length&&<p>No homework has been posted for this date.</p>}
      </div>}
    </div>
  </>
}

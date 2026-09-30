import { useEffect, useState } from 'react'
import { Download, Eye, FileText, Printer, Trash2, Upload } from 'lucide-react'
import { supabase } from './supabase'

type ChildOption = {
  child_id: string
  first_name: string
  last_name?: string
  grade_or_program?: string
  section?: string
}

type DocumentRow = {
  id: string
  child_id: string
  document_type: string
  title: string
  description?: string
  record_date: string
  storage_path: string
  original_file_name: string
  mime_type: string
  file_size_bytes: number
  uploaded_by: string
  created_at: string
}

const documentTypes = [
  ['medical','Medical Report'],
  ['assessment','Assessment'],
  ['prescription','Prescription'],
  ['therapy','Therapy Report'],
  ['school_report','School Document'],
  ['identity','ID / Certificate'],
  ['consent','Consent'],
  ['other','Other'],
] as const

function prettyType(value:string){
  return documentTypes.find(([key])=>key===value)?.[1] || value.replaceAll('_',' ')
}

function sizeLabel(bytes:number){
  if(bytes<1024) return `${bytes} B`
  if(bytes<1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

function safeName(name:string){
  return name.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-')
}

async function openDocument(path:string){
  const {data,error}=await supabase.storage.from('child-documents').createSignedUrl(path,60)
  if(error) throw error
  window.open(data.signedUrl,'_blank','noopener,noreferrer')
}

async function downloadDocument(path:string,fileName:string){
  const {data,error}=await supabase.storage.from('child-documents').createSignedUrl(path,60)
  if(error) throw error
  const response=await fetch(data.signedUrl)
  if(!response.ok) throw new Error('Unable to download this document.')
  const blob=await response.blob()
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  a.download=fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function DocumentsManager({mode,initialChildId}:{mode:'staff'|'admin';initialChildId?:string}){
  const [children,setChildren]=useState<ChildOption[]>([])
  const [childId,setChildId]=useState(initialChildId||'')
  const [documents,setDocuments]=useState<DocumentRow[]>([])
  const [type,setType]=useState('medical')
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [recordDate,setRecordDate]=useState(new Date().toISOString().slice(0,10))
  const [file,setFile]=useState<File|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function loadChildren(){
    setLoading(true)
    setMessage('')
    const rpc=mode==='admin'?'admin_document_children':'staff_document_children'
    const {data,error}=await supabase.rpc(rpc)
    if(error){setMessage(error.message);setLoading(false);return}
    const next=(data||[]) as ChildOption[]
    setChildren(next)
    setChildId(current=>current&&next.some(c=>c.child_id===current)?current:(initialChildId&&next.some(c=>c.child_id===initialChildId)?initialChildId:(next[0]?.child_id||'')))
    setLoading(false)
  }

  async function loadDocuments(targetChild=childId){
    if(!targetChild){setDocuments([]);return}
    const {data,error}=await supabase
      .from('documents')
      .select('id,child_id,document_type,title,description,record_date,storage_path,original_file_name,mime_type,file_size_bytes,uploaded_by,created_at')
      .eq('child_id',targetChild)
      .order('record_date',{ascending:false})
      .order('created_at',{ascending:false})
    if(error){setMessage(error.message);return}
    setDocuments((data||[]) as DocumentRow[])
  }

  useEffect(()=>{void loadChildren()},[mode,initialChildId])
  useEffect(()=>{if(initialChildId&&children.some(c=>c.child_id===initialChildId))setChildId(initialChildId)},[initialChildId,children])
  useEffect(()=>{void loadDocuments()},[childId])

  async function upload(){
    if(!childId){setMessage('Choose a child first.');return}
    if(!title.trim()){setMessage('Enter a document title.');return}
    if(!file){setMessage('Choose a PDF or image to upload.');return}

    const allowed=['application/pdf','image/jpeg','image/png','image/webp']
    if(!allowed.includes(file.type)){setMessage('Only PDF, JPG, PNG and WEBP files are allowed.');return}
    if(file.size>20*1024*1024){setMessage('File must be 20 MB or smaller.');return}

    setBusy(true)
    setMessage('Uploading secure document…')

    const unique=typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now())
    const path=`${childId}/${Date.now()}-${unique}-${safeName(file.name)}`

    const uploadResult=await supabase.storage.from('child-documents').upload(path,file,{
      cacheControl:'3600',
      upsert:false,
      contentType:file.type,
    })

    if(uploadResult.error){
      setMessage(uploadResult.error.message)
      setBusy(false)
      return
    }

    const register=await supabase.rpc('register_child_document',{
      p_child_id:childId,
      p_document_type:type,
      p_title:title.trim(),
      p_description:description.trim()||null,
      p_record_date:recordDate,
      p_storage_path:path,
      p_original_file_name:file.name,
      p_mime_type:file.type,
      p_file_size_bytes:file.size,
    })

    if(register.error){
      await supabase.storage.from('child-documents').remove([path])
      setMessage(register.error.message)
      setBusy(false)
      return
    }

    setTitle('')
    setDescription('')
    setFile(null)
    const input=document.getElementById(`${mode}-document-file`) as HTMLInputElement|null
    if(input) input.value=''
    await loadDocuments(childId)
    setMessage('Document uploaded securely. The linked parent can access it now.')
    setBusy(false)
  }

  async function removeDocument(doc:DocumentRow){
    setBusy(true)
    setMessage('Removing document…')
    const meta=await supabase.from('documents').delete().eq('id',doc.id)
    if(meta.error){setMessage(meta.error.message);setBusy(false);return}
    await supabase.storage.from('child-documents').remove([doc.storage_path])
    await loadDocuments(childId)
    setMessage('Document removed.')
    setBusy(false)
  }

  const selected=children.find(c=>c.child_id===childId)

  return <div className="panel documents-panel">
    <div className="panel-title">
      <div>
        <h2>{mode==='admin'?'Documents & Medical Records':'Student Documents'}</h2>
        <p>{mode==='admin'
          ? 'Choose any child in the institution and upload a secure record.'
          : 'Upload records only for children assigned to you or enrolled in your assigned classes.'}</p>
      </div>
    </div>

    {message&&<div className="status-message admin-status">{message}</div>}

    {loading?<p>Loading authorized children…</p>:<>
      <div className="attendance-toolbar">
        <label>Child
          <select value={childId} onChange={e=>setChildId(e.target.value)}>
            {children.map(child=><option key={child.child_id} value={child.child_id}>
              {child.first_name} {child.last_name}{child.grade_or_program?` — ${child.grade_or_program}`:''}{child.section?` ${child.section}`:''}
            </option>)}
          </select>
        </label>
        <label>Record date<input type="date" value={recordDate} onChange={e=>setRecordDate(e.target.value)}/></label>
      </div>

      {!children.length?<p>No children are available for document access.</p>:<>
        {selected&&<p className="helper"><strong>{selected.first_name} {selected.last_name}</strong> · {selected.grade_or_program||'Programme not set'}{selected.section?` · Section ${selected.section}`:''}</p>}

        <div className="document-upload-grid">
          <label>Category
            <select value={type} onChange={e=>setType(e.target.value)}>
              {documentTypes.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Title
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Pediatric Assessment"/>
          </label>
          <label>Description
            <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional short note"/>
          </label>
          <label>File
            <input id={`${mode}-document-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/>
          </label>
        </div>

        <div className="attendance-save">
          <button className="primary-button" disabled={busy||!file||!title.trim()} onClick={()=>void upload()}>
            <Upload size={16}/> {busy?'Working…':'Upload Secure Document'}
          </button>
        </div>

        <div className="document-list">
          {documents.map(doc=><div className="document-card" key={doc.id}>
            <div className="document-icon"><FileText size={20}/></div>
            <div className="document-copy">
              <strong>{doc.title}</strong>
              <small>{prettyType(doc.document_type)} · {doc.record_date} · {doc.original_file_name} · {sizeLabel(Number(doc.file_size_bytes))}</small>
              {doc.description&&<p>{doc.description}</p>}
            </div>
            <div className="document-actions">
              <button className="mini-button" onClick={()=>void openDocument(doc.storage_path).catch(e=>setMessage(e.message))}><Eye size={14}/> View</button>
              <button className="mini-button" onClick={()=>void downloadDocument(doc.storage_path,doc.original_file_name).catch(e=>setMessage(e.message))}><Download size={14}/> Download</button>
              <button className="mini-button danger" disabled={busy} onClick={()=>void removeDocument(doc)}><Trash2 size={14}/> Remove</button>
            </div>
          </div>)}
          {!documents.length&&<p className="helper">No documents uploaded for this child yet.</p>}
        </div>
      </>}
    </>}
  </div>
}

export function StaffDocuments({initialChildId}:{initialChildId?:string}={}){
  return <DocumentsManager mode="staff" initialChildId={initialChildId}/>
}

export function AdminDocuments({initialChildId}:{initialChildId?:string}={}){
  return <DocumentsManager mode="admin" initialChildId={initialChildId}/>
}

export function ParentDocuments({childId}:{childId:string}){
  const [documents,setDocuments]=useState<DocumentRow[]>([])
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')

  async function load(){
    setLoading(true)
    const {data,error}=await supabase
      .from('documents')
      .select('id,child_id,document_type,title,description,record_date,storage_path,original_file_name,mime_type,file_size_bytes,uploaded_by,created_at')
      .eq('child_id',childId)
      .order('record_date',{ascending:false})
      .order('created_at',{ascending:false})
    if(error){setMessage(error.message);setDocuments([])}
    else setDocuments((data||[]) as DocumentRow[])
    setLoading(false)
  }

  useEffect(()=>{void load()},[childId])

  return <>
    <div className="section-head">
      <h1>Documents & Medical Records</h1>
      <p>Secure records shared by your child’s authorized institution and care team.</p>
    </div>
    <div className="panel documents-panel">
      <div className="document-toolbar">
        <button className="mini-button" onClick={()=>window.print()}><Printer size={15}/> Print record list</button>
      </div>
      {message&&<div className="status-message">{message}</div>}
      {loading?<p>Loading secure documents…</p>:<div className="document-list">
        {documents.map(doc=><div className="document-card" key={doc.id}>
          <div className="document-icon"><FileText size={20}/></div>
          <div className="document-copy">
            <strong>{doc.title}</strong>
            <small>{prettyType(doc.document_type)} · {doc.record_date} · {doc.original_file_name} · {sizeLabel(Number(doc.file_size_bytes))}</small>
            {doc.description&&<p>{doc.description}</p>}
          </div>
          <div className="document-actions">
            <button className="mini-button" onClick={()=>void openDocument(doc.storage_path).catch(e=>setMessage(e.message))}><Eye size={14}/> View</button>
            <button className="mini-button" onClick={()=>void downloadDocument(doc.storage_path,doc.original_file_name).catch(e=>setMessage(e.message))}><Download size={14}/> Download</button>
          </div>
        </div>)}
        {!documents.length&&<p>No documents have been shared yet.</p>}
      </div>}
    </div>
  </>
}

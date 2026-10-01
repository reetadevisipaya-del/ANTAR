import { useMemo, useState } from 'react'
import {
  BadgeIndianRupee,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  HandHeart,
  HeartPulse,
  Landmark,
  School,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UsersRound,
} from 'lucide-react'

type Need='all'|'certification'|'health'|'assistive'|'education'|'financial'|'care'

type Scheme={
  id:string
  title:string
  setting:string
  need:Exclude<Need,'all'>
  cost:string
  benefit:string
  who:string
  firstStep:string
  documents:string[]
  officialUrl:string
  officialLabel:string
  priority:number
  nationalTrust?:boolean
}

const schemes:Scheme[]=[
  {
    id:'udid',
    title:'UDID + Disability Certificate',
    setting:'Certification & access to benefits',
    need:'certification',
    cost:'Application fee: ₹0',
    benefit:'A pan-India disability identity/certificate used by many disability schemes and concessions.',
    who:'Any Indian citizen with a disability recognised under the RPwD Act. A parent/legal guardian can apply for a minor.',
    firstStep:'Apply on the UDID portal and choose the designated hospital/medical authority for assessment.',
    documents:['Child photo','Identity proof','Medical records','Aadhaar / enrolment details where applicable'],
    officialUrl:'https://www.swavlambancard.gov.in/',
    officialLabel:'Open UDID portal',
    priority:1,
  },
  {
    id:'rbsk',
    title:'RBSK / District Early Intervention',
    setting:'Government health, screening & treatment',
    need:'health',
    cost:'Programme services are free',
    benefit:'Screening from birth to 18 years for birth defects, diseases, deficiencies and developmental delays, with early intervention and referral/treatment.',
    who:'Children from birth to 18 years covered through the Rashtriya Bal Swasthya Karyakram pathway.',
    firstStep:'Ask the nearest government health facility, school health team or district health office about RBSK and the District Early Intervention Centre (DEIC).',
    documents:['Child identity / age proof','Existing medical reports if available'],
    officialUrl:'https://nhm.gov.in/index4.php?lang=1&level=0&lid=773&linkid=499',
    officialLabel:'Official RBSK information',
    priority:2,
  },
  {
    id:'cdeic',
    title:'Cross-Disability Early Intervention Centres (CDEIC)',
    setting:'Early intervention for young children',
    need:'health',
    cost:'Government rehabilitation pathway',
    benefit:'Cross-disability early intervention through National Institutes and Composite Regional Centres for young children with disability/developmental delay.',
    who:'Especially relevant for children in the early-childhood period; the official programme focuses on early intervention for children with disabilities.',
    firstStep:'Check the current operational CDEIC list and contact the nearest National Institute / Composite Regional Centre.',
    documents:['Medical/developmental reports','Disability certificate/UDID if already available','Child identity proof'],
    officialUrl:'https://depwd.gov.in/en/cross-disability-early-intervention-centres/',
    officialLabel:'Find CDEICs',
    priority:3,
  },
  {
    id:'adip',
    title:'ADIP Assistive Devices',
    setting:'Aids, appliances & assistive technology',
    need:'assistive',
    cost:'Subsidised; can be fully subsidised for eligible income bands',
    benefit:'Government support for prescribed assistive devices such as hearing aids, mobility devices, prostheses/orthoses, learning material and other approved aids.',
    who:'Eligible persons with disability meeting the current UDID/disability and income rules under ADIP.',
    firstStep:'Register on the ARJUN portal or contact an implementing agency/ALIMCO/CRC/DDRC for assessment.',
    documents:['UDID / enrolment number','Disability certificate','Aadhaar / enrolment','Income proof'],
    officialUrl:'https://adip.depwd.gov.in/',
    officialLabel:'Open ARJUN / ADIP',
    priority:4,
  },
  {
    id:'niramaya',
    title:'Niramaya Health Insurance',
    setting:'Therapy, OPD, hospital care & transport reimbursement',
    need:'financial',
    cost:'Low-cost government-backed insurance; reimbursement based',
    benefit:'Up to ₹1 lakh coverage with categories including OPD, diagnostics, ongoing therapies, hospitalisation/corrective surgery and transport, subject to current benefit limits.',
    who:'Persons with Autism, Cerebral Palsy, Intellectual Disability or Multiple Disabilities covered by the National Trust, with valid disability/UDID documentation.',
    firstStep:'Check enrolment through the National Trust portal / registered organisation and read the current benefit chart before paying for care.',
    documents:['UDID / UDID enrolment','Disability certificate','Policy/enrolment documents','Bills and prescriptions for claims'],
    officialUrl:'https://nationaltrust.nic.in/niramaya/',
    officialLabel:'Official Niramaya page',
    priority:5,
    nationalTrust:true,
  },
  {
    id:'samagra',
    title:'Samagra Shiksha — Inclusive Education',
    setting:'School support',
    need:'education',
    cost:'Government school-support programme',
    benefit:'Can support identification/assessment, aids and appliances, therapeutic services, teaching-learning material, special educators, reasonable support and transport-related provisions for CWSN through the education system.',
    who:'Children with special needs in the school education system; exact delivery is implemented through State/UT education systems.',
    firstStep:'Ask the school principal/resource teacher/block or district education office for the CWSN / Inclusive Education coordinator and available supports.',
    documents:['School enrolment/bonafide','Disability/UDID documents where required','Assessment/recommendation from relevant professional'],
    officialUrl:'https://samagra.education.gov.in/inclusive.html',
    officialLabel:'Official inclusive education page',
    priority:6,
  },
  {
    id:'prematric',
    title:'Pre-Matric Scholarship for Students with Disabilities',
    setting:'School financial support',
    need:'education',
    cost:'Government scholarship',
    benefit:'Financial support for eligible students with benchmark disability in Classes IX–X, subject to current disability, income and documentation rules.',
    who:'Eligible Indian students with benchmark disability studying in Class IX or X and meeting current scheme conditions.',
    firstStep:'Check the current DEPwD rules and application window on the National Scholarship Portal.',
    documents:['UDID','Aadhaar','Income certificate','School details / bonafide','Bank details'],
    officialUrl:'https://depwd.gov.in/en/scholership-schemes-pre-matric/',
    officialLabel:'Official pre-matric scheme',
    priority:7,
  },
  {
    id:'postmatric',
    title:'Post-Matric Scholarship for Students with Disabilities',
    setting:'Class XI onward / higher education',
    need:'education',
    cost:'Government scholarship',
    benefit:'Financial support for eligible students with benchmark disability from Class XI onward, subject to current course, income and documentation conditions.',
    who:'Eligible Indian students with benchmark disability in Class XI/XII, diploma, degree or postgraduate study.',
    firstStep:'Review the current rules and apply through the National Scholarship Portal when applications are open.',
    documents:['UDID','Aadhaar','Income certificate','Institution/course proof','Bank details'],
    officialUrl:'https://depwd.gov.in/en/scholarship-post-matric/',
    officialLabel:'Official post-matric scheme',
    priority:8,
  },
  {
    id:'disha',
    title:'Disha — Early Intervention & School Readiness',
    setting:'Early intervention / school readiness',
    need:'care',
    cost:'National Trust support through registered centres',
    benefit:'Early intervention and school-readiness support through National Trust registered organisations.',
    who:'Children aged 0–10 years with Autism, Cerebral Palsy, Intellectual Disability or Multiple Disabilities covered under the National Trust Act, subject to scheme conditions.',
    firstStep:'Check the National Trust Disha page and locate a participating registered organisation.',
    documents:['Age proof','Disability certificate/UDID','Parent/guardian ID','Other centre-specific documents'],
    officialUrl:'https://nationaltrust.nic.in/disha-scheme/',
    officialLabel:'Official Disha scheme',
    priority:9,
    nationalTrust:true,
  },
  {
    id:'vikaas',
    title:'Vikaas — Day Care',
    setting:'Day care, social & daily-living support',
    need:'care',
    cost:'National Trust support through registered centres',
    benefit:'Day-care support intended to strengthen interpersonal, vocational and daily-living skills.',
    who:'Persons aged 10 years or more with Autism, Cerebral Palsy, Intellectual Disability or Multiple Disabilities, subject to National Trust scheme conditions.',
    firstStep:'Check participating Vikaas centres/registered organisations through the National Trust.',
    documents:['Age proof','Disability certificate/UDID','Parent/guardian documents','Income/BPL documents where funding category requires them'],
    officialUrl:'https://nationaltrust.nic.in/vikaas-scheme/',
    officialLabel:'Official Vikaas scheme',
    priority:10,
    nationalTrust:true,
  },
  {
    id:'samarth',
    title:'Samarth — Respite / Group Home Support',
    setting:'Respite care & family support',
    need:'care',
    cost:'Support varies by eligibility/funding category',
    benefit:'Respite/group-home support for families in crisis and eligible persons with National Trust disabilities.',
    who:'Persons with Autism, Cerebral Palsy, Intellectual Disability or Multiple Disabilities under the National Trust scheme, with funding eligibility varying by category.',
    firstStep:'Check the National Trust Samarth page and contact a registered Samarth centre.',
    documents:['Disability certificate/UDID','Age proof','Parent/guardian ID','Income/BPL proof where applicable'],
    officialUrl:'https://nationaltrust.nic.in/samarth-scheme/',
    officialLabel:'Official Samarth scheme',
    priority:11,
    nationalTrust:true,
  },
  {
    id:'nationalfund',
    title:'National Fund for Persons with Disabilities',
    setting:'Financial assistance',
    need:'financial',
    cost:'Government financial assistance subject to current guidelines',
    benefit:'DEPwD maintains a National Fund for PwDs with current 2026 guidelines for financial assistance.',
    who:'Eligibility depends on the current National Fund guidelines and the type of assistance requested.',
    firstStep:'Read the current 2026 guidelines on the official DEPwD page before applying.',
    documents:['UDID/disability documents','Identity proof','Income/supporting documents depending on assistance'],
    officialUrl:'https://depwd.gov.in/en/national-fund-under-pwds/',
    officialLabel:'National Fund — current guidelines',
    priority:12,
  },
]

const VERIFIED_DATE='1 Oct 2026'

const documentOptions=[
  ['udid','UDID / enrolment number'],
  ['certificate','Disability certificate'],
  ['aadhaar','Aadhaar / enrolment'],
  ['income','Income certificate / BPL proof'],
  ['bank','Bank account details'],
  ['school','School bonafide / enrolment proof'],
  ['medical','Recent medical / therapy reports'],
]

export default function DisabilitySupport({
  onShowGovernment,
  onShowTherapy,
}:{
  onShowGovernment:()=>void
  onShowTherapy:()=>void
}){
  const [need,setNeed]=useState<Need>('all')
  const [nationalTrustOnly,setNationalTrustOnly]=useState(false)
  const [docs,setDocs]=useState<string[]>(()=>{
    try{return JSON.parse(localStorage.getItem('antar-scheme-docs')||'[]')}catch{return []}
  })

  const visible=useMemo(()=>schemes.filter(scheme=>{
    if(need!=='all'&&scheme.need!==need)return false
    if(nationalTrustOnly&&!scheme.nationalTrust)return false
    return true
  }).sort((a,b)=>a.priority-b.priority),[need,nationalTrustOnly])

  function toggleDoc(id:string){
    setDocs(current=>{
      const next=current.includes(id)?current.filter(x=>x!==id):[...current,id]
      try{localStorage.setItem('antar-scheme-docs',JSON.stringify(next))}catch{}
      return next
    })
  }

  return <section className="disability-support">
    <div className="support-section-heading">
      <div>
        <span className="eyebrow">Lowest-cost support first</span>
        <h2>Government schemes & disability support</h2>
        <p>Use public programmes before paying privately where they fit your child’s needs. Eligibility and benefits can change, so every card links to the official source.</p>
      </div>
      <a className="mini-button" href="https://www.myscheme.gov.in/find-scheme" target="_blank" rel="noreferrer"><Landmark size={15}/> Find State/UT schemes</a>
    </div>

    <div className="low-cost-path panel">
      <div className="low-cost-path-head"><BadgeIndianRupee size={19}/><div><strong>A practical low-cost pathway</strong><small>Start with the options most likely to reduce out-of-pocket costs.</small></div></div>
      <div className="low-cost-steps">
        <div><b>1</b><span><strong>Get UDID / disability certificate</strong><small>It unlocks or simplifies many disability benefits.</small></span></div>
        <div><b>2</b><span><strong>Use government assessment / early intervention</strong><small>RBSK/DEIC and CDEIC can reduce private assessment and therapy costs where available.</small></span></div>
        <div><b>3</b><span><strong>Check assistive-device subsidy</strong><small>Use ADIP/ARJUN before buying eligible aids privately.</small></span></div>
        <div><b>4</b><span><strong>Ask school for CWSN support</strong><small>Samagra Shiksha can support inclusive education, aids, therapy/resource support and other accommodations through the education system.</small></span></div>
        <div><b>5</b><span><strong>Check insurance / reimbursement</strong><small>Niramaya can offset therapy and medical costs for eligible National Trust disabilities.</small></span></div>
        <div><b>6</b><span><strong>Then compare private care</strong><small>Use ANTAR’s nearby-care search only for gaps not covered by public schemes.</small></span></div>
      </div>
      <div className="low-cost-actions">
        <button className="mini-button" onClick={onShowGovernment}><Landmark size={14}/> Show nearby government care</button>
        <button className="mini-button" onClick={onShowTherapy}><Stethoscope size={14}/> Show nearby therapy</button>
      </div>
    </div>

    <div className="scheme-filter-row">
      {([
        ['all','All support'],
        ['certification','Certification'],
        ['health','Health & therapy'],
        ['assistive','Assistive devices'],
        ['education','Education'],
        ['financial','Financial'],
        ['care','Day/respite care'],
      ] as Array<[Need,string]>).map(([value,label])=><button key={value} className={need===value?'active':''} onClick={()=>setNeed(value)}>{label}</button>)}
      <label className="national-trust-toggle"><input type="checkbox" checked={nationalTrustOnly} onChange={e=>setNationalTrustOnly(e.target.checked)}/> National Trust disability schemes only</label>
    </div>

    <div className="scheme-grid">
      {visible.map(scheme=>{
        const Icon=
          scheme.need==='education'?School:
          scheme.need==='health'?HeartPulse:
          scheme.need==='assistive'?HandHeart:
          scheme.need==='financial'?BadgeIndianRupee:
          scheme.need==='care'?UsersRound:
          FileCheck2
        return <article className="panel scheme-card" key={scheme.id}>
          <div className="scheme-card-head">
            <span className="scheme-icon"><Icon size={18}/></span>
            <div><small>{scheme.setting}</small><h3>{scheme.title}</h3></div>
            {scheme.nationalTrust&&<span className="scheme-tag">National Trust</span>}
          </div>
          <div className="scheme-cost"><BadgeIndianRupee size={14}/><strong>{scheme.cost}</strong></div>
          <p>{scheme.benefit}</p>
          <dl>
            <div><dt>Who it may help</dt><dd>{scheme.who}</dd></div>
            <div><dt>First step</dt><dd>{scheme.firstStep}</dd></div>
          </dl>
          <div className="scheme-docs"><small>Common documents</small><span>{scheme.documents.join(' · ')}</span></div>
          <a className="primary-button" href={scheme.officialUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> {scheme.officialLabel}</a>
        </article>
      })}
    </div>

    <div className="scheme-readiness panel">
      <div className="scheme-readiness-head"><UserCheck size={18}/><div><strong>Document readiness checklist</strong><small>Saved only on this device, not in the child’s ANTAR record.</small></div></div>
      <div className="scheme-doc-checks">
        {documentOptions.map(([id,label])=><label key={id} className={docs.includes(id)?'checked':''}>
          <input type="checkbox" checked={docs.includes(id)} onChange={()=>toggleDoc(id)}/>
          <CheckCircle2 size={15}/>
          <span>{label}</span>
        </label>)}
      </div>
    </div>

    <div className="scheme-guidance-note">
      <ShieldCheck size={15}/>
      <span>ANTAR is a scheme-discovery aid, not an eligibility authority. Official sources in this section were checked on {VERIFIED_DATE}. Use the linked government portal for the latest income limits, disability-percentage rules, application dates and benefit amounts.</span>
    </div>

    <div className="state-scheme-card panel">
      <Landmark size={19}/>
      <div>
        <strong>State/UT disability benefits</strong>
        <p>Pensions, travel concessions, education support and local disability-welfare benefits vary by State/UT. myScheme is the Government of India’s official discovery platform for Central and State/UT schemes.</p>
      </div>
      <a className="mini-button" href="https://www.myscheme.gov.in/find-scheme" target="_blank" rel="noreferrer"><ExternalLink size={14}/> Check eligibility</a>
    </div>
  </section>
}

import { useEffect, useMemo, useState } from 'react'
import {
  Ambulance,
  ArrowLeft,
  BadgeIndianRupee,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  Heart,
  HeartPulse,
  Home,
  Hospital,
  Landmark,
  LocateFixed,
  MapPin,
  MoreHorizontal,
  Navigation,
  Phone,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UserRound,
  UsersRound,
  Volume2,
  Wheelchair,
} from 'lucide-react'
import DisabilitySupport from './DisabilitySupport'
import './medical-help-v3.css'

type Category=
  |'hospital'
  |'child_specialist'
  |'therapy'
  |'mental_health'
  |'audiology'
  |'diagnostics'
  |'pharmacy'
  |'assistive'
  |'ambulance'
  |'clinic'
  |'other'

type Ownership='government'|'private'|'unknown'
type CostTier='government'|'likely_public'|'unknown'|'private'
type Filter='all'|Exclude<Category,'other'>|'government'
type Sort='nearest'|'low_cost'|'name'
type Screen='home'|'needs'|'results'|'schemes'|'saved'|'more'|'details'

type Place={
  id:string
  name:string
  category:Category
  lat:number
  lon:number
  distanceKm:number
  address:string
  phone?:string
  website?:string
  ownership:Ownership
  costTier:CostTier
  costReason:string
  serviceLabel:string
  operator?:string
  speciality?:string
}

type SearchOrigin={
  lat:number
  lon:number
  label:string
  source:'device'|'search'
}

type RawElement={
  id?:number|string
  type?:string
  lat?:number
  lon?:number
  center?:{lat?:number;lon?:number}
  tags?:Record<string,string>
}

const MEDICAL_SEARCH_URL='https://cxpsjlevzmodjpwokwyl.supabase.co/functions/v1/medical-location-search'
const EARTH_RADIUS_KM=6371
const radiusOptions=[2,5,10,20,30]

const careNeeds:Array<{
  key:Filter|'schemes'
  title:string
  subtitle:string
  icon:typeof Hospital
  tone:string
}>=[
  {key:'hospital',title:'Hospitals & Emergency',subtitle:'Emergency care and nearby hospitals',icon:Hospital,tone:'red'},
  {key:'child_specialist',title:'Child Specialists',subtitle:'Paediatrics, neurology and developmental care',icon:Stethoscope,tone:'orange'},
  {key:'therapy',title:'Speech / OT / PT Therapy',subtitle:'Speech, occupational and physical therapy',icon:UsersRound,tone:'purple'},
  {key:'mental_health',title:'Psychology & Behaviour',subtitle:'Assessment, counselling and behaviour support',icon:HeartPulse,tone:'pink'},
  {key:'audiology',title:'Audiology & Hearing',subtitle:'Hearing tests, audiology and ENT support',icon:Volume2,tone:'amber'},
  {key:'diagnostics',title:'Diagnostics',subtitle:'Pathology, imaging and diagnostic testing',icon:TestTube2,tone:'blue'},
  {key:'pharmacy',title:'Pharmacy',subtitle:'Medicines and nearby medical stores',icon:Pill,tone:'green'},
  {key:'assistive',title:'Assistive Devices',subtitle:'Mobility, hearing and communication aids',icon:Wheelchair,tone:'indigo'},
  {key:'schemes',title:'Government Support',subtitle:'Schemes, certificates, insurance and education support',icon:Landmark,tone:'gold'},
]

const featuredSchemes=[
  {
    title:'UDID / Disability Certificate',
    summary:'Official disability identity used for many schemes, concessions and benefits.',
    first:'Apply through the UDID portal.',
    href:'https://www.swavlambancard.gov.in/',
    tone:'rose',
    icon:FileCheck2,
  },
  {
    title:'RBSK / Early Intervention',
    summary:'Government screening, referral and early intervention for children from birth to 18.',
    first:'Ask your government health facility or district health team.',
    href:'https://nhm.gov.in/index4.php?lang=1&level=0&lid=773&linkid=499',
    tone:'mint',
    icon:HeartPulse,
  },
  {
    title:'ADIP — Assistive Devices',
    summary:'Government support for eligible assistive devices and appliances.',
    first:'Check eligibility through the ADIP / ARJUN portal.',
    href:'https://adip.depwd.gov.in/',
    tone:'sand',
    icon:Wheelchair,
  },
  {
    title:'Niramaya Health Insurance',
    summary:'Health-insurance support for eligible National Trust disability groups.',
    first:'Check eligibility and current benefits on the official portal.',
    href:'https://nationaltrust.nic.in/niramaya/',
    tone:'sky',
    icon:ShieldCheck,
  },
  {
    title:'Inclusive Education',
    summary:'School-based inclusive education and CWSN support under Samagra Shiksha.',
    first:'Contact the school or local inclusive-education coordinator.',
    href:'https://samagra.education.gov.in/inclusive.html',
    tone:'lavender',
    icon:BookOpen,
  },
  {
    title:'State / UT Schemes',
    summary:'Find pensions, education, health, travel and disability-welfare benefits.',
    first:'Use the Government of India myScheme eligibility finder.',
    href:'https://www.myscheme.gov.in/find-scheme',
    tone:'aqua',
    icon:Landmark,
  },
]

function toRad(value:number){return value*Math.PI/180}
function distanceKm(aLat:number,aLon:number,bLat:number,bLon:number){
  const dLat=toRad(bLat-aLat)
  const dLon=toRad(bLon-aLon)
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2
  return EARTH_RADIUS_KM*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))
}

async function medicalSearch<T>(body:Record<string,unknown>):Promise<T>{
  const response=await fetch(MEDICAL_SEARCH_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body),
  })
  let data:any={}
  try{data=await response.json()}catch{}
  if(!response.ok||data?.error)throw new Error(String(data?.error||'Location service unavailable'))
  return data as T
}

function cleanPhone(tags:Record<string,string>){
  return tags.phone||tags['contact:phone']||tags['contact:mobile']||''
}

function publicNameHint(value:string){
  const name=value.toLowerCase()
  return /government|govt\.?|civil hospital|district hospital|community health centre|community health center|primary health centre|primary health center|\bphc\b|\bchc\b|dispensary|medical college|aiims|pgimer|esi hospital/.test(name)
}

function ownershipFrom(tags:Record<string,string>):Ownership{
  const values=[
    tags['operator:type'],
    tags.ownership,
    tags['healthcare:ownership'],
    tags.operator_type,
  ].filter(Boolean).join(' ').toLowerCase()
  if(/government|public|state|municipal|national/.test(values))return 'government'
  if(/private|commercial/.test(values))return 'private'
  return 'unknown'
}

function categoryFrom(tags:Record<string,string>):Category{
  const amenity=(tags.amenity||'').toLowerCase()
  const healthcare=(tags.healthcare||'').toLowerCase()
  const speciality=(tags['healthcare:speciality']||tags.speciality||'').toLowerCase()
  const shop=(tags.shop||'').toLowerCase()
  const name=(tags.name||tags['name:en']||'').toLowerCase()
  const combined=[healthcare,speciality,name].join(' ')

  if(amenity==='ambulance_station'||healthcare==='ambulance')return 'ambulance'
  if(amenity==='pharmacy'||healthcare==='pharmacy')return 'pharmacy'
  if(shop==='medical_supply'||/assistive|orthotic|prosthetic|wheelchair|medical supply/.test(combined))return 'assistive'
  if(/laboratory|diagnostic|pathology|radiology/.test(combined))return 'diagnostics'
  if(/audiolog|hearing|ent/.test(combined))return 'audiology'
  if(/psycholog|psychiatr|mental_health|psychotherap|counsell/.test(combined))return 'mental_health'
  if(/speech|occupational|physiotherap|rehabilitation|therapy|therapist|rehab/.test(combined))return 'therapy'
  if(/paediatric|pediatric|developmental|child development|child specialist|neurolog/.test(combined))return 'child_specialist'
  if(amenity==='hospital'||healthcare==='hospital')return 'hospital'
  if(amenity==='clinic'||amenity==='doctors'||healthcare==='clinic'||healthcare==='doctor')return 'clinic'
  return 'other'
}

function categoryLabel(category:Category){
  if(category==='hospital')return 'Hospital'
  if(category==='child_specialist')return 'Child / developmental specialist'
  if(category==='therapy')return 'Therapy / rehabilitation'
  if(category==='mental_health')return 'Psychology / mental health'
  if(category==='audiology')return 'Audiology / hearing'
  if(category==='diagnostics')return 'Diagnostics / laboratory'
  if(category==='pharmacy')return 'Pharmacy'
  if(category==='assistive')return 'Assistive / medical supplies'
  if(category==='ambulance')return 'Ambulance service'
  if(category==='clinic')return 'Clinic / doctor'
  return 'Healthcare service'
}

function categoryIcon(category:Category){
  if(category==='hospital')return Hospital
  if(category==='child_specialist'||category==='clinic')return Stethoscope
  if(category==='therapy')return UsersRound
  if(category==='mental_health')return HeartPulse
  if(category==='audiology')return Volume2
  if(category==='diagnostics')return TestTube2
  if(category==='pharmacy')return Pill
  if(category==='assistive')return Wheelchair
  if(category==='ambulance')return Ambulance
  return Building2
}

function addressFrom(tags:Record<string,string>){
  const full=tags['addr:full']
  if(full)return full
  const parts=[
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:district'],
    tags['addr:state'],
  ].filter(Boolean)
  return parts.join(', ')||tags['contact:address']||'Address not listed in map data'
}

function costInfo(name:string,ownership:Ownership):{tier:CostTier;reason:string}{
  if(ownership==='government')return {
    tier:'government',
    reason:'Government/public facility — check here first for subsidised or lower-cost care.',
  }
  if(ownership==='private')return {
    tier:'private',
    reason:'Private provider — call to confirm current consultation or therapy fees.',
  }
  if(publicNameHint(name))return {
    tier:'likely_public',
    reason:'Facility name suggests public/government care; confirm ownership and current charges.',
  }
  return {
    tier:'unknown',
    reason:'Fees are not published by the map source — call before visiting.',
  }
}

function costRank(value:CostTier){
  if(value==='government')return 0
  if(value==='likely_public')return 1
  if(value==='unknown')return 2
  return 3
}

function costLabel(value:CostTier){
  if(value==='government')return 'Low-cost / public'
  if(value==='likely_public')return 'Likely low-cost'
  if(value==='private')return 'Private'
  return 'Cost not listed'
}

function ownershipLabel(value:Ownership){
  if(value==='government')return 'Government'
  if(value==='private')return 'Private'
  return 'Not listed'
}

function mapsUrl(place:Place){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.lat+','+place.lon)}`
}

function shortLocation(label:string){
  const bits=label.split(',').map(x=>x.trim()).filter(Boolean)
  return bits.slice(0,3).join(', ')||label
}

function readSaved():Place[]{
  try{return JSON.parse(localStorage.getItem('antar-medical-saved')||'[]')}catch{return []}
}

export default function MedicalHelp(){
  const [screen,setScreen]=useState<Screen>('home')
  const [previousScreen,setPreviousScreen]=useState<Screen>('results')
  const [origin,setOrigin]=useState<SearchOrigin|null>(null)
  const [area,setArea]=useState('')
  const [showAreaSearch,setShowAreaSearch]=useState(false)
  const [radius,setRadius]=useState(5)
  const [places,setPlaces]=useState<Place[]>([])
  const [filter,setFilter]=useState<Filter>('all')
  const [sort,setSort]=useState<Sort>('low_cost')
  const [resultSearch,setResultSearch]=useState('')
  const [needSearch,setNeedSearch]=useState('')
  const [status,setStatus]=useState('Choose your current location or search another area.')
  const [loading,setLoading]=useState(false)
  const [locationState,setLocationState]=useState<'idle'|'requesting'|'ready'|'blocked'|'error'>('idle')
  const [saved,setSaved]=useState<Place[]>(readSaved)
  const [selectedPlace,setSelectedPlace]=useState<Place|null>(null)
  const [showAllSchemes,setShowAllSchemes]=useState(false)
  const [schemeDocs,setSchemeDocs]=useState<string[]>(()=>{
    try{return JSON.parse(localStorage.getItem('antar-scheme-docs-quick')||'[]')}catch{return []}
  })

  useEffect(()=>{
    if(!navigator.permissions?.query)return
    navigator.permissions.query({name:'geolocation'} as PermissionDescriptor)
      .then(permission=>{
        if(permission.state==='granted')void requestCurrentLocation(false)
      })
      .catch(()=>{})
  },[])

  const counts=useMemo(()=>({
    all:places.length,
    hospital:places.filter(x=>x.category==='hospital').length,
    child_specialist:places.filter(x=>x.category==='child_specialist'||x.category==='clinic').length,
    therapy:places.filter(x=>x.category==='therapy').length,
    mental_health:places.filter(x=>x.category==='mental_health').length,
    audiology:places.filter(x=>x.category==='audiology').length,
    diagnostics:places.filter(x=>x.category==='diagnostics').length,
    pharmacy:places.filter(x=>x.category==='pharmacy').length,
    assistive:places.filter(x=>x.category==='assistive').length,
    government:places.filter(x=>x.costTier==='government'||x.costTier==='likely_public').length,
  }),[places])

  const filteredPlaces=useMemo(()=>{
    const q=resultSearch.trim().toLowerCase()
    const next=places.filter(place=>{
      const categoryMatches=
        filter==='all'
        ||(filter==='government'&&(place.costTier==='government'||place.costTier==='likely_public'))
        ||(filter==='child_specialist'&&(place.category==='child_specialist'||place.category==='clinic'))
        ||place.category===filter
      if(!categoryMatches)return false
      if(!q)return true
      return [place.name,place.serviceLabel,place.address,place.speciality,place.operator]
        .filter(Boolean)
        .some(value=>String(value).toLowerCase().includes(q))
    })
    return [...next].sort((a,b)=>{
      if(sort==='nearest')return a.distanceKm-b.distanceKm
      if(sort==='low_cost')return costRank(a.costTier)-costRank(b.costTier)||a.distanceKm-b.distanceKm
      return a.name.localeCompare(b.name)
    })
  },[places,filter,sort,resultSearch])

  const recommended=useMemo(()=>[...places]
    .sort((a,b)=>costRank(a.costTier)-costRank(b.costTier)||a.distanceKm-b.distanceKm)
    .slice(0,2),[places])

  const filteredNeeds=useMemo(()=>{
    const q=needSearch.trim().toLowerCase()
    if(!q)return careNeeds
    return careNeeds.filter(item=>(item.title+' '+item.subtitle).toLowerCase().includes(q))
  },[needSearch])

  async function geocodeArea(){
    const query=area.trim()
    if(!query)return setStatus('Enter a city, locality, sector or PIN code first.')
    setLoading(true)
    setLocationState('requesting')
    setStatus('Finding that area…')
    try{
      const data=await medicalSearch<{results:Array<{lat:number;lon:number;label:string}>}>({mode:'geocode',query})
      const match=data.results?.[0]
      if(!match){
        setLocationState('error')
        setStatus('That area could not be found. Try a more specific locality or PIN code.')
        setLoading(false)
        return
      }
      const next:SearchOrigin={lat:match.lat,lon:match.lon,label:match.label,source:'search'}
      setOrigin(next)
      setArea(shortLocation(match.label))
      setLocationState('ready')
      await searchNearby(next,radius)
      setShowAreaSearch(false)
      setScreen('needs')
    }catch(error){
      setLocationState('error')
      setStatus(error instanceof Error?`Search failed: ${error.message}`:'Area search failed. Please try again.')
      setLoading(false)
    }
  }

  async function requestCurrentLocation(goNext=true){
    if(!window.isSecureContext){
      setLocationState('error')
      setStatus('Current location needs a secure HTTPS connection. Search another area instead.')
      return
    }
    if(!navigator.geolocation){
      setLocationState('error')
      setStatus('This browser does not support current location. Search another area instead.')
      return
    }

    setLoading(true)
    setLocationState('requesting')
    setStatus('Detecting your current location…')

    navigator.geolocation.getCurrentPosition(async position=>{
      const lat=position.coords.latitude
      const lon=position.coords.longitude
      let label='Your current location'
      try{
        const reverse=await medicalSearch<{label?:string}>({mode:'reverse',lat,lon})
        if(reverse.label)label=reverse.label
      }catch{}

      const next:SearchOrigin={lat,lon,label,source:'device'}
      setOrigin(next)
      setArea(shortLocation(label))
      setLocationState('ready')
      await searchNearby(next,radius)
      if(goNext)setScreen('needs')
    },error=>{
      setLoading(false)
      if(error.code===1){
        setLocationState('blocked')
        setStatus('Location is blocked. Allow Location for this site, or search another area.')
      }else if(error.code===2){
        setLocationState('error')
        setStatus('Your device could not determine its location. Search another area instead.')
      }else if(error.code===3){
        setLocationState('error')
        setStatus('Location timed out. Try again or search another area.')
      }else{
        setLocationState('error')
        setStatus('Location could not be read. Search another area instead.')
      }
    },{enableHighAccuracy:true,timeout:18000,maximumAge:120000})
  }

  async function searchNearby(searchOrigin:SearchOrigin,searchRadius:number){
    setLoading(true)
    setStatus('Finding nearby healthcare…')
    let raw:RawElement[]=[]
    try{
      const data=await medicalSearch<{elements:RawElement[]}>({
        mode:'nearby',
        lat:searchOrigin.lat,
        lon:searchOrigin.lon,
        radiusKm:searchRadius,
      })
      raw=Array.isArray(data.elements)?data.elements:[]
    }catch(error){
      setLoading(false)
      setStatus(error instanceof Error?`Nearby search failed: ${error.message}`:'Nearby search is temporarily unavailable.')
      return
    }

    const seen=new Set<string>()
    const normalized:Place[]=[]
    for(const item of raw){
      const itemLat=Number(item.lat??item.center?.lat)
      const itemLon=Number(item.lon??item.center?.lon)
      if(!Number.isFinite(itemLat)||!Number.isFinite(itemLon))continue
      const tags=item.tags||{}
      const category=categoryFrom(tags)
      if(category==='other')continue
      const name=tags.name||tags['name:en']||categoryLabel(category)
      const fingerprint=(name+'|'+itemLat.toFixed(4)+'|'+itemLon.toFixed(4)).toLowerCase()
      if(seen.has(fingerprint))continue
      seen.add(fingerprint)
      const ownership=ownershipFrom(tags)
      const cost=costInfo(name,ownership)
      normalized.push({
        id:String(item.type||'place')+'-'+String(item.id||fingerprint),
        name,
        category,
        lat:itemLat,
        lon:itemLon,
        distanceKm:distanceKm(searchOrigin.lat,searchOrigin.lon,itemLat,itemLon),
        address:addressFrom(tags),
        phone:cleanPhone(tags)||undefined,
        website:tags.website||tags['contact:website']||undefined,
        ownership,
        costTier:cost.tier,
        costReason:cost.reason,
        serviceLabel:categoryLabel(category),
        operator:tags.operator||undefined,
        speciality:tags['healthcare:speciality']||tags.speciality||undefined,
      })
    }
    normalized.sort((a,b)=>costRank(a.costTier)-costRank(b.costTier)||a.distanceKm-b.distanceKm)
    setPlaces(normalized)
    setLoading(false)
    setStatus(normalized.length
      ?`${normalized.length} nearby services found. Government and likely lower-cost options are prioritised.`
      :`No mapped services were found within ${searchRadius} km. Try a larger radius.`
    )
  }

  async function changeRadius(next:number){
    setRadius(next)
    if(origin)await searchNearby(origin,next)
  }

  function chooseNeed(key:Filter|'schemes'){
    if(key==='schemes'){
      setScreen('schemes')
      return
    }
    setFilter(key)
    setResultSearch('')
    setSort(key==='government'?'low_cost':'nearest')
    if(!origin){
      setScreen('home')
      setStatus('Choose a location first, then select the care you need.')
      return
    }
    setScreen('results')
  }

  function openDetails(place:Place){
    setPreviousScreen(screen)
    setSelectedPlace(place)
    setScreen('details')
  }

  function toggleSaved(place:Place){
    setSaved(current=>{
      const exists=current.some(item=>item.id===place.id)
      const next=exists?current.filter(item=>item.id!==place.id):[place,...current]
      try{localStorage.setItem('antar-medical-saved',JSON.stringify(next))}catch{}
      return next
    })
  }

  function toggleSchemeDoc(id:string){
    setSchemeDocs(current=>{
      const next=current.includes(id)?current.filter(x=>x!==id):[...current,id]
      try{localStorage.setItem('antar-scheme-docs-quick',JSON.stringify(next))}catch{}
      return next
    })
  }

  function goBack(){
    if(screen==='details'){setScreen(previousScreen);return}
    if(screen==='results'){setScreen('needs');return}
    if(screen==='needs'||screen==='schemes'||screen==='saved'||screen==='more'){setScreen('home');return}
  }

  const showBack=screen!=='home'

  return <div className="mh3">
    <header className="mh3-appbar">
      <div className="mh3-appbar-left">
        {showBack
          ?<button className="mh3-icon-btn" onClick={goBack} aria-label="Back"><ArrowLeft size={21}/></button>
          :<span className="mh3-brandmark"><HeartPulse size={21}/></span>}
        <div className="mh3-brand"><strong>ANTAR</strong><small>Parent Portal · Medical Help</small></div>
      </div>
      <div className="mh3-appbar-actions"><Bell size={18}/><span className="mh3-avatar"><UserRound size={17}/></span></div>
    </header>

    {screen==='home'&&<main className="mh3-screen mh3-home">
      <section className="mh3-hero">
        <div className="mh3-hero-copy">
          <span className="mh3-kicker">Care made easier</span>
          <h1>Medical Help<br/>Near Me</h1>
          <p>Find the nearest and lowest-cost medical, therapy and disability support for your child.</p>
        </div>
        <div className="mh3-hero-art" aria-hidden="true">
          <span className="mh3-art-big"><HeartPulse size={38}/></span>
          <span className="mh3-art-small"><UsersRound size={24}/></span>
          <span className="mh3-art-heart"><Heart size={18}/></span>
        </div>
      </section>

      <section className="mh3-card mh3-location-card">
        <div className="mh3-location-row">
          <span className={`mh3-location-icon ${locationState}`}><MapPin size={21}/></span>
          <div>
            <small>{origin?'YOUR LOCATION':'SET YOUR LOCATION'}</small>
            <strong>{origin?shortLocation(origin.label):'Use your current location'}</strong>
            <p>{loading?'Finding nearby services…':status}</p>
          </div>
          {origin&&<button className="mh3-link" onClick={()=>setShowAreaSearch(v=>!v)}>Edit</button>}
        </div>

        <button className="mh3-primary mh3-location-primary" onClick={()=>void requestCurrentLocation(true)} disabled={loading}>
          <LocateFixed size={18}/>{loading&&locationState==='requesting'?'Detecting location…':'Use current location'}
        </button>
        <button className="mh3-secondary" onClick={()=>setShowAreaSearch(v=>!v)}><Search size={17}/> Search another area</button>

        {showAreaSearch&&<div className="mh3-area-search">
          <label><Search size={16}/><input value={area} onChange={e=>setArea(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void geocodeArea()}} placeholder="City, locality, sector or PIN code"/></label>
          <button className="mh3-primary" onClick={()=>void geocodeArea()} disabled={loading||!area.trim()}>Search</button>
        </div>}

        {locationState==='blocked'&&<div className="mh3-inline-warning"><ShieldCheck size={16}/><span>Location permission is blocked. Allow Location for this site, then try again — or search another area.</span></div>}

        {origin&&<button className="mh3-continue" onClick={()=>setScreen('needs')}>Choose what your child needs <ChevronRight size={17}/></button>}
      </section>

      <section className="mh3-emergency">
        <div className="mh3-section-title red"><span><Ambulance size={18}/></span><div><strong>Need urgent help?</strong><small>In an emergency, call immediately.</small></div></div>
        <div className="mh3-emergency-grid">
          <a href="tel:112"><Phone size={24}/><strong>112</strong><small>All emergencies</small></a>
          <a href="tel:108" className="blue"><Phone size={24}/><strong>108</strong><small>Ambulance where supported</small></a>
        </div>
      </section>

      <section className="mh3-privacy"><ShieldCheck size={20}/><div><strong>Your location stays private</strong><p>ANTAR uses it only to find nearby services. It is not saved in your child record.</p></div></section>
    </main>}

    {screen==='needs'&&<main className="mh3-screen">
      <section className="mh3-screen-heading">
        <span className="mh3-kicker">Step 2</span>
        <h1>Choose What Your Child Needs</h1>
        <p>Select a category to find the right support near you.</p>
      </section>

      <label className="mh3-search"><Search size={17}/><input value={needSearch} onChange={e=>setNeedSearch(e.target.value)} placeholder="Search hospitals, therapy, pharmacy…"/></label>

      <div className="mh3-radius-block">
        <strong>Search within</strong>
        <div className="mh3-radius-chips">
          {radiusOptions.map(km=><button key={km} className={radius===km?'active':''} onClick={()=>void changeRadius(km)}>{km} km</button>)}
        </div>
      </div>

      {origin&&<button className="mh3-location-strip" onClick={()=>setScreen('home')}><MapPin size={15}/><span>{shortLocation(origin.label)}</span><small>Edit</small></button>}

      <section className="mh3-needs-grid">
        {filteredNeeds.map(item=>{
          const Icon=item.icon
          return <button key={item.key} className={`mh3-need-card ${item.tone}`} onClick={()=>chooseNeed(item.key)}>
            <span className="mh3-need-icon"><Icon size={22}/></span>
            <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
            <ChevronRight size={17}/>
          </button>
        })}
      </section>
    </main>}

    {screen==='results'&&<main className="mh3-screen">
      <button className="mh3-location-strip results" onClick={()=>setScreen('home')}>
        <MapPin size={15}/><span>{origin?shortLocation(origin.label):'Choose location'}</span><small>{radius} km radius · Edit</small>
      </button>

      <section className="mh3-lowcost-banner">
        <span>🏆</span><div><strong>Best low-cost options nearby</strong><p>Government and likely lower-cost services are prioritised first.</p></div>
      </section>

      <label className="mh3-search compact"><Search size={16}/><input value={resultSearch} onChange={e=>setResultSearch(e.target.value)} placeholder="Search within results"/></label>

      <div className="mh3-filter-scroll">
        {([
          ['all','All',counts.all],
          ['government','Government',counts.government],
          ['therapy','Therapy',counts.therapy],
          ['hospital','Hospital',counts.hospital],
          ['child_specialist','Child specialist',counts.child_specialist],
          ['pharmacy','Pharmacy',counts.pharmacy],
        ] as Array<[Filter,string,number]>).map(([value,label,count])=><button key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}<span>{count}</span></button>)}
      </div>

      <div className="mh3-results-toolbar">
        <strong>{filteredPlaces.length} options</strong>
        <select value={sort} onChange={e=>setSort(e.target.value as Sort)}>
          <option value="low_cost">Lowest-cost likely</option>
          <option value="nearest">Nearest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {recommended.length>0&&filter==='all'&&!resultSearch&&<section className="mh3-recommended">
        <div className="mh3-section-title green"><span>♛</span><div><strong>Recommended low-cost picks</strong><small>Government/public first, then the nearest alternatives.</small></div></div>
        <div className="mh3-provider-list">
          {recommended.map(place=><ProviderCard key={place.id} place={place} saved={saved.some(x=>x.id===place.id)} onSave={()=>toggleSaved(place)} onDetails={()=>openDetails(place)}/>)}
        </div>
      </section>}

      <section className="mh3-provider-list">
        {(filter==='all'&&!resultSearch?filteredPlaces.slice(recommended.length):filteredPlaces).map(place=><ProviderCard key={place.id} place={place} saved={saved.some(x=>x.id===place.id)} onSave={()=>toggleSaved(place)} onDetails={()=>openDetails(place)}/>)}
      </section>

      {!loading&&!filteredPlaces.length&&<div className="mh3-empty"><Search size={26}/><strong>No matching services found</strong><p>Try another category, increase the radius, or search a nearby area.</p><button className="mh3-secondary" onClick={()=>setScreen('needs')}>Choose another need</button></div>}
    </main>}

    {screen==='details'&&selectedPlace&&<main className="mh3-screen">
      <section className="mh3-detail-hero">
        <span className="mh3-detail-icon">{(() => {const Icon=categoryIcon(selectedPlace.category);return <Icon size={34}/>})()}</span>
        <div><span className="mh3-kicker">{selectedPlace.serviceLabel}</span><h1>{selectedPlace.name}</h1><p>{selectedPlace.distanceKm.toFixed(1)} km away · {selectedPlace.address}</p></div>
        <button className={`mh3-save-round ${saved.some(x=>x.id===selectedPlace.id)?'saved':''}`} onClick={()=>toggleSaved(selectedPlace)}><Heart size={18}/></button>
      </section>

      <section className="mh3-detail-tags">
        <span className={`cost ${selectedPlace.costTier}`}><BadgeIndianRupee size={14}/>{costLabel(selectedPlace.costTier)}</span>
        <span><Building2 size={14}/>{ownershipLabel(selectedPlace.ownership)}</span>
        {selectedPlace.speciality&&<span><Stethoscope size={14}/>{selectedPlace.speciality.replaceAll(';',', ')}</span>}
      </section>

      <section className="mh3-card mh3-detail-card">
        <h2>Before you visit</h2>
        <div><small>Cost guidance</small><strong>{selectedPlace.costReason}</strong></div>
        <div><small>Address</small><strong>{selectedPlace.address}</strong></div>
        {selectedPlace.operator&&<div><small>Operator</small><strong>{selectedPlace.operator}</strong></div>}
        <p>Call the provider to confirm services, fees, opening hours and appointment availability.</p>
      </section>

      <div className="mh3-detail-actions">
        {selectedPlace.phone?<a className="mh3-primary" href={'tel:'+selectedPlace.phone}><Phone size={17}/> Call</a>:<button className="mh3-secondary" disabled><Phone size={17}/> Phone not listed</button>}
        <a className="mh3-secondary" href={mapsUrl(selectedPlace)} target="_blank" rel="noreferrer"><Navigation size={17}/> Directions</a>
        {selectedPlace.website&&<a className="mh3-secondary" href={selectedPlace.website} target="_blank" rel="noreferrer"><ExternalLink size={17}/> Website</a>}
      </div>
    </main>}

    {screen==='schemes'&&<main className="mh3-screen">
      <section className="mh3-screen-heading">
        <span className="mh3-kicker">Government support</span>
        <h1>Government Schemes & Support</h1>
        <p>Explore official disability, healthcare, assistive-device and education support.</p>
      </section>

      <section className="mh3-scheme-grid">
        {featuredSchemes.map(item=>{
          const Icon=item.icon
          return <article key={item.title} className={`mh3-scheme-card ${item.tone}`}>
            <div className="mh3-scheme-head"><span><Icon size={19}/></span><strong>{item.title}</strong><ChevronRight size={16}/></div>
            <p>{item.summary}</p>
            <small><b>First step:</b> {item.first}</small>
            <a href={item.href} target="_blank" rel="noreferrer">Open official info <ExternalLink size={13}/></a>
          </article>
        })}
      </section>

      <section className="mh3-docs-card">
        <div className="mh3-section-title blue"><span><FileCheck2 size={18}/></span><div><strong>Documents to keep ready</strong><small>Keep common documents ready while applying for schemes.</small></div></div>
        <div className="mh3-doc-checks">
          {[
            ['aadhaar','Child Aadhaar / enrolment'],
            ['udid','UDID / disability certificate'],
            ['photo','Recent passport-size photo'],
            ['parent','Parent / guardian ID proof'],
            ['address','Address proof'],
            ['medical','Medical / therapy reports'],
          ].map(([id,label])=><label key={id} className={schemeDocs.includes(id)?'checked':''}><input type="checkbox" checked={schemeDocs.includes(id)} onChange={()=>toggleSchemeDoc(id)}/><CheckCircle2 size={15}/><span>{label}</span></label>)}
        </div>
      </section>

      <button className="mh3-expand-support" onClick={()=>setShowAllSchemes(v=>!v)}>{showAllSchemes?'Hide detailed scheme guide':'View detailed scheme guide'} <ChevronRight size={15}/></button>
      {showAllSchemes&&<DisabilitySupport onShowGovernment={()=>{setFilter('government');setScreen('results')}} onShowTherapy={()=>{setFilter('therapy');setScreen('results')}}/>}
    </main>}

    {screen==='saved'&&<main className="mh3-screen">
      <section className="mh3-screen-heading"><span className="mh3-kicker">Saved care</span><h1>Saved Places</h1><p>Keep useful providers together so you can find them again quickly.</p></section>
      {saved.length?<section className="mh3-provider-list">{saved.map(place=><ProviderCard key={place.id} place={place} saved onSave={()=>toggleSaved(place)} onDetails={()=>openDetails(place)}/>)}</section>:<div className="mh3-empty"><Heart size={27}/><strong>No saved places yet</strong><p>Tap the heart on a healthcare result to save it here.</p><button className="mh3-primary" onClick={()=>setScreen(origin?'results':'home')}>Find care</button></div>}
    </main>}

    {screen==='more'&&<main className="mh3-screen">
      <section className="mh3-screen-heading"><span className="mh3-kicker">Medical help</span><h1>More Support</h1><p>Quick access to emergency, privacy and location controls.</p></section>
      <section className="mh3-more-grid">
        <button onClick={()=>setScreen('home')}><MapPin size={21}/><span><strong>Location</strong><small>Update where ANTAR searches</small></span><ChevronRight size={16}/></button>
        <button onClick={()=>setScreen('schemes')}><Landmark size={21}/><span><strong>Government schemes</strong><small>Disability benefits and support</small></span><ChevronRight size={16}/></button>
        <a href="tel:112"><Ambulance size={21}/><span><strong>Emergency 112</strong><small>National emergency number</small></span><ChevronRight size={16}/></a>
        <button onClick={()=>setShowAreaSearch(true)}><ShieldCheck size={21}/><span><strong>Privacy</strong><small>Location is used for search only</small></span><ChevronRight size={16}/></button>
      </section>
      <section className="mh3-privacy large"><ShieldCheck size={21}/><div><strong>Location privacy</strong><p>Your coordinates are sent only to ANTAR’s map-search backend to find nearby services. They are not stored in your child record.</p></div></section>
    </main>}

    <nav className="mh3-bottom-nav" aria-label="Medical help navigation">
      <button className={screen==='home'?'active':''} onClick={()=>setScreen('home')}><Home size={19}/><span>Home</span></button>
      <button className={screen==='needs'||screen==='results'||screen==='details'?'active':''} onClick={()=>setScreen(origin?'needs':'home')}><Search size={19}/><span>Search</span></button>
      <button className={screen==='saved'?'active':''} onClick={()=>setScreen('saved')}><Heart size={19}/><span>Saved</span></button>
      <button className={screen==='schemes'?'active':''} onClick={()=>setScreen('schemes')}><BookOpen size={19}/><span>Schemes</span></button>
      <button className={screen==='more'?'active':''} onClick={()=>setScreen('more')}><MoreHorizontal size={19}/><span>More</span></button>
    </nav>
  </div>
}

function ProviderCard({place,saved,onSave,onDetails}:{place:Place;saved:boolean;onSave:()=>void;onDetails:()=>void}){
  const Icon=categoryIcon(place.category)
  return <article className="mh3-provider">
    <div className="mh3-provider-top">
      <span className="mh3-provider-thumb"><Icon size={26}/></span>
      <div className="mh3-provider-main">
        <div className="mh3-provider-title"><strong>{place.name}</strong><span className={`mh3-owner ${place.ownership}`}>{ownershipLabel(place.ownership)}</span></div>
        <small>{place.serviceLabel}</small>
        <div className="mh3-provider-meta"><span><MapPin size={12}/>{place.distanceKm.toFixed(1)} km</span>{place.speciality&&<span><Stethoscope size={12}/>{place.speciality.replaceAll(';',', ')}</span>}</div>
      </div>
      <button className={`mh3-save-round ${saved?'saved':''}`} onClick={onSave} aria-label={saved?'Remove from saved':'Save place'}><Heart size={17}/></button>
    </div>

    <div className="mh3-provider-badges">
      <span className={`cost ${place.costTier}`}><BadgeIndianRupee size={12}/>{costLabel(place.costTier)}</span>
      {(place.category==='child_specialist'||place.category==='therapy'||place.category==='mental_health')&&<span className="care"><HeartPulse size={12}/>Specialist care</span>}
    </div>

    <p className="mh3-provider-address"><MapPin size={13}/>{place.address}</p>

    <div className="mh3-provider-actions">
      {place.phone?<a href={'tel:'+place.phone}><Phone size={15}/>Call</a>:<button disabled><Phone size={15}/>Call</button>}
      <a href={mapsUrl(place)} target="_blank" rel="noreferrer"><Navigation size={15}/>Directions</a>
      <button className="primary" onClick={onDetails}>View Details</button>
    </div>
  </article>
}

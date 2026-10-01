import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Ambulance,
  BadgeIndianRupee,
  Building2,
  ChevronDown,
  ExternalLink,
  HeartPulse,
  Hospital,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Pill,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UsersRound,
  Volume2,
} from 'lucide-react'
import DisabilitySupport from './DisabilitySupport'

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
const radiusOptions=[5,10,20,30]

const careNeeds:Array<{
  key:Filter
  title:string
  subtitle:string
  query:string
  icon:typeof Hospital
}>=[
  {key:'hospital',title:'Hospital & emergency',subtitle:'Hospitals and emergency care',query:'hospital emergency',icon:Hospital},
  {key:'child_specialist',title:'Child & developmental care',subtitle:'Paediatrics, neurology and developmental clinics',query:'pediatric developmental child specialist',icon:Stethoscope},
  {key:'therapy',title:'Therapy & rehabilitation',subtitle:'Speech, occupational and physiotherapy',query:'speech occupational physiotherapy rehabilitation',icon:UsersRound},
  {key:'mental_health',title:'Psychology & behaviour',subtitle:'Psychology, psychiatry and counselling',query:'child psychologist psychiatrist mental health',icon:HeartPulse},
  {key:'audiology',title:'Hearing & audiology',subtitle:'Audiology and hearing services',query:'audiology hearing clinic',icon:Volume2},
  {key:'diagnostics',title:'Diagnostics',subtitle:'Labs and diagnostic testing',query:'diagnostic laboratory pathology',icon:TestTube2},
  {key:'pharmacy',title:'Medicines',subtitle:'Nearby pharmacies',query:'pharmacy medical store',icon:Pill},
  {key:'assistive',title:'Assistive devices',subtitle:'Medical and assistive supplies',query:'medical supply assistive devices',icon:Building2},
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
    reason:'Government/public facility — usually the first place to check for subsidised or lower-cost care. Confirm current charges.',
  }
  if(ownership==='private')return {
    tier:'private',
    reason:'Private provider — fees are not published by the map source. Call before visiting.',
  }
  if(publicNameHint(name))return {
    tier:'likely_public',
    reason:'This facility name suggests a public/government service, but ownership is not explicitly tagged. Confirm before visiting.',
  }
  return {
    tier:'unknown',
    reason:'Fees and ownership are not published by the map source. Call to confirm charges.',
  }
}

function ownershipLabel(value:Ownership){
  if(value==='government')return 'Government / public'
  if(value==='private')return 'Private'
  return 'Ownership not listed'
}

function mapsUrl(place:Place){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.lat+','+place.lon)}`
}

function mapsNeedUrl(query:string,origin:SearchOrigin|null){
  const location=origin?` near ${origin.lat},${origin.lon}`:''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query+location)}`
}

function costRank(value:CostTier){
  if(value==='government')return 0
  if(value==='likely_public')return 1
  if(value==='unknown')return 2
  return 3
}

export default function MedicalHelp(){
  const [origin,setOrigin]=useState<SearchOrigin|null>(null)
  const [area,setArea]=useState('')
  const [radius,setRadius]=useState(10)
  const [places,setPlaces]=useState<Place[]>([])
  const [filter,setFilter]=useState<Filter>('all')
  const [sort,setSort]=useState<Sort>('low_cost')
  const [status,setStatus]=useState('Finding your current location…')
  const [loading,setLoading]=useState(false)
  const [showPrivacy,setShowPrivacy]=useState(false)
  const [locationState,setLocationState]=useState<'idle'|'requesting'|'ready'|'blocked'|'error'>('idle')
  const autoTried=useRef(false)

  useEffect(()=>{
    if(autoTried.current)return
    autoTried.current=true
    const timer=window.setTimeout(()=>void useLocation(true),350)
    return()=>window.clearTimeout(timer)
  },[])

  const filtered=useMemo(()=>{
    const next=places.filter(place=>{
      if(filter==='all')return true
      if(filter==='government')return place.costTier==='government'||place.costTier==='likely_public'
      return place.category===filter
    })
    return [...next].sort((a,b)=>{
      if(sort==='nearest')return a.distanceKm-b.distanceKm
      if(sort==='low_cost')return costRank(a.costTier)-costRank(b.costTier)||a.distanceKm-b.distanceKm
      return a.name.localeCompare(b.name)
    })
  },[places,filter,sort])

  const counts=useMemo(()=>({
    all:places.length,
    hospital:places.filter(x=>x.category==='hospital').length,
    child_specialist:places.filter(x=>x.category==='child_specialist').length,
    therapy:places.filter(x=>x.category==='therapy').length,
    mental_health:places.filter(x=>x.category==='mental_health').length,
    audiology:places.filter(x=>x.category==='audiology').length,
    diagnostics:places.filter(x=>x.category==='diagnostics').length,
    pharmacy:places.filter(x=>x.category==='pharmacy').length,
    assistive:places.filter(x=>x.category==='assistive').length,
    ambulance:places.filter(x=>x.category==='ambulance').length,
    clinic:places.filter(x=>x.category==='clinic').length,
    government:places.filter(x=>x.costTier==='government'||x.costTier==='likely_public').length,
  }),[places])

  const lowCostTop=useMemo(()=>[...places].sort((a,b)=>
    costRank(a.costTier)-costRank(b.costTier)||a.distanceKm-b.distanceKm
  ).slice(0,6),[places])

  async function geocodeArea(){
    const query=area.trim()
    if(!query)return setStatus('Enter a city, locality or PIN code first.')
    setLoading(true)
    setLocationState('requesting')
    setStatus('Finding that area…')
    try{
      const data=await medicalSearch<{results:Array<{lat:number;lon:number;label:string}>}>({
        mode:'geocode',
        query,
      })
      const match=data.results?.[0]
      if(!match){
        setLocationState('error')
        setStatus('That area could not be found. Try a more specific locality, city or PIN code.')
        setLoading(false)
        return
      }
      const next:SearchOrigin={lat:match.lat,lon:match.lon,label:match.label,source:'search'}
      setOrigin(next)
      setArea(match.label)
      setLocationState('ready')
      await searchNearby(next,radius)
    }catch(error){
      setLocationState('error')
      setStatus(error instanceof Error?`Search failed: ${error.message}`:'Area search failed. Please try again.')
      setLoading(false)
    }
  }

  async function useLocation(auto=false){
    if(!window.isSecureContext){
      setLocationState('error')
      setStatus('Current location needs HTTPS. You can still search by city, locality or PIN code.')
      return
    }
    if(!navigator.geolocation){
      setLocationState('error')
      setStatus('This browser does not support device location. Search by area instead.')
      return
    }

    setLoading(true)
    setLocationState('requesting')
    setStatus(auto?'Detecting your current location…':'Requesting your current location…')

    navigator.geolocation.getCurrentPosition(async position=>{
      const lat=position.coords.latitude
      const lon=position.coords.longitude
      let label='Current location'

      try{
        const reverse=await medicalSearch<{label?:string}>({mode:'reverse',lat,lon})
        if(reverse.label)label=reverse.label
      }catch{}

      const next:SearchOrigin={lat,lon,label,source:'device'}
      setOrigin(next)
      setLocationState('ready')
      setArea(label)
      await searchNearby(next,radius)
    },error=>{
      setLoading(false)
      if(error.code===1){
        setLocationState('blocked')
        setStatus('Location permission is blocked. Allow location for this site, then tap “Use current location” — or search by city/PIN.')
      }else if(error.code===2){
        setLocationState('error')
        setStatus('Your device could not find its location. Turn on location services or search by city/PIN.')
      }else if(error.code===3){
        setLocationState('error')
        setStatus('Location timed out. Tap “Use current location” again or search by city/PIN.')
      }else{
        setLocationState('error')
        setStatus('Current location could not be read. Search by city, locality or PIN code instead.')
      }
    },{enableHighAccuracy:true,timeout:18000,maximumAge:120000})
  }

  async function rerun(nextRadius=radius){
    if(!origin)return void useLocation(false)
    await searchNearby(origin,nextRadius)
  }

  async function searchNearby(searchOrigin:SearchOrigin,searchRadius:number){
    setLoading(true)
    setStatus('Finding the nearest low-cost care options around you…')
    const {lat,lon}=searchOrigin

    let raw:RawElement[]=[]
    try{
      const data=await medicalSearch<{elements:RawElement[]}>({
        mode:'nearby',
        lat,
        lon,
        radiusKm:searchRadius,
      })
      raw=Array.isArray(data.elements)?data.elements:[]
    }catch(error){
      setLoading(false)
      setStatus(error instanceof Error
        ?`Nearby search failed: ${error.message}`
        :'Nearby healthcare search is temporarily unavailable.')
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
        distanceKm:distanceKm(lat,lon,itemLat,itemLon),
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
      ?`${normalized.length} nearby options found around ${searchOrigin.label}. Government/likely public options are shown first.`
      :`No mapped services were found within ${searchRadius} km. Increase the radius or use the Maps fallback links below.`
    )
  }

  function showNeed(next:Filter){
    setFilter(next)
    setSort(next==='government'?'low_cost':'nearest')
    document.getElementById('medical-results')?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  return <div className="medical-help">
    <section className="medical-help-hero bolt-medical-hero">
      <div>
        <span className="eyebrow">Medical Help Near Me</span>
        <h1>Nearest care. Lowest-cost options first.</h1>
        <p>ANTAR detects your current area, groups care by what your child may need, and prioritises government or likely public services before private options.</p>
      </div>
      <div className="medical-emergency-actions">
        <a className="medical-emergency-card urgent" href="tel:112"><ShieldCheck size={19}/><span><strong>112</strong><small>National emergency</small></span><Phone size={15}/></a>
        <a className="medical-emergency-card" href="tel:108"><Ambulance size={19}/><span><strong>108</strong><small>Ambulance where supported</small></span><Phone size={15}/></a>
      </div>
    </section>

    <section className="panel current-location-card" id="medical-nearby">
      <div className="current-location-main">
        <span className={`location-pulse ${locationState}`}><LocateFixed size={19}/></span>
        <div>
          <small>{origin?.source==='device'?'CURRENT LOCATION':origin?'SEARCHED LOCATION':'LOCATION'}</small>
          <strong>{origin?.label||'Choose where to search'}</strong>
          <p>{loading?'Finding healthcare around this area…':status}</p>
        </div>
      </div>
      <div className="current-location-actions">
        <button className="primary-button" onClick={()=>void useLocation(false)} disabled={loading}><LocateFixed size={15}/> {origin?.source==='device'?'Refresh location':'Use current location'}</button>
        <button className="mini-button" onClick={()=>origin&&void rerun()} disabled={loading||!origin}><RefreshCw size={14}/> Refresh results</button>
      </div>
      {locationState==='blocked'&&<div className="location-help">
        <ShieldCheck size={15}/>
        <span>Browser location is currently blocked. Use the site/location icon in your browser address bar, allow Location, then tap <strong>Use current location</strong>.</span>
      </div>}
    </section>

    <section className="panel medical-search-panel">
      <div className="medical-search-title">
        <div><Search size={18}/><span><strong>Or search another area</strong><small>City, locality, sector or PIN code.</small></span></div>
        <button className="text-button medical-privacy-button" onClick={()=>setShowPrivacy(v=>!v)}>Location privacy <ChevronDown size={13}/></button>
      </div>

      {showPrivacy&&<div className="medical-privacy-note">
        <ShieldCheck size={16}/>
        <span>Your coordinates are used only for this search through ANTAR’s map-search backend. They are not written to your child record or stored in the ANTAR database.</span>
      </div>}

      <div className="medical-search-controls bolt-search-controls">
        <label className="medical-area-input"><Search size={16}/><input value={area} onChange={e=>setArea(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void geocodeArea()}} placeholder="City, locality, sector or PIN code"/></label>
        <button className="mini-button" onClick={()=>void geocodeArea()} disabled={loading||!area.trim()}>Search</button>
        <label className="medical-radius">Search radius
          <select value={radius} onChange={e=>{const next=Number(e.target.value);setRadius(next);if(origin)void rerun(next)}}>
            {radiusOptions.map(km=><option key={km} value={km}>{km} km</option>)}
          </select>
        </label>
      </div>
    </section>

    <section className="medical-needs-section">
      <div className="medical-section-heading">
        <div><span className="eyebrow">What does your child need?</span><h2>Care grouped by requirement</h2></div>
        {origin&&<span className="medical-location-chip"><MapPin size={13}/>{origin.label}</span>}
      </div>
      <div className="medical-needs-grid">
        {careNeeds.map(need=>{
          const Icon=need.icon
          const matches=places
            .filter(place=>place.category===need.key)
            .sort((a,b)=>costRank(a.costTier)-costRank(b.costTier)||a.distanceKm-b.distanceKm)
            .slice(0,3)
          return <article className="panel medical-need-card" key={need.key}>
            <button className="medical-need-head" onClick={()=>showNeed(need.key)}>
              <span><Icon size={18}/></span>
              <div><strong>{need.title}</strong><small>{need.subtitle}</small></div>
              <b>{matches.length?counts[need.key as keyof typeof counts]:0}</b>
            </button>
            <div className="medical-need-picks">
              {matches.map(place=><button key={place.id} onClick={()=>window.open(mapsUrl(place),'_blank','noopener,noreferrer')}>
                <span><strong>{place.name}</strong><small>{place.distanceKm.toFixed(1)} km · {place.costTier==='government'?'Government/public':place.costTier==='likely_public'?'Likely public':'Cost not listed'}</small></span>
                <Navigation size={13}/>
              </button>)}
              {!matches.length&&<div className="medical-need-empty">No mapped matches yet in this radius.</div>}
            </div>
            <div className="medical-need-actions">
              <button className="text-button" onClick={()=>showNeed(need.key)}>View ANTAR results</button>
              <a href={mapsNeedUrl(need.query,origin)} target="_blank" rel="noreferrer">Search Maps <ExternalLink size={12}/></a>
            </div>
          </article>
        })}
      </div>
    </section>

    {places.length>0&&<section className="panel low-cost-picks">
      <div className="low-cost-picks-head">
        <div><BadgeIndianRupee size={18}/><span><strong>Best low-cost options nearby</strong><small>Government/public first, then nearest alternatives. Exact fees are never guessed.</small></span></div>
        <button className="mini-button" onClick={()=>showNeed('government')}>Government only</button>
      </div>
      <div className="low-cost-picks-grid">
        {lowCostTop.map(place=><button key={place.id} onClick={()=>window.open(mapsUrl(place),'_blank','noopener,noreferrer')}>
          <span className={`cost-rank-badge ${place.costTier}`}>{place.costTier==='government'?'Public':place.costTier==='likely_public'?'Likely public':place.costTier==='private'?'Private':'Unknown cost'}</span>
          <strong>{place.name}</strong>
          <small>{place.serviceLabel} · {place.distanceKm.toFixed(1)} km</small>
        </button>)}
      </div>
    </section>}

    <section className="medical-filter-row" id="medical-results">
      {([
        ['all','All',counts.all],
        ['government','Government / likely public',counts.government],
        ['hospital','Hospital',counts.hospital],
        ['child_specialist','Child specialist',counts.child_specialist],
        ['therapy','Therapy',counts.therapy],
        ['mental_health','Psychology',counts.mental_health],
        ['audiology','Audiology',counts.audiology],
        ['diagnostics','Diagnostics',counts.diagnostics],
        ['pharmacy','Pharmacy',counts.pharmacy],
      ] as Array<[Filter,string,number]>).map(([value,label,count])=><button key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}<span>{count}</span></button>)}
      <label className="medical-sort">Sort
        <select value={sort} onChange={e=>setSort(e.target.value as Sort)}>
          <option value="low_cost">Lowest-cost likely</option>
          <option value="nearest">Nearest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </label>
    </section>

    <section className="medical-results">
      {filtered.map(place=>{
        const Icon=categoryIcon(place.category)
        return <article className="panel medical-place-card" key={place.id}>
          <div className="medical-place-head">
            <span className="medical-place-icon"><Icon size={19}/></span>
            <div>
              <span className="medical-service-type">{place.serviceLabel}</span>
              <h3>{place.name}</h3>
              <p>{place.distanceKm.toFixed(1)} km away · {place.address}</p>
            </div>
            <span className={`medical-ownership ${place.ownership}`}>{ownershipLabel(place.ownership)}</span>
          </div>

          <div className="medical-place-meta">
            <div><small>Distance</small><strong>{place.distanceKm.toFixed(1)} km</strong></div>
            <div><small>Cost guidance</small><strong>{place.costReason}</strong></div>
            {place.speciality&&<div><small>Speciality</small><strong>{place.speciality.replaceAll(';',', ')}</strong></div>}
            {place.operator&&<div><small>Operator</small><strong>{place.operator}</strong></div>}
          </div>

          <div className="medical-place-actions">
            {place.phone
              ?<a className="primary-button" href={'tel:'+place.phone}><Phone size={15}/> Call</a>
              :<span className="medical-phone-missing">Phone not listed</span>}
            <a className="mini-button" href={mapsUrl(place)} target="_blank" rel="noreferrer"><MapPin size={15}/> Directions</a>
            {place.website&&<a className="mini-button" href={place.website} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Website</a>}
          </div>
        </article>
      })}

      {!loading&&origin&&!filtered.length&&<div className="panel medical-empty">
        <MapPin size={28}/>
        <strong>No mapped services match this filter.</strong>
        <p>Increase the radius or use the category’s “Search Maps” fallback for a broader search.</p>
      </div>}

      {!origin&&!loading&&<div className="panel medical-empty">
        <LocateFixed size={28}/>
        <strong>Choose your location to see care around you.</strong>
        <p>Tap “Use current location” above, or enter a city/locality/PIN code.</p>
      </div>}
    </section>

    <DisabilitySupport
      onShowGovernment={()=>showNeed('government')}
      onShowTherapy={()=>showNeed('therapy')}
    />

    <section className="medical-disclaimer">
      <ShieldCheck size={15}/>
      <div>
        <strong>How ANTAR ranks affordability</strong>
        <p>Government/public facilities are prioritised because they are more likely to offer subsidised care. “Likely public” is based only on the facility name when map ownership is missing. ANTAR never invents consultation or therapy prices — call to confirm charges, hours and availability.</p>
      </div>
    </section>

    <p className="medical-attribution">Place data © OpenStreetMap contributors · Geocoding and nearby search are routed through ANTAR’s OpenStreetMap/Nominatim/Overpass backend.</p>
  </div>
}

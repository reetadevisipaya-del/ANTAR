import { useMemo, useState } from 'react'
import {
  Ambulance,
  Building2,
  ChevronDown,
  ExternalLink,
  Hospital,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react'
import DisabilitySupport from './DisabilitySupport'
import { supabase } from './supabase'

type Category='hospital'|'child_specialist'|'therapy'|'pharmacy'|'ambulance'|'clinic'|'other'
type Ownership='government'|'private'|'unknown'
type Filter='all'|'hospital'|'child_specialist'|'therapy'|'pharmacy'|'government'
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
  affordability:string
  serviceLabel:string
  operator?:string
}

type SearchOrigin={
  lat:number
  lon:number
  label:string
  source:'device'|'search'
}

const EARTH_RADIUS_KM=6371
const radiusOptions=[5,10,20]

function toRad(value:number){return value*Math.PI/180}
function distanceKm(aLat:number,aLon:number,bLat:number,bLon:number){
  const dLat=toRad(bLat-aLat)
  const dLon=toRad(bLon-aLon)
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2
  return EARTH_RADIUS_KM*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))
}

function cleanPhone(tags:Record<string,string>){
  return tags.phone||tags['contact:phone']||tags['contact:mobile']||''
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
  const name=(tags.name||'').toLowerCase()

  if(amenity==='ambulance_station'||healthcare==='ambulance')return 'ambulance'
  if(amenity==='pharmacy'||healthcare==='pharmacy')return 'pharmacy'
  if(
    /speech_therap|occupational_therap|physiotherap|psychotherap|rehabilitation/.test(healthcare)||
    /therapy|therapist|rehab|physio|speech|occupational/.test(name)
  )return 'therapy'
  if(
    /paediatric|pediatric|paediatrics|pediatrics|child/.test(speciality)||
    /children|child specialist|paediatric|pediatric/.test(name)
  )return 'child_specialist'
  if(amenity==='hospital'||healthcare==='hospital')return 'hospital'
  if(amenity==='clinic'||amenity==='doctors'||healthcare==='clinic'||healthcare==='doctor')return 'clinic'
  return 'other'
}

function categoryLabel(category:Category){
  if(category==='hospital')return 'Hospital'
  if(category==='child_specialist')return 'Child specialist / clinic'
  if(category==='therapy')return 'Therapy / rehabilitation'
  if(category==='pharmacy')return 'Pharmacy'
  if(category==='ambulance')return 'Ambulance service'
  if(category==='clinic')return 'Clinic / doctor'
  return 'Healthcare service'
}

function categoryIcon(category:Category){
  if(category==='hospital')return Hospital
  if(category==='child_specialist')return Stethoscope
  if(category==='therapy')return UsersRound
  if(category==='pharmacy')return Pill
  if(category==='ambulance')return Ambulance
  if(category==='clinic')return Stethoscope
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

function affordabilityFor(ownership:Ownership){
  if(ownership==='government')return 'Public/government service — care may be subsidised; confirm current charges.'
  if(ownership==='private')return 'Private provider — fees are not published by this map source.'
  return 'Fees not published — contact the provider before visiting.'
}

function ownershipLabel(value:Ownership){
  if(value==='government')return 'Government / public'
  if(value==='private')return 'Private'
  return 'Ownership not listed'
}

function mapsUrl(place:Place){
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.lat+','+place.lon)}`
}

async function medicalSearch<T>(body:Record<string,unknown>):Promise<T>{
  const {data,error}=await supabase.functions.invoke('medical-location-search',{body})
  if(error)throw new Error(error.message||'Location search failed')
  if(data?.error)throw new Error(String(data.error))
  return data as T
}

export default function MedicalHelp(){
  const [origin,setOrigin]=useState<SearchOrigin|null>(null)
  const [area,setArea]=useState('')
  const [radius,setRadius]=useState(10)
  const [places,setPlaces]=useState<Place[]>([])
  const [filter,setFilter]=useState<Filter>('all')
  const [sort,setSort]=useState<Sort>('nearest')
  const [status,setStatus]=useState('Search an area or use your device location to find nearby care.')
  const [loading,setLoading]=useState(false)
  const [showPrivacy,setShowPrivacy]=useState(false)

  const filtered=useMemo(()=>{
    const next=places.filter(place=>{
      if(filter==='all')return true
      if(filter==='government')return place.ownership==='government'
      return place.category===filter
    })
    return [...next].sort((a,b)=>{
      if(sort==='nearest')return a.distanceKm-b.distanceKm
      if(sort==='low_cost'){
        const rank=(value:Ownership)=>value==='government'?0:value==='unknown'?1:2
        return rank(a.ownership)-rank(b.ownership)||a.distanceKm-b.distanceKm
      }
      return a.name.localeCompare(b.name)
    })
  },[places,filter,sort])

  const counts=useMemo(()=>({
    all:places.length,
    hospital:places.filter(x=>x.category==='hospital').length,
    child_specialist:places.filter(x=>x.category==='child_specialist').length,
    therapy:places.filter(x=>x.category==='therapy').length,
    pharmacy:places.filter(x=>x.category==='pharmacy').length,
    government:places.filter(x=>x.ownership==='government').length,
  }),[places])

  async function geocodeArea(){
    const query=area.trim()
    if(!query)return setStatus('Enter a city, locality or PIN code first.')
    setLoading(true)
    setStatus('Finding that area…')
    try{
      const data=await medicalSearch<{results:Array<{lat:number;lon:number;label:string}>}>({
        mode:'geocode',
        query,
      })
      const match=data.results?.[0]
      if(!match){
        setStatus('That area could not be found. Try a more specific city, locality or PIN code.')
        setLoading(false)
        return
      }
      const next:SearchOrigin={lat:match.lat,lon:match.lon,label:match.label,source:'search'}
      setOrigin(next)
      setArea(match.label)
      await searchNearby(next,radius)
    }catch(error){
      setStatus(error instanceof Error
        ?`Area search could not complete: ${error.message}. Please try again.`
        :'Area search is temporarily unavailable. Please try again.')
      setLoading(false)
    }
  }

  async function useLocation(){
    if(!window.isSecureContext){
      setStatus('Device location requires a secure HTTPS connection. Search by city, locality or PIN code instead.')
      return
    }
    if(!navigator.geolocation){
      setStatus('Location is not supported by this browser. Search by area instead.')
      return
    }

    setLoading(true)
    setStatus('Requesting your device location…')

    navigator.geolocation.getCurrentPosition(async position=>{
      const lat=position.coords.latitude
      const lon=position.coords.longitude
      let label='Your current location'

      try{
        const reverse=await medicalSearch<{label?:string}>({mode:'reverse',lat,lon})
        if(reverse.label)label=reverse.label
      }catch{
        // Nearby search can still work even when reverse geocoding is unavailable.
      }

      const next:SearchOrigin={lat,lon,label,source:'device'}
      setOrigin(next)
      await searchNearby(next,radius)
    },error=>{
      setLoading(false)
      if(error.code===1){
        setStatus('Location access is blocked. Allow location for this site in your browser settings, then try again — or search by city/PIN.')
      }else if(error.code===2){
        setStatus('Your device could not determine its location. Turn on location services or search by city/PIN.')
      }else if(error.code===3){
        setStatus('Location request timed out. Try again, or search by city/PIN.')
      }else{
        setStatus('Your location could not be read. Search by city, locality or PIN code instead.')
      }
    },{enableHighAccuracy:false,timeout:15000,maximumAge:600000})
  }

  async function rerun(nextRadius=radius){
    if(!origin)return setStatus('Choose a location or search an area first.')
    await searchNearby(origin,nextRadius)
  }

  async function searchNearby(searchOrigin:SearchOrigin,searchRadius:number){
    setLoading(true)
    setStatus('Searching nearby hospitals, child specialists, therapy, pharmacies and ambulance services…')
    const {lat,lon}=searchOrigin

    let raw:any[]=[]
    try{
      const data=await medicalSearch<{elements:any[];radiusKm:number}>({
        mode:'nearby',
        lat,
        lon,
        radiusKm:searchRadius,
      })
      raw=Array.isArray(data.elements)?data.elements:[]
    }catch(error){
      setLoading(false)
      setStatus(error instanceof Error
        ?`Nearby care search could not complete: ${error.message}. Please try again.`
        :'The healthcare map service is temporarily unavailable. Please try again.')
      return
    }

    const seen=new Set<string>()
    const normalized:Place[]=[]
    for(const item of raw){
      const itemLat=Number(item.lat??item.center?.lat)
      const itemLon=Number(item.lon??item.center?.lon)
      if(!Number.isFinite(itemLat)||!Number.isFinite(itemLon))continue
      const tags=(item.tags||{}) as Record<string,string>
      const category=categoryFrom(tags)
      if(category==='other')continue
      const name=tags.name||tags['name:en']||categoryLabel(category)
      const fingerprint=(name+'|'+itemLat.toFixed(4)+'|'+itemLon.toFixed(4)).toLowerCase()
      if(seen.has(fingerprint))continue
      seen.add(fingerprint)
      const ownership=ownershipFrom(tags)
      normalized.push({
        id:String(item.type)+'-'+String(item.id),
        name,
        category,
        lat:itemLat,
        lon:itemLon,
        distanceKm:distanceKm(lat,lon,itemLat,itemLon),
        address:addressFrom(tags),
        phone:cleanPhone(tags)||undefined,
        website:tags.website||tags['contact:website']||undefined,
        ownership,
        affordability:affordabilityFor(ownership),
        serviceLabel:categoryLabel(category),
        operator:tags.operator||undefined,
      })
    }

    normalized.sort((a,b)=>a.distanceKm-b.distanceKm)
    setPlaces(normalized)
    setLoading(false)
    setStatus(normalized.length
      ?`Found ${normalized.length} map-listed healthcare services within about ${searchRadius} km of ${searchOrigin.label}.`
      :`No mapped healthcare services were found within ${searchRadius} km. Try a larger radius.`
    )
  }

  return <div className="medical-help">
    <section className="medical-help-hero">
      <div>
        <span className="eyebrow">Medical Help Near Me</span>
        <h1>Find nearby care without guessing.</h1>
        <p>Search real map-listed hospitals, child specialists, therapy services, pharmacies and ambulance points. ANTAR does not invent prices, ratings or availability.</p>
      </div>
      <div className="medical-emergency-actions">
        <a className="medical-emergency-card urgent" href="tel:112"><ShieldCheck size={19}/><span><strong>112</strong><small>National emergency</small></span><Phone size={15}/></a>
        <a className="medical-emergency-card" href="tel:108"><Ambulance size={19}/><span><strong>108</strong><small>Ambulance where supported</small></span><Phone size={15}/></a>
      </div>
    </section>

    <section className="panel medical-search-panel" id="medical-nearby">
      <div className="medical-search-title">
        <div><MapPin size={18}/><span><strong>Where should ANTAR search?</strong><small>Use your location or enter a city, locality or PIN code.</small></span></div>
        <button className="text-button medical-privacy-button" onClick={()=>setShowPrivacy(v=>!v)}>Location privacy <ChevronDown size={13}/></button>
      </div>

      {showPrivacy&&<div className="medical-privacy-note">
        <ShieldCheck size={16}/>
        <span>Your location is used only for this search. ANTAR does not save it to your child record or Supabase. ANTAR sends the coordinates through its secure backend only for geocoding and nearby-care lookup. They are not saved to your child record or ANTAR database.</span>
      </div>}

      <div className="medical-search-controls">
        <label className="medical-area-input"><Search size={16}/><input value={area} onChange={e=>setArea(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void geocodeArea()}} placeholder="e.g. Chandigarh, Kharar, Sector 17, 140301"/></label>
        <button className="mini-button" onClick={()=>void geocodeArea()} disabled={loading||!area.trim()}>Search area</button>
        <button className="primary-button" onClick={()=>void useLocation()} disabled={loading}><LocateFixed size={16}/> Use my location</button>
        <label className="medical-radius">Radius
          <select value={radius} onChange={e=>{const next=Number(e.target.value);setRadius(next);if(origin)void rerun(next)}}>
            {radiusOptions.map(km=><option key={km} value={km}>{km} km</option>)}
          </select>
        </label>
      </div>

      <div className="medical-search-status">
        <Navigation size={14}/>
        <span>{loading?'Working on your location search…':status}</span>
      </div>
    </section>

    <section className="medical-filter-row">
      {([
        ['all','All',counts.all],
        ['hospital','Hospital',counts.hospital],
        ['child_specialist','Child specialist',counts.child_specialist],
        ['therapy','Therapy',counts.therapy],
        ['pharmacy','Pharmacy',counts.pharmacy],
        ['government','Government',counts.government],
      ] as Array<[Filter,string,number]>).map(([value,label,count])=><button key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}<span>{count}</span></button>)}
      <label className="medical-sort">Sort
        <select value={sort} onChange={e=>setSort(e.target.value as Sort)}>
          <option value="nearest">Nearest first</option>
          <option value="low_cost">Lowest-cost likely (government first)</option>
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
            <div><small>Cost guidance</small><strong>{place.affordability}</strong></div>
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
        <strong>No services match this filter.</strong>
        <p>Try “All”, increase the search radius, or search a nearby city/locality.</p>
      </div>}

      {!origin&&!loading&&<div className="medical-start-grid">
        <div className="panel"><Hospital size={22}/><strong>Hospitals</strong><p>Nearby public and private hospitals where ownership is actually listed in map data.</p></div>
        <div className="panel"><Stethoscope size={22}/><strong>Child specialists</strong><p>Paediatric and child-focused clinics where map tags identify the service.</p></div>
        <div className="panel"><UsersRound size={22}/><strong>Therapy</strong><p>Speech, occupational, physiotherapy, psychotherapy and rehabilitation listings.</p></div>
        <div className="panel"><Pill size={22}/><strong>Pharmacies</strong><p>Nearby mapped pharmacies with phone and address details when available.</p></div>
      </div>}
    </section>

    <DisabilitySupport
      onShowGovernment={()=>{
        setFilter('government')
        setSort('low_cost')
        document.getElementById('medical-nearby')?.scrollIntoView({behavior:'smooth',block:'start'})
      }}
      onShowTherapy={()=>{
        setFilter('therapy')
        setSort('nearest')
        document.getElementById('medical-nearby')?.scrollIntoView({behavior:'smooth',block:'start'})
      }}
    />

    <section className="medical-disclaimer">
      <ShieldCheck size={15}/>
      <div>
        <strong>How ANTAR handles healthcare information</strong>
        <p>Distance is calculated from map coordinates. Ownership is shown only when the map source explicitly identifies it. Exact fees are not estimated. Call the provider to confirm services, charges, hours and appointment availability before travelling. For an emergency in India, call 112.</p>
      </div>
    </section>

    <p className="medical-attribution">Place data © OpenStreetMap contributors · Search/geocoding via OpenStreetMap/Nominatim and Overpass.</p>
  </div>
}

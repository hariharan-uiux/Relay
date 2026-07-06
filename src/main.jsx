import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as I from 'lucide-react';
import './styles.css';

const nav=[['Home',I.Home],['Files',I.Files],['Clipboard',I.Clipboard],['Links',I.Link2],['Notes',I.NotebookPen],['Media',I.Images],['History',I.History]];
const seedTransfers=[
  {id:1,name:'Brand-assets.zip',meta:'MacBook Pro · 428 MB',time:'2 min ago',kind:'zip',color:'violet',status:'Complete'},
  {id:2,name:'IMG_0842.HEIC',meta:'iPhone 15 · 3.8 MB',time:'18 min ago',kind:'image',color:'amber',status:'Complete'},
  {id:3,name:'Q3-roadmap.pdf',meta:'Studio PC · 12.6 MB',time:'Yesterday',kind:'pdf',color:'coral',status:'Complete'},
  {id:4,name:'Meeting notes',meta:'iPad Air · Text',time:'Yesterday',kind:'text',color:'mint',status:'Complete'},
];
const devices=[
  {name:'iPhone 15',sub:'This device',icon:I.Smartphone,color:'blue',online:true,bars:3},
  {name:'MacBook Pro',sub:'192.168.1.24',icon:I.Laptop,color:'violet',online:true,bars:3},
  {name:'Studio PC',sub:'192.168.1.31',icon:I.Monitor,color:'amber',online:true,bars:2},
  {name:'iPad Air',sub:'Seen 2 hours ago',icon:I.Tablet,color:'rose',online:false,bars:0},
];
function Logo(){return <div className="logo"><span><I.Wifi size={18}/></span><b>Relay</b></div>}
function FileIcon({kind}){const X=kind==='image'?I.Image:kind==='pdf'?I.FileText:kind==='text'?I.AlignLeft:I.Archive;return <X size={20}/>}
function App(){
 const [active,setActive]=useState('Home'),[query,setQuery]=useState(''),[theme,setTheme]=useState('light'),[modal,setModal]=useState(null),[toast,setToast]=useState(''),[transfers,setTransfers]=useState([]),[drag,setDrag]=useState(false),[serverInfo,setServerInfo]=useState(null); const picker=useRef(),composer=useRef();
 useEffect(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})},[]);
 useEffect(()=>{Promise.all([fetch('/api/info').then(r=>r.json()),fetch('/api/history').then(r=>r.json())]).then(([info,items])=>{setServerInfo(info);setTransfers(items)}).catch(()=>setTransfers(seedTransfers))},[]);
 useEffect(()=>{const fn=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();document.querySelector('.search input')?.focus()}};addEventListener('keydown',fn);return()=>removeEventListener('keydown',fn)},[]);
 const show=t=>{setToast(t);setTimeout(()=>setToast(''),2400)};
 const addFiles=async list=>{const form=new FormData();[...list].forEach(f=>form.append('files',f));show(`Uploading ${list.length} file${list.length>1?'s':''}...`);try{const items=await fetch('/api/upload',{method:'POST',body:form}).then(r=>r.json());setTransfers(x=>[...items,...x]);show(`${items.length} file${items.length>1?'s':''} stored on this PC`)}catch{show('Upload failed — check the server connection')}};
 const filtered=useMemo(()=>transfers.filter(x=>x.name.toLowerCase().includes(query.toLowerCase())),[transfers,query]);
 return <div className={theme==='dark'?'app dark':'app'}>
  <aside><Logo/><nav>{nav.map(([n,X])=><button className={active===n?'active':''} onClick={()=>setActive(n)} key={n}><X size={18}/><span>{n}</span>{n==='Clipboard'&&<em>3</em>}</button>)}</nav><div className="side-bottom"><button onClick={()=>setModal('settings')}><I.Settings size={18}/><span>Settings</span></button><button onClick={()=>setModal('pair')}><I.CircleHelp size={18}/><span>Help & pairing</span></button><div className="privacy"><I.ShieldCheck size={20}/><div><b>Private by design</b><small>Nothing leaves your network</small></div></div></div></aside>
  <main>
   <header><div className="mobile-logo"><Logo/></div><div className="search"><I.Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search everything..."/><kbd>⌘ K</kbd></div><div className="head-actions"><button onClick={()=>setTheme(x=>x==='light'?'dark':'light')}><I.Sun size={18}/></button><button className="bell"><I.Bell size={18}/><i/></button><div className="avatar">H</div></div></header>
   <div className="content">
    <section className="welcome"><div><p className="eyebrow">LOCAL NETWORK · SECURE</p><h1>{active==='Home'?'Good morning, Hari.':active}</h1><p>{active==='Home'?'Everything is connected and ready to share.':`Your ${active.toLowerCase()} stay private on this network.`}</p></div><button className="pair" onClick={()=>setModal('pair')}><I.QrCode size={18}/> Pair a device</button></section>
    {active==='Home'?<Home/>:<Library/>}
   </div>
  </main>
  <input hidden multiple ref={picker} type="file" onChange={e=>addFiles(e.target.files)}/>
  {modal&&<Modal/>}{toast&&<div className="toast"><I.CheckCircle2 size={18}/>{toast}</div>}
 </div>

 function Home(){return <>
  <section className="share-card" onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}} data-drag={drag}>
   <div className="share-copy"><span className="send-icon"><I.Send size={24}/></span><div><h2>Send something</h2><p>Drop files here or choose what you want to share.</p></div></div>
   <div className="share-actions"><button className="primary" onClick={()=>picker.current.click()}><I.Plus size={18}/> Choose files</button><button onClick={()=>setModal('clipboard')}><I.Clipboard size={18}/> Paste text</button><button onClick={()=>setModal('link')}><I.Link2 size={18}/> Share link</button></div>
  </section>
  <section><div className="section-title"><div><h2>Nearby devices</h2><p>Devices on your local network</p></div><button onClick={()=>show('Network scan refreshed')}><I.RefreshCw size={16}/> Refresh</button></div><div className="device-grid">{devices.map((d,i)=><button className="device" key={d.name} onClick={()=>show(d.online?`${d.name} selected`:`${d.name} is currently offline`)}><div className={`device-icon ${d.color}`}><d.icon size={23}/><i className={d.online?'on':'off'}/></div><div className="device-text"><b>{d.name}</b><small>{d.sub}</small></div><span className="signal"><I.Signal size={17}/></span>{d.online&&i>0?<span className="chev">›</span>:null}</button>)}</div></section>
  <section><div className="section-title"><div><h2>Recent activity</h2><p>Your latest transfers and shares</p></div><button onClick={()=>setActive('History')}>View all <I.ArrowRight size={16}/></button></div><TransferList list={filtered.slice(0,4)}/></section>
 </>}
 function Library(){return <section className="library"><div className="library-head"><div><h2>{active}</h2><p>Search, sort and manage everything stored locally.</p></div><button className="primary" onClick={()=>active==='Files'?picker.current.click():setModal(active==='Clipboard'?'clipboard':active==='Links'?'link':'note')}><I.Plus size={18}/> Add new</button></div><div className="filters"><button className="selected">All</button><button>Favorites</button><button>From my devices</button><span/><button><I.SlidersHorizontal size={16}/> Filter</button></div>{active==='History'||active==='Files'?<TransferList list={filtered}/>:<Empty/>}</section>}
 function TransferList({list}){return <div className="transfer-list">{list.length?list.map(x=><div className="transfer" key={x.id}><span className={`file-icon ${x.color||'blue'}`}><FileIcon kind={x.kind||x.type}/></span><div className="file-name"><b>{x.name}</b><small>{x.meta||`${x.device||'Local device'} · ${x.size?formatSize(x.size):x.type||'Share'}`}</small></div><span className="complete"><I.Check size={13}/> {x.status}</span><time>{x.time||new Date(x.timestamp).toLocaleDateString()}</time>{x.path?<a className="download" href={`/api/download/${x.id}`} aria-label="Download"><I.Download size={18}/></a>:<button aria-label="More"><I.MoreHorizontal size={19}/></button>}</div>):<Empty/>}</div>}
 function Empty(){const X=active==='Clipboard'?I.Clipboard:active==='Links'?I.Link2:active==='Notes'?I.NotebookPen:I.Images;return <div className="empty"><span><X size={28}/></span><h3>No {active.toLowerCase()} yet</h3><p>Anything you share will appear here and stay on this device.</p></div>}
 function Modal(){return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal"><button className="close" onClick={()=>setModal(null)}><I.X size={19}/></button>{modal==='pair'?<Pair/>:modal==='settings'?<Settings/>:<Composer/>}</div></div>}
 function Pair(){return <><span className="modal-icon"><I.QrCode/></span><h2>Connect your device</h2><p>Keep both devices on the same Wi-Fi, then scan this QR code with your phone or tablet camera.</p>{serverInfo?<img className="real-qr" src={serverInfo.qr} alt={`QR code for ${serverInfo.url}`}/>:<div className="qr"/>}<div className="server-url">{serverInfo?.url||'Starting local server…'}</div><small className="secure"><I.Lock size={13}/> Files stay on this Windows PC · Local network only</small></>}
 function Settings(){return <><span className="modal-icon"><I.Settings/></span><h2>Settings</h2><p>Control how Relay works on this device.</p><label className="setting"><span><b>Dark appearance</b><small>Use a darker interface</small></span><input type="checkbox" checked={theme==='dark'} onChange={()=>setTheme(x=>x==='light'?'dark':'light')}/></label><label className="setting"><span><b>Auto-accept trusted devices</b><small>Skip approval for known devices</small></span><input type="checkbox" defaultChecked/></label><label className="setting"><span><b>Notifications</b><small>Transfer and connection alerts</small></span><input type="checkbox" defaultChecked/></label></>}
 function Composer(){let title=modal==='clipboard'?'Paste text':modal==='link'?'Share a link':'New note';const send=async()=>{const content=composer.current?.value||'';if(!content.trim())return;const item=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:modal==='clipboard'?'text':modal,content})}).then(r=>r.json());setTransfers(x=>[item,...x]);setModal(null);show(`${title} shared successfully`)};return <><span className="modal-icon">{modal==='clipboard'?<I.Clipboard/>:modal==='link'?<I.Link2/>:<I.NotebookPen/>}</span><h2>{title}</h2><p>It will be available instantly to devices on your network.</p>{modal==='link'?<input ref={composer} className="composer" placeholder="https://example.com" autoFocus/>:<textarea ref={composer} className="composer" rows="5" placeholder="Type or paste here..." autoFocus/>}<button className="primary full" onClick={send}><I.Send size={17}/> Share now</button></>}
 }
function formatSize(n){if(n<1e6)return Math.round(n/1e3)+' KB';if(n<1e9)return (n/1e6).toFixed(1)+' MB';return (n/1e9).toFixed(1)+' GB'}
createRoot(document.getElementById('root')).render(<App/>);

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as I from 'lucide-react';
import {io} from 'socket.io-client';
import './styles.css';

const nav=[['Home',I.Home],['Files',I.Files],['Clipboard',I.Clipboard],['Links',I.Link2],['Notes',I.NotebookPen],['Media',I.Images],['History',I.History]];
function Logo({isMenu}){const Icon=isMenu?I.Menu:I.Wifi;return <div className="logo"><span><Icon size={18}/></span><b>Relay</b></div>}
function FileIcon({kind}){const X=kind==='image'?I.Image:kind==='pdf'?I.FileText:kind==='text'?I.AlignLeft:I.Archive;return <X size={20}/>}
function App(){
 const [active,setActive]=useState('Home');
 const [query,setQuery]=useState('');
 const [theme,setTheme]=useState(() => localStorage.getItem('relay-theme') || 'system');
 const [autoAccept,setAutoAccept]=useState(() => localStorage.getItem('relay-auto-accept') === null ? true : localStorage.getItem('relay-auto-accept') === 'true');
 const [notifications,setNotifications]=useState(() => localStorage.getItem('relay-notifications') === null ? true : localStorage.getItem('relay-notifications') === 'true');
 const [systemDark,setSystemDark]=useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
 const [modal,setModal]=useState(null);
 const [toast,setToast]=useState('');
 const [transfers,setTransfers]=useState([]);
 const [devices,setDevices]=useState([]);
 const [socketId,setSocketId]=useState(null);
 const [drag,setDrag]=useState(false);
 const [serverInfo,setServerInfo]=useState(null);
 const [showSidebar,setShowSidebar]=useState(false);
 const picker=useRef(),composer=useRef();

 useEffect(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})},[]);
 useEffect(()=>{fetch('/api/info').then(r=>r.json()).then(info=>setServerInfo(info)).catch(()=>{})},[]);
 useEffect(()=>{
  const socket=io();
  socket.on('connect',()=>{setSocketId(socket.id)});
  socket.on('history',items=>setTransfers(items));
  socket.on('devices',list=>setDevices(list));
  return ()=>{socket.disconnect()};
 },[]);
 useEffect(()=>{const fn=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();document.querySelector('.search input')?.focus()}};addEventListener('keydown',fn);return()=>removeEventListener('keydown',fn)},[]);
 useEffect(() => {
  if (theme !== 'system') return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = e => setSystemDark(e.matches);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
 }, [theme]);

 const isDark = theme === 'dark' || (theme === 'system' && systemDark);
 const show=t=>{setToast(t);setTimeout(()=>setToast(''),2400)};
 const addFiles=async list=>{const form=new FormData();[...list].forEach(f=>form.append('files',f));show(`Uploading ${list.length} file${list.length>1?'s':''}...`);try{const items=await fetch('/api/upload',{method:'POST',body:form}).then(r=>r.json());setTransfers(x=>[...items,...x]);show(`${items.length} file${items.length>1?'s':''} stored on this PC`)}catch{show('Upload failed — check the server connection')}};
 const clipboardCount=useMemo(()=>transfers.filter(x=>x.type==='text').length,[transfers]);
 const filtered=useMemo(()=>{
  const searchFiltered = transfers.filter(x=>{
    const matchName = x.name?.toLowerCase().includes(query.toLowerCase());
    const matchContent = x.content?.toLowerCase().includes(query.toLowerCase());
    return matchName || matchContent;
  });
  if(active==='History'||active==='Home')return searchFiltered;
  if(active==='Files')return searchFiltered.filter(x=>x.type==='file'||(!x.type&&x.path));
  if(active==='Clipboard')return searchFiltered.filter(x=>x.type==='text');
  if(active==='Links')return searchFiltered.filter(x=>x.type==='link');
  if(active==='Notes')return searchFiltered.filter(x=>x.type==='note');
  if(active==='Media')return searchFiltered.filter(x=>{
    const type=x.kind||x.type||'';
    const mime=x.mime||'';
    return type==='image'||type==='video'||mime.startsWith('image/')||mime.startsWith('video/')||(x.name&&/\.(png|jpe?g|gif|webp|heic|mp4|mov|webm)$/i.test(x.name));
  });
  return [];
 },[transfers,query,active]);

 return <div className={isDark ? 'app dark' : 'app'}>
  <aside className={showSidebar ? 'open' : ''}>
   <div className="mobile-aside-header">
    <Logo/>
    <button className="close-aside-btn" onClick={()=>setShowSidebar(false)} aria-label="Close menu"><I.X size={20}/></button>
   </div>
   <nav>{nav.map(([n,X])=><button className={active===n?'active':''} onClick={()=>{setActive(n);setShowSidebar(false)}} key={n}><X size={18}/><span>{n}</span>{n==='Clipboard'&&clipboardCount>0&&<em>{clipboardCount}</em>}</button>)}</nav>
   <div className="side-bottom">
    <button onClick={()=>{setModal('settings');setShowSidebar(false)}}><I.Settings size={18}/><span>Settings</span></button>
    <button onClick={()=>{setModal('pair');setShowSidebar(false)}}><I.CircleHelp size={18}/><span>Help & pairing</span></button>
    <div className="privacy"><I.ShieldCheck size={20}/><div><b>Private by design</b><small>Nothing leaves your network</small></div></div>
   </div>
  </aside>
  <main>
   <header>
    <button className="mobile-logo" onClick={()=>setShowSidebar(true)} aria-label="Open menu"><Logo isMenu/></button>
    <div className="search"><I.Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search everything..."/><kbd>⌘ K</kbd></div>
    <div className="head-actions"><button onClick={()=>{const next=isDark?'light':'dark';setTheme(next);localStorage.setItem('relay-theme',next)}}>{isDark?<I.Sun size={18}/>:<I.Moon size={18}/>}</button><button title="Pair a device" onClick={()=>setModal('pair')}><I.QrCode size={18}/></button><button className="bell"><I.Bell size={18}/><i/></button><div className="avatar">H</div></div>
   </header>
   <div className="content">
    <section className="welcome"><div><p className="eyebrow">LOCAL NETWORK · SECURE</p><h1>{active==='Home'?(serverInfo?`Welcome to ${serverInfo.name}`:'Welcome back'):active}</h1><p>{active==='Home'?'Everything is connected and ready to share.':`Your ${active.toLowerCase()} stay private on this network.`}</p></div></section>
    {active==='Home'?<Home/>:<Library/>}
   </div>
  </main>
  <input hidden multiple ref={picker} type="file" onChange={e=>addFiles(e.target.files)}/>
  {showSidebar && <div className="aside-backdrop" onClick={()=>setShowSidebar(false)} />}
  {modal&&<Modal/>}{toast&&<div className="toast"><I.CheckCircle2 size={18}/>{toast}</div>}
 </div>

 function Home(){return <>
  <section className="share-card" onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}} data-drag={drag}>
   <div className="share-copy"><span className="send-icon"><I.Send size={24}/></span><div><h2>Send something</h2><p>Drop files here or choose what you want to share.</p></div></div>
   <div className="share-actions"><button className="primary" onClick={()=>picker.current.click()}><I.Plus size={18}/> Choose files</button><button onClick={()=>setModal('clipboard')}><I.Clipboard size={18}/> Paste text</button><button onClick={()=>setModal('link')}><I.Link2 size={18}/> Share link</button></div>
  </section>
  <div className="home-grid">
   <section><div className="section-title"><div><h2>Nearby devices</h2><p>Devices on your local network</p></div><button onClick={()=>show('Network scan refreshed')}><I.RefreshCw size={16}/> Refresh</button></div>
    <div className="device-container">
     {devices.length?(<div className="device-grid">{devices.map(d=>{
      const isMe=d.id===socketId;
      const Icon=I[d.icon]||I.Smartphone;
      return <button className="device" key={d.id} onClick={()=>show(isMe?'This is your current device':`${d.name} (${d.ip}) is connected`)}><div className={`device-icon ${d.color}`}><Icon size={23}/><i className="on"/></div><div className="device-text"><b>{d.name} {isMe&&'(This device)'}</b><small>{isMe?'Active':d.ip}</small></div><span className="signal"><I.Signal size={17}/></span>{!isMe&&<span className="chev">›</span>}</button>;
     })}</div>):(<div className="empty"><span><I.WifiOff size={28}/></span><h3>No other devices connected</h3><p>Scan the QR code or open the link on another device to start sharing.</p></div>)}
    </div>
   </section>
   <section><div className="section-title"><div><h2>Recent activity</h2><p>Your latest transfers and shares</p></div><button onClick={()=>setActive('History')}>View all <I.ArrowRight size={16}/></button></div><TransferList list={filtered.slice(0,4)}/></section>
  </div>
 </>}
 function Library(){return <section className="library"><div className="library-head"><div><h2>{active}</h2><p>Search, sort and manage everything stored locally.</p></div><button className="primary" onClick={()=>(active==='Files'||active==='Media')?picker.current.click():setModal(active==='Clipboard'?'clipboard':active==='Links'?'link':'note')}><I.Plus size={18}/> Add new</button></div><div className="filters"><button className="selected">All</button><button>Favorites</button><button>From my devices</button><span/><button><I.SlidersHorizontal size={16}/> Filter</button></div><TransferList list={filtered}/></section>}
 function TransferList({list}){return <div className="transfer-list">{list.length?list.map(x=><div className="transfer" key={x.id}><span className={`file-icon ${x.color||'blue'}`}><FileIcon kind={x.kind||x.type}/></span><div className="file-name"><b>{x.name}</b><small>{x.meta||`${x.device||'Local device'} · ${x.size?formatSize(x.size):x.type||'Share'}`}</small></div><span className="complete"><I.Check size={13}/> {x.status}</span><time>{x.time||new Date(x.timestamp).toLocaleDateString()}</time>{x.path?<a className="download" href={`/api/download/${x.id}`} aria-label="Download"><I.Download size={18}/></a>:<button aria-label="More"><I.MoreHorizontal size={19}/></button>}</div>):<Empty/>}</div>}
 function Empty(){const X=active==='Clipboard'?I.Clipboard:active==='Links'?I.Link2:active==='Notes'?I.NotebookPen:I.Images;return <div className="empty"><span><X size={28}/></span><h3>No {active.toLowerCase()} yet</h3><p>Anything you share will appear here and stay on this device.</p></div>}
 function Modal(){return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal"><button className="close" onClick={()=>setModal(null)}><I.X size={19}/></button>{modal==='pair'?<Pair/>:modal==='settings'?<Settings/>:<Composer/>}</div></div>}
 function Pair(){return <><span className="modal-icon"><I.QrCode/></span><h2>Connect your device</h2><p>Keep both devices on the same Wi-Fi, then scan this QR code with your phone or tablet camera.</p>{serverInfo?<img className="real-qr" src={serverInfo.qr} alt={`QR code for ${serverInfo.url}`}/>:<div className="qr"/>}<div className="server-url">{serverInfo?.url||'Starting local server…'}</div><small className="secure"><I.Lock size={13}/> Files stay on this Windows PC · Local network only</small></>}
 function Settings(){return <>
      <span className="modal-icon"><I.Settings/></span>
      <h2>Settings</h2>
      <p>Control how Relay works on this device.</p>
      <label className="setting">
        <span>
          <b>Theme appearance</b>
          <small>Choose how Relay looks on your device</small>
        </span>
        <select value={theme} onChange={e => {
          const next = e.target.value;
          setTheme(next);
          localStorage.setItem('relay-theme', next);
        }}>
          <option value="system">System (Device Theme)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label className="setting">
        <span>
          <b>Auto-accept trusted devices</b>
          <small>Skip approval for known devices</small>
        </span>
        <input type="checkbox" checked={autoAccept} onChange={e => {
          const next = e.target.checked;
          setAutoAccept(next);
          localStorage.setItem('relay-auto-accept', String(next));
        }}/>
      </label>
      <label className="setting">
        <span>
          <b>Notifications</b>
          <small>Transfer and connection alerts</small>
        </span>
        <input type="checkbox" checked={notifications} onChange={e => {
          const next = e.target.checked;
          setNotifications(next);
          localStorage.setItem('relay-notifications', String(next));
        }}/>
      </label>
    </>}
 function Composer(){let title=modal==='clipboard'?'Paste text':modal==='link'?'Share a link':'New note';const send=async()=>{const content=composer.current?.value||'';if(!content.trim())return;const item=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:modal==='clipboard'?'text':modal,content})}).then(r=>r.json());setTransfers(x=>[item,...x]);setModal(null);show(`${title} shared successfully`)};return <><span className="modal-icon">{modal==='clipboard'?<I.Clipboard/>:modal==='link'?<I.Link2/>:<I.NotebookPen/>}</span><h2>{title}</h2><p>It will be available instantly to devices on your network.</p>{modal==='link'?<input ref={composer} className="composer" placeholder="https://example.com" autoFocus/>:<textarea ref={composer} className="composer" rows="5" placeholder="Type or paste here..." autoFocus/>}<button className="primary full" onClick={send}><I.Send size={17}/> Share now</button></>}
 }
function formatSize(n){if(n<1e6)return Math.round(n/1e3)+' KB';if(n<1e9)return (n/1e6).toFixed(1)+' MB';return (n/1e9).toFixed(1)+' GB'}
createRoot(document.getElementById('root')).render(<App/>);

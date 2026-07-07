import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as I from 'lucide-react';
import {io} from 'socket.io-client';
import './styles.css';

const nav=[['Home',I.Home],['Settings',I.Settings],['Help',I.CircleHelp]];
const filterTabs = [
  { id: 'all', label: 'All', icon: I.Layers },
  { id: 'files', label: 'Files', icon: I.Files },
  { id: 'clipboard', label: 'Clipboard', icon: I.Clipboard },
  { id: 'links', label: 'Links', icon: I.Link2 },
  { id: 'notes', label: 'Notes', icon: I.NotebookPen },
  { id: 'media', label: 'Media', icon: I.Images }
];
function Logo({isMenu}){const Icon=isMenu?I.Menu:I.Wifi;return <div className="logo"><span><Icon size={18}/></span><b>Relay</b></div>}
function FileIcon({kind}){const X=kind==='image'?I.Image:kind==='pdf'?I.FileText:kind==='text'?I.AlignLeft:I.Archive;return <X size={20}/>}
const isImage = x => {
  const mime = x.mime || '';
  const name = x.name || '';
  const type = x.kind || x.type || '';
  return type === 'image' || mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|svg)$/i.test(name);
};
const isVideo = x => {
  const mime = x.mime || '';
  const name = x.name || '';
  const type = x.kind || x.type || '';
  return type === 'video' || mime.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(name);
};

function App(){
 const [active,setActive]=useState('Home');
 const [homeTab,setHomeTab]=useState('Dashboard');
 const [contentFilter,setContentFilter]=useState('all');
 const [query,setQuery]=useState('');
 const [viewMode,setViewMode]=useState(() => localStorage.getItem('relay-view-mode') || 'grid');
 const [theme,setTheme]=useState(() => localStorage.getItem('relay-theme') || 'system');
 const [autoAccept,setAutoAccept]=useState(() => localStorage.getItem('relay-auto-accept') === null ? true : localStorage.getItem('relay-auto-accept') === 'true');
 const [notifications,setNotifications]=useState(() => localStorage.getItem('relay-notifications') === null ? true : localStorage.getItem('relay-notifications') === 'true');
 const [notificationsList,setNotificationsList]=useState([]);
 const [showBellDropdown,setShowBellDropdown]=useState(false);
 const [systemDark,setSystemDark]=useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
 const [modal,setModal]=useState(null);
 const [toast,setToast]=useState('');
 const [transfers,setTransfers]=useState([]);
 const [devices,setDevices]=useState([]);
 const [socketId,setSocketId]=useState(null);
 const [drag,setDrag]=useState(false);
 const [serverInfo,setServerInfo]=useState(null);
 const [profileName,setProfileName]=useState(() => localStorage.getItem('relay-profile-name') || '');
 const [profilePic,setProfilePic]=useState(() => localStorage.getItem('relay-profile-pic') || '');
 const [showHomeFilter,setShowHomeFilter]=useState(false);
 const [showLibraryFilter,setShowLibraryFilter]=useState(false);
 const [previewFile,setPreviewFile]=useState(null);
 const picker=useRef(),composer=useRef(),socketRef=useRef(),bellDropdownRef=useRef(),homeFilterRef=useRef(),libraryFilterRef=useRef();
 const notificationsRef=useRef(notifications);
 const profileNameRef=useRef(profileName);

 useEffect(()=>{notificationsRef.current=notifications},[notifications]);
 useEffect(()=>{profileNameRef.current=profileName},[profileName]);

 const updateProfile = (name, pic) => {
  localStorage.setItem('relay-profile-name', name);
  localStorage.setItem('relay-profile-pic', pic);
  setProfileName(name);
  setProfilePic(pic);
  if (socketRef.current) {
    socketRef.current.emit('update-profile', { name, pic });
  }
 };

 const triggerNotification = (title, body, type) => {
   const newNotif = {
     id: Date.now() + Math.random().toString(36).substring(2, 9),
     title,
     body,
     time: new Date(),
     read: false,
     type
   };
   setNotificationsList(prev => [newNotif, ...prev]);
   if (notificationsRef.current) {
     if ('Notification' in window && Notification.permission === 'granted') {
       try {
         new Notification(title, { body, icon: '/favicon.ico' });
       } catch (e) {}
     }
     show(`${title}: ${body}`);
   }
 };

 const formatTime = d => {
   const diffMs = new Date() - new Date(d);
   const diffMins = Math.floor(diffMs / 60000);
   if (diffMins < 1) return 'Just now';
   if (diffMins < 60) return `${diffMins}m ago`;
   const diffHours = Math.floor(diffMins / 60);
   if (diffHours < 24) return `${diffHours}h ago`;
   return new Date(d).toLocaleDateString();
 };

 const getNotificationIcon = type => {
   switch (type) {
     case 'text': return <I.Clipboard size={14}/>;
     case 'link': return <I.Link2 size={14}/>;
     case 'note': return <I.NotebookPen size={14}/>;
     case 'file': return <I.FileText size={14}/>;
     case 'device': return <I.Smartphone size={14}/>;
     default: return <I.Info size={14}/>;
   }
 };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showBellDropdown && bellDropdownRef.current && !bellDropdownRef.current.contains(e.target)) {
        const bellBtn = document.querySelector('.bell-btn');
        if (bellBtn && !bellBtn.contains(e.target)) {
          setShowBellDropdown(false);
        }
      }
      if (showHomeFilter && homeFilterRef.current && !homeFilterRef.current.contains(e.target)) {
        setShowHomeFilter(false);
      }
      if (showLibraryFilter && libraryFilterRef.current && !libraryFilterRef.current.contains(e.target)) {
        setShowLibraryFilter(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showBellDropdown, showHomeFilter, showLibraryFilter]);

   useEffect(()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{})},[]);
   useEffect(()=>{fetch(`/api/info?clientPort=${window.location.port}`).then(r=>r.json()).then(info=>setServerInfo(info)).catch(()=>{})},[]);
   useEffect(()=>{
    const socket=io();
    socketRef.current=socket;
    socket.on('connect',()=>{
     setSocketId(socket.id);
     const storedName=localStorage.getItem('relay-profile-name') || '';
     const storedPic=localStorage.getItem('relay-profile-pic') || '';
     if(storedName || storedPic) {
       socket.emit('update-profile', { name: storedName, pic: storedPic });
     }
    });
    socket.on('history', items => {
      setTransfers(prev => {
        if (prev.length === 0) {
          return items;
        }
        const newItems = items.filter(newItem => !prev.some(oldItem => oldItem.id === newItem.id));
        newItems.forEach(item => {
          if (item.device !== profileNameRef.current) {
            let title = 'New Transfer';
            let body = item.name || 'A new item was shared';
            if (item.type === 'text') {
              title = 'Clipboard Received';
              body = item.content ? (item.content.length > 40 ? item.content.slice(0, 40) + '...' : item.content) : 'Text clipboard shared';
            } else if (item.type === 'link') {
              title = 'Link Received';
              body = item.content;
            } else if (item.type === 'note') {
              title = 'Note Received';
              body = item.name;
            } else if (item.type === 'file') {
              title = 'File Received';
              body = `${item.name} (${formatSize(item.size)})`;
            }
            triggerNotification(title, body, item.type);
          }
        });
        return items;
      });
    });
    socket.on('devices', list => {
      setDevices(prev => {
        if (prev.length > 0) {
          const newDevices = list.filter(d => d.id !== socket.id && !prev.some(p => p.id === d.id));
          newDevices.forEach(d => {
            triggerNotification('Device Connected', `${d.name} (${d.ip}) is now online`, 'device');
          });
        }
        return list;
      });
    });
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
    const fallbackCopyText = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    };
    const handleCopy = (text, message) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => show(message || 'Copied to clipboard'))
          .catch(() => {
            const ok = fallbackCopyText(text);
            show(ok ? (message || 'Copied to clipboard') : 'Failed to copy');
          });
      } else {
        const ok = fallbackCopyText(text);
        show(ok ? (message || 'Copied to clipboard') : 'Failed to copy');
      }
    };
    const copyFileToClipboard = async (item) => {
      const isImg = isImage(item);
      const canUseClipboard = navigator.clipboard && window.ClipboardItem;
      
      if (isImg) {
        if (!canUseClipboard) {
          const downloadUrl = window.location.origin + `/api/download/${item.id}`;
          handleCopy(downloadUrl, 'Image copy requires HTTPS or localhost (insecure context). Copied link!');
          return;
        }

        show('Copying image...');
        
        const fetchAndConvertImage = () => {
          return new Promise((resolve, reject) => {
            fetch(`/api/preview/${item.id}`)
              .then(response => {
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                return response.blob();
              })
              .then(blob => {
                if (blob.type === 'image/png') {
                  resolve(blob);
                  return;
                }
                
                const img = new Image();
                const objectUrl = URL.createObjectURL(blob);
                img.onload = () => {
                  URL.revokeObjectURL(objectUrl);
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth || img.width;
                  canvas.height = img.naturalHeight || img.height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) {
                    reject(new Error('Failed to get canvas 2d context'));
                    return;
                  }
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Canvas conversion failed'));
                  }, 'image/png');
                };
                img.onerror = () => {
                  URL.revokeObjectURL(objectUrl);
                  reject(new Error('Image loading failed'));
                };
                img.src = objectUrl;
              })
              .catch(err => reject(err));
          });
        };

        try {
          // Method 1: Try fetching the blob first, then writing directly (most reliable in Chrome/Firefox)
          const pngBlob = await fetchAndConvertImage();
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': pngBlob })
          ]);
          show('Image copied to clipboard!');
          return;
        } catch (directWriteErr) {
          console.warn('Direct clipboard write failed, trying promise-based write...', directWriteErr);
          
          try {
            // Method 2: Try Promise-based write (preferred by Safari)
            const itemPromise = fetchAndConvertImage();
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': itemPromise })
            ]);
            show('Image copied to clipboard!');
            return;
          } catch (promiseWriteErr) {
            console.error('All image copy methods failed:', promiseWriteErr);
            const errMsg = promiseWriteErr.name === 'NotAllowedError' 
              ? 'Clipboard permission denied or page not focused' 
              : (promiseWriteErr.message || String(promiseWriteErr));
            show(`Failed to copy image: ${errMsg}`);
            
            const downloadUrl = window.location.origin + `/api/download/${item.id}`;
            handleCopy(downloadUrl, 'Copied download link instead.');
          }
        }
        return;
      }

      // Check if it is a text-based file and copy its contents directly
      const isTxt = item.name && /\.(txt|json|js|jsx|ts|tsx|css|html|xml|md|csv|ini|yaml|yml)$/i.test(item.name);
      if (isTxt) {
        show('Copying file content...');
        try {
          const response = await fetch(`/api/download/${item.id}`);
          if (!response.ok) throw new Error('Network response not ok');
          const text = await response.text();
          handleCopy(text, 'File text content copied!');
          return;
        } catch (err) {
          console.error('Failed to copy file content:', err);
        }
      }
      
      const downloadUrl = window.location.origin + `/api/download/${item.id}`;
      handleCopy(downloadUrl, 'Download link copied to clipboard!');
    };
   const addFiles=async list=>{const form=new FormData();[...list].forEach(f=>form.append('files',f));form.append('senderName',profileName);show(`Uploading ${list.length} file${list.length>1?'s':''}...`);try{const items=await fetch('/api/upload',{method:'POST',body:form}).then(r=>r.json());setTransfers(x=>[...items,...x]);show(`${items.length} file${items.length>1?'s':''} stored on this PC`)}catch{show('Upload failed — check the server connection')}};
   const clipboardCount=useMemo(()=>transfers.filter(x=>x.type==='text').length,[transfers]);
   const filtered=useMemo(()=>{
    const searchFiltered = transfers.filter(x=>{
      const matchName = x.name?.toLowerCase().includes(query.toLowerCase());
      const matchContent = x.content?.toLowerCase().includes(query.toLowerCase());
      return matchName || matchContent;
    });
    if(contentFilter==='all')return searchFiltered;
    if(contentFilter==='files')return searchFiltered.filter(x=>(x.type==='file'||(!x.type&&x.path)) && !isImage(x) && !isVideo(x));
    if(contentFilter==='clipboard')return searchFiltered.filter(x=>x.type==='text');
    if(contentFilter==='links')return searchFiltered.filter(x=>x.type==='link');
    if(contentFilter==='notes')return searchFiltered.filter(x=>x.type==='note');
    if(contentFilter==='media')return searchFiltered.filter(x=>{
      const type=x.kind||x.type||'';
      const mime=x.mime||'';
      return type==='image'||type==='video'||mime.startsWith('image/')||mime.startsWith('video/')||(x.name&&/\.(png|jpe?g|gif|webp|heic|mp4|mov|webm)$/i.test(x.name));
    });
    return [];
   },[transfers,query,contentFilter]);

  return <div className={isDark ? 'app dark' : 'app'}>
   <main>
    <header>
     <div className="header-logo"><Logo/></div>
     <div className="search"><I.Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search everything..."/><kbd>⌘ K</kbd></div>
      <div className="head-actions">
        <button className="theme-btn" onClick={()=>{const next=isDark?'light':'dark';setTheme(next);localStorage.setItem('relay-theme',next)}}>{isDark?<I.Sun size={18}/>:<I.Moon size={18}/>}</button>
        <button className="header-pair-btn" title="Pair a device" onClick={()=>setActive('Help')}><I.QrCode size={18}/></button>
        <div className="bell-container">
          <button className="bell-btn" onClick={() => {
            setShowBellDropdown(!showBellDropdown);
            setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
          }} aria-label="Notifications">
            <I.Bell size={18}/>
            {notificationsList.some(n => !n.read) && <span className="bell-badge"/>}
          </button>
          {showBellDropdown && (
            <div className="bell-dropdown" ref={bellDropdownRef}>
              <div className="bell-dropdown-header">
                <h3>Notifications</h3>
                {notificationsList.length > 0 && (
                  <button onClick={() => setNotificationsList([])} className="clear-all-btn">
                    Clear all
                  </button>
                )}
              </div>
              <div className="bell-dropdown-content">
                {notificationsList.length > 0 ? (
                  notificationsList.map(n => (
                    <div key={n.id} className="notification-item">
                      <span className={`notification-icon ${n.type || 'info'}`}>
                        {getNotificationIcon(n.type)}
                      </span>
                      <div className="notification-text">
                        <b>{n.title}</b>
                        <p>{n.body}</p>
                        <small>{formatTime(n.time)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bell-empty">
                    <I.BellOff size={22} />
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button className="avatar" onClick={()=>setActive('Settings')} aria-label="Profile Settings">{profilePic ? <img src={profilePic} alt={profileName || 'You'}/> : <span>{(profileName || 'You').charAt(0).toUpperCase()}</span>}</button>
      </div>
    </header>
    <div className="content">
     {active === 'Home' ? (
       <div className="home-layout">
         <div className="home-main">
           <section className="welcome">
             <div>
               <p className="eyebrow">LOCAL NETWORK · SECURE</p>
               <h1>
                 {homeTab === 'Dashboard' 
                   ? (serverInfo ? `Welcome to ${serverInfo.name}` : 'Welcome back') 
                   : 'History'}
               </h1>
               <p>
                 {homeTab === 'Dashboard' 
                   ? 'Everything is connected and ready to share.' 
                   : 'Your history stays private on this network.'}
               </p>
             </div>
           </section>
           <section className="share-card" onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}} data-drag={drag}>
             <div className="share-copy"><span className="send-icon"><I.Send size={24}/></span><div><h2>Send something</h2><p>Drop files here or choose what you want to share.</p></div></div>
             <div className="share-actions">
               <button className="primary" onClick={()=>picker.current.click()}><I.Plus size={18}/> Choose files</button>
               <button onClick={()=>setModal('clipboard')}><I.Clipboard size={18}/> Paste text</button>
               <button onClick={()=>setModal('link')}><I.Link2 size={18}/> Share link</button>
               <button onClick={()=>setModal('note')}><I.NotebookPen size={18}/> New note</button>
             </div>
           </section>
           <div className="home-toggle-container">
             <div className="home-toggle">
               <button 
                 className={homeTab === 'Dashboard' ? 'active' : ''} 
                 onClick={() => setHomeTab('Dashboard')}
               >
                 <I.LayoutDashboard size={15} />
                 <span>Dashboard</span>
               </button>
               <button 
                 className={homeTab === 'History' ? 'active' : ''} 
                 onClick={() => setHomeTab('History')}
               >
                 <I.History size={15} />
                 <span>History</span>
               </button>
             </div>
           </div>
           <div className="home-content-wrapper">
             <div className="home-tab-content">
               {homeTab === 'Dashboard' ? <Home /> : <Library />}
             </div>
           </div>
         </div>
       </div>
     ) : active === 'Settings' ? (
       <div className="settings-page page-card">
         <Settings 
           profileName={profileName} 
           profilePic={profilePic} 
           updateProfile={updateProfile} 
           theme={theme} 
           setTheme={setTheme} 
           autoAccept={autoAccept} 
           setAutoAccept={setAutoAccept} 
           notifications={notifications} 
           setNotifications={setNotifications} 
           showToast={show} 
         />
       </div>
     ) : active === 'Help' ? (
       <div className="help-page page-card">
         <Pair />
       </div>
     ) : null}
    </div>
   </main>
   <input hidden multiple ref={picker} type="file" onChange={e=>addFiles(e.target.files)}/>
     <div className="dock">
      <div className="dock-group">
        <button
          className={`dock-item ${active==='Home'?'active':''}`}
          onClick={()=>setActive('Home')}
          data-label="Home"
        >
          <I.Home size={20}/>
        </button>
        <button
          className={`dock-item ${modal==='devices'?'active':''}`}
          onClick={()=>setModal('devices')}
          data-label="Devices"
        >
          <I.Smartphone size={20}/>
          {devices.filter(d => d.id !== socketId).length > 0 && (
            <span className="dock-badge">{devices.filter(d => d.id !== socketId).length}</span>
          )}
        </button>
        <div className="dock-divider" />
        <button
          className={`dock-item ${active==='Settings'?'active':''}`}
          onClick={()=>setActive('Settings')}
          data-label="Settings"
        >
          <I.Settings size={20}/>
        </button>
        <button
          className={`dock-item ${active==='Help'?'active':''}`}
          onClick={()=>setActive('Help')}
          data-label="Help"
        >
          <I.CircleHelp size={20}/>
        </button>
      </div>
     </div>
   {modal&&<Modal/>}{previewFile&&<FilePreviewModal item={previewFile} onClose={()=>setPreviewFile(null)}/>}{toast&&<div className="toast"><I.CheckCircle2 size={18}/>{toast}</div>}
  </div>

  function FilePreviewModal({ item, onClose }) {
    const [textContent, setTextContent] = useState(null);
    const [textLoading, setTextLoading] = useState(false);

    const isImg = isImage(item);
    const isVid = isVideo(item);
    const isAudio = (item.mime || '').startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(item.name || '');
    const isPdf = (item.mime || '') === 'application/pdf' || /\.pdf$/i.test(item.name || '');
    const isTxt = item.name && /\.(txt|json|js|jsx|ts|tsx|css|html|xml|md|csv|ini|yaml|yml|log|sh|bat|py|rb|java|c|cpp|h|go|rs|toml|env|conf)$/i.test(item.name);
    const isTextType = item.type === 'text';
    const isNote = item.type === 'note';
    const isLink = item.type === 'link';
    const isFile = item.type === 'file';
    const extension = item.name ? item.name.split('.').pop().toUpperCase() : '';

    useEffect(() => {
      if (isTxt && isFile && item.id) {
        setTextLoading(true);
        fetch(`/api/download/${item.id}`)
          .then(r => r.ok ? r.text() : Promise.reject('Failed'))
          .then(t => { setTextContent(t); setTextLoading(false); })
          .catch(() => { setTextContent('Unable to load file content.'); setTextLoading(false); });
      }
    }, [item.id]);

    useEffect(() => {
      const onKey = e => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const getIconColor = () => {
      if (isImg) return 'mint';
      if (isVid || isAudio) return 'rose';
      if (isPdf) return 'coral';
      if (isTxt) return 'blue';
      if (isTextType) return 'amber';
      if (isNote) return 'mint';
      if (isLink) return 'violet';
      return item.color || 'blue';
    };

    const getIcon = () => {
      if (isImg) return I.Image;
      if (isVid) return I.Film;
      if (isAudio) return I.Music;
      if (isPdf) return I.FileText;
      if (isTxt) return I.Code;
      if (isTextType) return I.Clipboard;
      if (isNote) return I.NotebookPen;
      if (isLink) return I.Link2;
      return I.File;
    };

    const getTitle = () => {
      if (isFile) return item.name;
      if (isTextType) return 'Clipboard Text';
      if (isNote) return item.name || 'Shared Note';
      if (isLink) return 'Shared Link';
      return item.name || 'File';
    };

    const getMeta = () => {
      if (isFile && item.size) return `${extension} · ${formatSize(item.size)}`;
      if (isTextType && item.content) return `${item.content.length} characters`;
      if (isNote && item.content) return `${item.content.length} characters`;
      if (isLink) return item.content || '';
      return extension || item.type || '';
    };

    const IconComponent = getIcon();
    const iconColor = getIconColor();

    const renderContent = () => {
      if (isImg && isFile) {
        return <img src={`/api/preview/${item.id}`} alt={item.name} />;
      }
      if (isVid && isFile) {
        return <video src={`/api/preview/${item.id}`} controls autoPlay playsInline />;
      }
      if (isAudio && isFile) {
        return <audio src={`/api/preview/${item.id}`} controls autoPlay />;
      }
      if (isPdf && isFile) {
        return <iframe src={`/api/preview/${item.id}`} title={item.name} />;
      }
      if (isTxt && isFile) {
        if (textLoading) return <div className="file-preview-fallback"><I.Loader size={24} className="spin" /><p>Loading file content...</p></div>;
        return <pre className="file-preview-text">{textContent}</pre>;
      }
      if (isTextType) {
        return <div className="file-preview-text-content">{item.content}</div>;
      }
      if (isNote) {
        return <div className="file-preview-text-content">{item.content}</div>;
      }
      if (isLink) {
        return (
          <div className="file-preview-fallback">
            <span className={`file-preview-fallback-icon ${iconColor}`}><I.Link2 size={32} /></span>
            <h3>Shared Link</h3>
            <a href={item.content} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', fontSize: 13, wordBreak: 'break-all' }}>
              {item.content} <I.ExternalLink size={12} style={{ marginLeft: 4 }} />
            </a>
            <button className="primary" onClick={() => handleCopy(item.content, 'Link copied!')}><I.Copy size={14} /> Copy Link</button>
          </div>
        );
      }
      return (
        <div className="file-preview-fallback">
          <span className={`file-preview-fallback-icon ${iconColor}`}><IconComponent size={32} /></span>
          <h3>{item.name || 'File'}</h3>
          <p>This file type cannot be previewed. Download to view it.</p>
          {isFile && item.id && (
            <a className="primary" href={`/api/download/${item.id}`} style={{ textDecoration: 'none' }}>
              <I.Download size={14} /> Download
            </a>
          )}
        </div>
      );
    };

    return (
      <div className="file-preview-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="file-preview-container">
          <div className="file-preview-header">
            <div className="file-preview-header-info">
              <span className={`file-preview-header-icon ${iconColor}`}><IconComponent size={18} /></span>
              <div className="file-preview-header-text">
                <b title={getTitle()}>{getTitle()}</b>
                <small>{getMeta()}</small>
              </div>
            </div>
            <div className="file-preview-header-actions">
              {isFile && item.id && (
                <>
                  <button onClick={() => copyFileToClipboard(item)} title="Copy"><I.Copy size={15} /></button>
                  <a href={`/api/download/${item.id}`} title="Download"><I.Download size={15} /></a>
                </>
              )}
              {(isTextType || isNote) && (
                <button onClick={() => handleCopy(item.content, 'Copied!')} title="Copy text"><I.Copy size={15} /></button>
              )}
              {isLink && (
                <button onClick={() => handleCopy(item.content, 'Link copied!')} title="Copy link"><I.Copy size={15} /></button>
              )}
            </div>
            <button className="file-preview-close" onClick={onClose} title="Close"><I.X size={16} /></button>
          </div>
          <div className="file-preview-content">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  function Home() {
    return <>
      <section>
        <div className="section-title">
          <div>
            <h2>Recent activity</h2>
            <p>Your latest transfers and shares</p>
          </div>
          <div className="desktop-filters-group">
            {filterTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={contentFilter === tab.id ? 'selected' : ''}
                  onClick={() => setContentFilter(tab.id)}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="mobile-filter-container" ref={homeFilterRef}>
            <button className={`mobile-filter-btn icon-only ${contentFilter !== 'all' ? 'active' : ''}`} onClick={() => setShowHomeFilter(!showHomeFilter)} title="Filter recent activity">
              <I.SlidersHorizontal size={15} />
              {contentFilter !== 'all' && <span className="filter-active-dot" />}
            </button>
            {showHomeFilter && (
              <div className="filter-dropdown right-aligned">
                {filterTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={contentFilter === tab.id ? 'selected' : ''}
                      onClick={() => {
                        setContentFilter(tab.id);
                        setShowHomeFilter(false);
                      }}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <TransferList list={filtered.slice(0,4)}/>
      </section>
    </>;
  }

  function Library() {
    return <section className="library">
      <div className="section-title">
        <div>
          <h2>History</h2>
          <p>Your shared history on this network</p>
        </div>
        <div className="library-actions-group">
          <div className="mobile-filter-container" ref={libraryFilterRef}>
            <button className={`mobile-filter-btn icon-only ${contentFilter !== 'all' ? 'active' : ''}`} onClick={() => setShowLibraryFilter(!showLibraryFilter)} title="Filter library">
              <I.SlidersHorizontal size={15} />
              {contentFilter !== 'all' && <span className="filter-active-dot" />}
            </button>
            {showLibraryFilter && (
              <div className="filter-dropdown right-aligned">
                {filterTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={contentFilter === tab.id ? 'selected' : ''}
                      onClick={() => {
                        setContentFilter(tab.id);
                        setShowLibraryFilter(false);
                      }}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="view-toggle">
            <button className={viewMode==='list'?'selected':''} onClick={()=>{setViewMode('list');localStorage.setItem('relay-view-mode','list')}} title="List view"><I.List size={16}/></button>
            <button className={viewMode==='grid'?'selected':''} onClick={()=>{setViewMode('grid');localStorage.setItem('relay-view-mode','grid')}} title="Grid view"><I.LayoutGrid size={16}/></button>
          </div>
        </div>
      </div>
      <TransferList list={filtered}/>
    </section>;
  }

  function TransferCard({item}){
    const isImg = isImage(item);
    const isVid = isVideo(item);
    const isF = item.type === 'file';
    
    const cardHeader = (
      <div className="card-header">
        <span className="card-device">
          <I.Laptop size={11} /> {item.device || 'Local device'}
        </span>
        <time className="card-time">{item.time || new Date(item.timestamp).toLocaleDateString()}</time>
      </div>
    );

    const cardFooter = (
      <div className="card-footer">
        <span className="complete"><I.Check size={11}/> {item.status}</span>
        {item.path ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button aria-label="Copy file" onClick={() => copyFileToClipboard(item)} title="Copy file" style={{ border: 0, background: 'transparent', padding: '4px', cursor: 'pointer', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}>
              <I.Copy size={16}/>
            </button>
            <a className="download" href={`/api/download/${item.id}`} aria-label="Download" title="Download file" style={{ display: 'grid', placeItems: 'center' }}>
              <I.Download size={16}/>
            </a>
          </div>
        ) : (
          <button aria-label="Copy content" onClick={() => handleCopy(item.content, 'Content copied!')} title="Copy content">
            <I.Copy size={16}/>
          </button>
        )}
      </div>
    );

    if (isF) {
      const extension = item.name ? item.name.split('.').pop().toUpperCase() : 'FILE';
      return (
        <div className={`transfer-card file ${item.color || 'blue'}`} key={item.id}>
          {cardHeader}
          <div className="card-preview media clickable" onClick={() => setPreviewFile(item)}>
            {isImg ? (
              <img src={`/api/preview/${item.id}`} alt={item.name} loading="lazy" />
            ) : isVid ? (
              <video
                src={`/api/preview/${item.id}`}
                muted
                playsInline
                preload="metadata"
                onMouseEnter={e => e.target.play().catch(()=>{})}
                onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
              />
            ) : (
              <div className="card-file-fallback">
                <span className="fallback-icon"><FileIcon kind={item.kind || item.type} /></span>
                <span className="fallback-ext">{extension}</span>
              </div>
            )}
            {isVid && <span className="video-badge"><I.Play size={10} fill="currentColor"/> VIDEO</span>}
            {isImg && <span className="image-badge"><I.Image size={10}/> IMAGE</span>}
          </div>
          <div className="card-details">
            <b className="card-name" title={item.name}>{item.name}</b>
            <small className="card-meta">{formatSize(item.size)}</small>
          </div>
          {cardFooter}
        </div>
      );
    } else if (item.type === 'text') {
      return (
        <div className={`transfer-card text amber`} key={item.id}>
          {cardHeader}
          <div className="card-preview content-preview clickable" onClick={() => setPreviewFile(item)}>
            <span className="preview-icon"><I.Clipboard size={14}/></span>
            <div className="preview-text">{item.content}</div>
          </div>
          <div className="card-details">
            <b className="card-name">Clipboard Text</b>
            <small className="card-meta">{item.content ? item.content.length : 0} chars</small>
          </div>
          {cardFooter}
        </div>
      );
    } else if (item.type === 'link') {
      const displayUrl = item.content ? item.content.replace(/https?:\/\/(www\.)?/, '') : '';
      return (
        <div className={`transfer-card link violet`} key={item.id}>
          {cardHeader}
          <div className="card-preview content-preview clickable" onClick={() => setPreviewFile(item)}>
            <span className="preview-icon"><I.Link2 size={14}/></span>
            <a href={item.content} target="_blank" rel="noopener noreferrer" className="preview-link" title="Open link">
              {displayUrl} <I.ExternalLink size={10} style={{ marginLeft: 3 }}/>
            </a>
          </div>
          <div className="card-details">
            <b className="card-name">Shared Link</b>
            <small className="card-meta">Web link</small>
          </div>
          {cardFooter}
        </div>
      );
    } else if (item.type === 'note') {
      return (
        <div className={`transfer-card note mint`} key={item.id}>
          {cardHeader}
          <div className="card-preview content-preview clickable" onClick={() => setPreviewFile(item)}>
            <span className="preview-icon"><I.NotebookPen size={14}/></span>
            <div className="preview-text note-body">{item.content}</div>
          </div>
          <div className="card-details">
            <b className="card-name">{item.name || 'Shared Note'}</b>
            <small className="card-meta">Note</small>
          </div>
          {cardFooter}
        </div>
      );
    }

    return (
      <div className="transfer-card default" key={item.id}>
        {cardHeader}
        <div className="card-details">
          <b className="card-name">{item.name}</b>
          <small className="card-meta">{item.type}</small>
        </div>
        {cardFooter}
      </div>
    );
  }

  function TransferList({list}){
    if (viewMode === 'grid') {
      return <div className="transfer-grid">{list.length ? list.map(x => <TransferCard key={x.id} item={x} />) : <Empty />}</div>;
    }
    return <div className="transfer-list">{list.length?list.map(x=><div className="transfer clickable" key={x.id} onClick={(e)=>{if(!e.target.closest('a')&&!e.target.closest('button'))setPreviewFile(x)}}><span className={`file-icon ${x.color||'blue'}`}><FileIcon kind={x.kind||x.type}/></span><div className="file-name"><b>{x.name}</b><small>{x.meta||`${x.device||'Local device'} · ${x.size?formatSize(x.size):x.type||'Share'}`}</small></div><span className="complete"><I.Check size={13}/> {x.status}</span><time>{x.time||new Date(x.timestamp).toLocaleDateString()}</time>{x.path ? (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button className="download" onClick={() => copyFileToClipboard(x)} title="Copy file" aria-label="Copy file" style={{ border: 0, background: 'transparent', padding: '4px', cursor: 'pointer', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}>
          <I.Copy size={18}/>
        </button>
        <a className="download" href={`/api/download/${x.id}`} aria-label="Download" title="Download file" style={{ display: 'grid', placeItems: 'center' }}>
          <I.Download size={18}/>
        </a>
      </div>
    ) : (
      <button aria-label="Copy content" onClick={() => handleCopy(x.content, 'Content copied!')} title="Copy content" style={{ border: 0, background: 'transparent', padding: '4px', cursor: 'pointer', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}>
        <I.Copy size={18}/>
      </button>
    )}</div>):<Empty/>}</div>;
  }
  function Empty(){
    const currentFilterLabel = filterTabs.find(t => t.id === contentFilter)?.label || 'items';
    const label = contentFilter === 'all' ? 'items' : currentFilterLabel.toLowerCase();
    const X = contentFilter === 'clipboard' ? I.Clipboard
            : contentFilter === 'links' ? I.Link2
            : contentFilter === 'notes' ? I.NotebookPen
            : contentFilter === 'media' ? I.Images
            : contentFilter === 'files' ? I.Files
            : I.History;
    return <div className="empty"><span><X size={28}/></span><h3>No {label} yet</h3><p>Anything you share will appear here and stay on this device.</p></div>
  }
  function Modal(){return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal"><button className="close" onClick={()=>setModal(null)}><I.X size={19}/></button>{modal==='devices'?<DevicesModal/>:<Composer/>}</div></div>}
  function DevicesModal() {
    return <>
      <span className="modal-icon"><I.Smartphone/></span>
      <h2>Nearby Devices</h2>
      <p>Devices on your local network</p>
      <div className="modal-devices-container">
        {devices.length ? (
          devices.map(d => {
            const isMe = d.id === socketId;
            const Icon = I[d.icon] || I.Smartphone;
            const displayName = isMe ? (profileName || d.name) : d.name;
            const displayPic = isMe ? profilePic : d.pic;
            return (
              <button className="device" key={d.id} onClick={() => show(isMe ? 'This is your current device' : `${displayName} (${d.ip}) is connected`)}>
                <div className={`device-icon ${displayPic ? 'custom-avatar' : d.color}`}>
                  {displayPic ? <img src={displayPic} alt={displayName}/> : <Icon size={23}/>}
                  <i className="on"/>
                </div>
                <div className="device-text">
                  <b>{displayName} {isMe && '(This device)'}</b>
                  <small>{isMe ? 'Active' : d.ip}</small>
                </div>
                <span className="signal"><I.Signal size={17}/></span>
                {!isMe && <span className="chev">›</span>}
              </button>
            );
          })
        ) : (
          <div className="empty" style={{ padding: '20px 10px' }}>
            <span><I.WifiOff size={24}/></span>
            <h3>No other devices</h3>
            <p>Scan the QR code to connect.</p>
          </div>
        )}
      </div>
      <button className="primary full" onClick={()=>show('Network scan refreshed')} style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
        <I.RefreshCw size={15}/> Refresh scan
      </button>
    </>;
  }
 function Pair(){return <><span className="modal-icon"><I.QrCode/></span><h2>Connect your device</h2><p>Keep both devices on the same Wi-Fi, then scan this QR code with your phone or tablet camera.</p>{serverInfo?<img className="real-qr" src={serverInfo.qr} alt={`QR code for ${serverInfo.url}`}/>:<div className="qr"/>}<div className="server-url">{serverInfo?.url||'Starting local server…'}</div><small className="secure"><I.Lock size={13}/> Files stay on this Windows PC · Local network only</small></>}
 function Composer(){let title=modal==='clipboard'?'Paste text':modal==='link'?'Share a link':'New note';const send=async()=>{const content=composer.current?.value||'';if(!content.trim())return;const item=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:modal==='clipboard'?'text':modal,content,senderName:profileName})}).then(r=>r.json());setTransfers(x=>[item,...x]);setModal(null);show(`${title} shared successfully`)};return <><span className="modal-icon">{modal==='clipboard'?<I.Clipboard/>:modal==='link'?<I.Link2/>:<I.NotebookPen/>}</span><h2>{title}</h2><p>It will be available instantly to devices on your network.</p>{modal==='link'?<input ref={composer} className="composer" placeholder="https://example.com" autoFocus/>:<textarea ref={composer} className="composer" rows="5" placeholder="Type or paste here..." autoFocus/>}<button className="primary full" onClick={send}><I.Send size={17}/> Share now</button></>}
}
function Settings({ profileName, profilePic, updateProfile, theme, setTheme, autoAccept, setAutoAccept, notifications, setNotifications, showToast }) {
  const profilePicInput = useRef(null);
  const handlePicChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateProfile(profileName, reader.result);
    };
    reader.readAsDataURL(file);
  };

  return <>
     <span className="modal-icon"><I.User/></span>
     <h2>Profile & Settings</h2>
     <p>Customize your profile and preferences.</p>
     
     <div className="profile-edit">
       <div className="avatar-edit">
         <div className="avatar-preview">
           {profilePic ? <img src={profilePic} alt="Preview"/> : <span>{(profileName || 'You').charAt(0).toUpperCase()}</span>}
         </div>
         <div className="avatar-edit-actions">
           <button className="primary" onClick={()=>profilePicInput.current?.click()}><I.Camera size={14}/> Change Photo</button>
           {profilePic && <button className="danger" onClick={()=>updateProfile(profileName, '')}><I.Trash size={14}/> Remove</button>}
           <input type="file" ref={profilePicInput} hidden accept="image/*" onChange={handlePicChange}/>
         </div>
       </div>
       <label className="setting-input">
         <span><b>Display name</b></span>
         <input type="text" value={profileName} onChange={e=>updateProfile(e.target.value, profilePic)} placeholder="Enter your name..."/>
       </label>
     </div>

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
          if (next) {
            if (!('Notification' in window)) {
              showToast('Notifications not supported by this browser');
              return;
            }
            if (Notification.permission === 'denied') {
              showToast('Notifications are blocked by browser settings');
            } else {
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                  try {
                    new Notification('Relay', { body: 'Notifications enabled!' });
                  } catch (err) {}
                }
              });
            }
          }
          setNotifications(next);
          localStorage.setItem('relay-notifications', String(next));
        }}/>
      </label>
      <div className="privacy">
        <I.ShieldCheck size={20}/>
        <div>
          <b>Private by design</b>
          <small>Nothing leaves your network</small>
        </div>
      </div>
    </>;
}
function formatSize(n){if(n<1e6)return Math.round(n/1e3)+' KB';if(n<1e9)return (n/1e6).toFixed(1)+' MB';return (n/1e9).toFixed(1)+' GB'}
createRoot(document.getElementById('root')).render(<App/>);

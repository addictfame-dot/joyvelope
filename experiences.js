(() => {
"use strict";
const c = (kind, title, text, button) => ({ kind, title, text, button });
const PHOTO = c("photos", "Some moments are worth keeping", "Turn through the photos I picked for you.", "Continue");
const LETTER = c("letter", "For you, Maya", "I hope this next year brings you slow mornings, good surprises, and countless reasons to laugh. Thank you for letting me celebrate another year of you. With love, Aarav.", "One last thing");
const FINALE = c("finale", "Happy birthday, Maya!", "I hope you felt a little extra loved today. ♡", "Replay");
const PIN = c("pin", "A little password", "Hint: our date in DDMM. Demo code: 1107.", "Continue");
const templates = {
  "birthday-party": { name:"Birthday Party", category:"Birthday", subtitle:"Sealed envelope, party lights and cake", mascot:"teddy", scenes:[
    c("envelope","There’s something for you","A little birthday surprise, sealed with love.","Open your surprise"),
    c("lights","The room is waiting for you","Everyone’s here. It’s time for the surprise.","Turn on the lights"),
    c("cakecut","Make the first cut","The first slice is yours.","Cut the cake"),
    c("candle","Close your eyes…","Think of a wish before you blow out the candle.","Blow out the candle"),
    PHOTO,LETTER,FINALE] },
  "birthday-secret": { name:"Secret Birthday Gift", category:"Birthday", subtitle:"Curtain, keypad and heart boxes", mascot:"teddy", scenes:[
    c("curtain","Your secret birthday premiere","A little show for my favourite person.","Open the curtain"), PIN,
    c("question","Are you ready for your surprise?","I’ve been waiting to show you this.","Continue"),
    c("boxes","Pick a heart box","A favourite memory\nA little birthday wish\nOne more reason you make me smile","Continue"),
    {...PHOTO,title:"The birthday wall"},LETTER,
    c("candle","Make a wish!","This one’s yours.","Blow out the candle"),FINALE] },
  "birthday-midnight": { name:"Midnight Birthday", category:"Birthday", subtitle:"Countdown, balloon wishes and photo puzzle", scenes:[
    c("box","A surprise awaits you","I’ve been saving this for midnight.","Unwrap your gift"),PIN,
    c("curtain","Welcome to your birthday show","The best part of tonight is about to start.","Open the curtain"),
    c("countdown","Almost time","The final few seconds before your surprise.","Start countdown"),
    c("candle","Make a wish, Maya","Here’s to more nights like this.","Blow out the candle"),PHOTO,
    c("balloons","Pop the little wishes","More road trips together\nMore sunsets by the sea\nMore reasons to laugh","Continue"),
    c("puzzle","Put this memory back together","Tap two pieces to swap them.","Continue"),
    c("scratch","One last surprise","A dinner date, my treat. ♡","Continue"),LETTER,FINALE] },
  "anniversary": { name:"Our Firsts", category:"Anniversary", subtitle:"Red scrapbook, calendar and wax-sealed keepsakes", mascot:"cat", scenes:[
    c("envelope","You have a little card","For my favourite person, on our anniversary.","Open the card"),
    c("card","Happy anniversary","Here’s to everything that brought us to today.","Turn the page"),
    c("calendar","The day it began","2023-11-07","Our firsts"),
    c("firsts","Our firsts","First hello · We talked until the café closed.\nFirst trip · We took the wrong turn and found the beach.\nFirst photo · We couldn’t stop laughing.","Read my letter"),
    c("letter","Three years of us","Of everything that changed over these years, the best part is how much more I know you now. I’d still choose the seat next to you.","Continue"),
    c("finale","Happy anniversary, my love","To the next page in our story.","Replay")] },
  "rose-gift": { name:"From Me to You", category:"Love", subtitle:"Cream stationery, blooming roses and a photo wall", scenes:[
    c("box","For you, my love","A little reminder of how much you mean to me.","Open your gift"),
    c("roses","From me to you","In your smile, I found my peace. In your love, I found my home.","Keep going"),PIN,
    c("wall","My favourite memories with you","A few things I never want to forget.","Open my letter"),
    c("letter","My love,","I still think about the little moments when nobody else was watching. All those memories feel like home to me. I hope we get years and years to make more.","Continue"),
    c("finale","I will always love you","With all my love. ♡","Replay")] },
  "love-mail": { name:"You’ve Got Mail", category:"Love", subtitle:"Red stationery with letter, playlist and memories", scenes:[
    c("envelope","You’ve got mail","A little parcel for when you miss me.","Open the envelope"),
    c("hub","Pick something from the envelope","My letter\nThings I love about you\nOur little soundtrack\nMoments I’d relive","Continue"),
    c("letter","For my favourite person","Whenever I miss you, I think of all the little things you do that make my day better. This is a little piece of my world for you to keep.","Next"),
    c("list","10 things I love about you","Your smile when you’re trying not to laugh\nHow you make people feel at home\nThe way you remember tiny things\nYour sleepy voice notes\nOur silly inside jokes\nHow kind you are on hard days\nHow proud you make me\nThe songs you send me\nYour excitement over little plans\nHow easy it is to be myself with you","Next"),
    c("playlist","Our little soundtrack","First song we shared\nThe one from the late-night drive\nOur song","Next"),
    c("wall","Moments I’d relive with you","A little collection of days that felt like us.","Continue"),
    c("finale","You are my favourite place","Come back whenever you miss me.","Replay")] },
  "panda-sorry": { name:"I’m Sorry, Panda", category:"Sorry", subtitle:"Pastel flowers, panda card and penguin reveal", mascot:"panda", scenes:[
    c("apology","I’m sorry 🥺","I didn’t handle that well. I’m sorry for hurting you. Can we talk whenever you feel ready?","Continue"),
    c("finale","Thank you for hearing me out","I care about you and I’ll do better. ♡","Replay")] },
  "bunny-sorry": { name:"Catch a Little Love", category:"Sorry", subtitle:"Pink paper notes, photos and a heart-catching game", mascot:"bunny", scenes:[
    c("card","I’m sorry","I made this because I wanted to say it properly.","Open my apology"),
    c("letter","I should have listened","I got defensive when I should have listened. You deserved better from me, and I want to make things right without rushing you.","Continue"),
    c("list","I’m bad at saying sorry, but I’m trying","I made a joke when I should have listened.\nI let little things pile up.\nI didn’t notice how much you were carrying.\nNext time, I’ll ask how you feel and listen.","Our memories"),
    c("photos","Our memories","Even the ordinary days with you mean a lot to me.","Catch a little love"),
    c("hearts","Catch a Little Love","Tap the hearts before they float away.","Start game"),
    c("finale","I’m sorry, and I love you","I can’t promise I’ll never stumble. I can promise to keep showing up and listening. Take your time.","Read it again")] }
};
const root = document.querySelector("#experience-app");
const legacy = document.querySelector("#app");
const config = window.JOYW_CONFIG || {};
const shareTokens = /^[A-Za-z0-9_-]{43}$/;
const storageKey = "joyvelope-experience-drafts-v1";
let session = null;
let routeRequest = 0;
let timer;
let sharing = false;
let sharedUrl = "";
const escape = value => String(value ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
const asset = name => "./assets/"+name+".png";
const referenceArt = (name, extra = "") =>
  '<img class="jx-reference-art '+extra+'" src="./assets/ref-'+name+'.png" alt="">';
const drawing = name => ["teddy","panda","penguin","bunny"].includes(name)
  ? referenceArt(name, "jx-mascot") : '<img class="jx-mascot" src="'+asset(name)+'" alt="">';
const coverArtwork = {
  "birthday-party":"envelope", "birthday-secret":"teddy", "birthday-midnight":"rose-box",
  "rose-gift":"rose-box", "love-mail":"envelope", "panda-sorry":"panda", "bunny-sorry":"bunny"
};
const action = (label,name,value="",more="") => '<button type="button" class="jx-btn '+more+'" data-action="'+name+'" data-val="'+value+'">'+escape(label)+'</button>';
const type = () => templates[session.gift.id];
const values = scene => scene.text.split("\n").map(v=>v.trim()).filter(Boolean);
const defaultPart = () => ({ view:"edit", scene:0, edit:0, open:false, pick:0, notes:[], digits:"", wrong:false, tiles:[1,0,2,3,5,4,6,8,7], tile:-1, scratch:[], count:null, result:"", score:0, beat:0 });
function newExperience(id) {
  return { version:1,id,pin:"1107",scenes:templates[id].scenes.map(({title,text,button,kind})=>({title,text,button,after:"",...(kind==="apology"?{yes:"Yes",no:"Not yet",decline:"Of course. Take the time you need. ♡"}:{})})), photos:[] };
}
function clean(raw, photos=[]) {
  if (!raw || raw.version!==1 || !Object.hasOwn(templates,raw.id) || !Array.isArray(raw.scenes) || raw.scenes.length!==templates[raw.id].scenes.length) throw new Error("This gift cannot be opened.");
  const result=newExperience(raw.id);
  result.pin=/^\d{4}$/.test(raw.pin)?raw.pin:"1107";
  result.scenes=raw.scenes.map((scene,i)=>{
    const defaults=result.scenes[i];
    return {...defaults,title:String(scene?.title??"").slice(0,120),text:String(scene?.text??"").slice(0,1600),button:String(scene?.button||defaults.button).slice(0,42),
      after:String(scene?.after??"").slice(0,42),
      ...(defaults.yes?{yes:String(scene?.yes||defaults.yes).slice(0,42),no:String(scene?.no||defaults.no).slice(0,42),decline:String(scene?.decline||defaults.decline).slice(0,1600)}:{})};
  });
  result.photos=Array.isArray(photos)?photos.slice(0,6).filter(p=>typeof p==="string"&&(/^(data:image\/jpeg;base64,[A-Za-z0-9+/=]+)$/.test(p)||(/^https:\/\/[^/"<>]+\/storage\/v1\/object\/sign\/[A-Za-z0-9_./%?=&-]+$/.test(p)))):[];
  return result;
}
function resetScene(index) {
  clearInterval(timer);
  Object.assign(session,{...defaultPart(),view:session.view,edit:session.edit,scene:index});
}
function readDrafts() {
  try { return JSON.parse(localStorage.getItem(storageKey)||"{}"); }
  catch { return {}; }
}
function save() {
  try {
    const records=readDrafts();
    records[session.gift.id]=session.gift;
    localStorage.setItem(storageKey,JSON.stringify(records));
    notice("Draft saved on this device.");
  } catch { notice("Storage is full. Free some space before saving."); }
}
function notice(text) {
  const line=root.querySelector(".jx-status");
  if (line) line.textContent=text;
}
function brand() {
  return '<header class="jx-head"><a href="#home"><img src="./icon.svg" alt=""> Joyvelope</a><a href="#experiences">All templates</a></header>';
}
function cards() {
  return Object.entries(templates).map(([id,t])=>'<a href="#experience/'+id+'" class="jx-tile jx-'+id+'"><div class="jx-thumb">'+(coverArtwork[id]?referenceArt(coverArtwork[id]):drawing(t.mascot))+'</div><div><small>'+t.category+'</small><h2>'+escape(t.name)+'</h2><p>'+escape(t.subtitle)+'</p></div></a>').join("");
}
function chooser() {
  root.innerHTML=brand()+'<main class="jx-wrap"><h1>Gift templates</h1><div class="jx-grid">'+cards()+'</div></main>';
}
function editForm() {
  const scene=session.gift.scenes[session.edit], refs=type().scenes;
  const options=refs.map((s,i)=>'<option value="'+i+'"'+(i===session.edit?' selected':'')+'>'+escape((i+1)+". "+s.title)+'</option>').join("");
  return '<section class="jx-editor" aria-label="Edit gift text"><label>Scene<select id="jx-edit">'+options+'</select></label>'+
    '<label>Heading<input data-key="title" maxlength="120" value="'+escape(scene.title)+'"></label>'+
    '<label>Message<textarea data-key="text" maxlength="1600">'+escape(scene.text)+'</textarea></label>'+
    '<label>Button text<input data-key="button" maxlength="42" value="'+escape(scene.button)+'"></label>'+
    (art[refs[session.edit].kind]&&refs[session.edit].kind!=="roses"?'<label>After reveal button<input data-key="after" maxlength="42" placeholder="Continue" value="'+escape(scene.after)+'"></label>':"")+
    (refs[session.edit].kind==="apology"?'<label>Yes button<input data-key="yes" maxlength="42" value="'+escape(scene.yes)+'"></label><label>Later button<input data-key="no" maxlength="42" value="'+escape(scene.no)+'"></label><label>Later message<textarea data-key="decline" maxlength="1600">'+escape(scene.decline)+'</textarea></label>':"")+
    (refs[session.edit].kind==="pin"?'<label>4-digit surprise PIN<input inputmode="numeric" data-key="pin" maxlength="4" value="'+escape(session.gift.pin)+'"></label>':"")+
    '<label>Gift photos · '+session.gift.photos.length+' / 6<input id="jx-photos" type="file" accept="image/*" multiple></label>'+
    '<div class="jx-actions">'+action("Save draft","save")+action("Play as recipient","preview","", "primary")+(session.gift.photos.length?action("Clear photos","clearphotos"):"")+'</div>'+
    '<div class="jx-actions">'+action(sharing?"Publishing…":"Publish gift link","share")+'</div>'+
    (sharedUrl?'<label>Gift link<input id="jx-link" readonly value="'+escape(sharedUrl)+'"></label><div class="jx-actions">'+action("Copy link","copy")+'<a href="'+escape(sharedUrl)+'" target="_blank" rel="noopener">Open live gift ↗</a><a href="https://wa.me/?text='+encodeURIComponent(sharedUrl)+'" target="_blank" rel="noopener">WhatsApp ↗</a></div>':"")+
    '<p class="jx-status" role="status"></p></section>';
}
function view() {
  const t=type();
  const screen = '<div id="jx-stage"></div>';
  if (session.view==="edit") {
    root.innerHTML=brand()+'<main class="jx-wrap"><h1>'+escape(t.name)+'</h1><div class="jx-layout">'+editForm()+screen+'</div></main>';
  } else {
    root.innerHTML=brand()+'<main class="jx-wrap jx-player'+(session.view==="recipient"?' jx-immersive':'')+'">'+(session.view==="preview"?'<div class="jx-actions">'+action("‹ Back to editor","edit")+'</div>':"")+screen+'</main>';
  }
  renderScene();
}
const art = {
  envelope:'<div class="jx-envelope"><span>♥</span></div>',
  box:'<div class="jx-box"><span></span><b>∞</b></div>',
  lights:'<div class="jx-lamp"><span>✦</span><b>✧</b></div>',
  curtain:'<div class="jx-curtain"><span>✦</span><i></i><i></i></div>',
  cakecut:'<div class="jx-cut"><i></i><i></i><b></b></div>',
  candle:'<div class="jx-cake"><i class="tier"></i><i class="wick"></i><i class="flame"></i><i class="smoke"></i></div>',
  roses:'<div class="jx-roses">✿ ❀ ✿<br>❀ ✿ ❀</div>'
};
function photo(i) {
  const url=session.gift.photos[i];
  return '<figure class="jx-photo art-'+(i%3)+'">'+(url?'<img src="'+escape(url)+'" alt="Gift memory '+(i+1)+'">':'<span>Memory '+(i+1)+'</span>')+'</figure>';
}
function calendar(date) {
  const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(date)?date+"T12:00:00":"2023-11-07T12:00:00");
  if (Number.isNaN(parsed.getTime())) return "";
  const day=parsed.getDate(), first=new Date(parsed.getFullYear(),parsed.getMonth(),1).getDay();
  const days=new Date(parsed.getFullYear(),parsed.getMonth()+1,0).getDate();
  return '<div class="jx-paper jx-calendar"><b>'+escape(parsed.toLocaleDateString("en",{month:"long",year:"numeric"}))+'</b><div>'+
    "SMTWTFS".split("").map(v=>"<small>"+v+"</small>").join("")+"<span></span>".repeat(first)+
    Array.from({length:days},(_,i)=>'<span'+(i+1===day?' class="chosen"':'')+'>'+(i+1)+'</span>').join("")+'</div></div>';
}
function confetti() {
  return '<div class="jx-confetti" aria-hidden="true">'+Array.from({length:24},(_,i)=>'<i style="--x:'+((i*37)%100)+'%;--delay:'+((i%7)*35)+'ms;--h:'+((i*81)%360)+'"></i>').join("")+'</div>';
}
function sceneDecor(id, kind) {
  if (id==="birthday-party" && ["envelope","lights","finale"].includes(kind)) {
    return '<div class="jx-decor" aria-hidden="true">'+referenceArt("teddy","jx-side-teddy")+'</div>';
  }
  if (id==="rose-gift" && kind==="roses") {
    return '<div class="jx-decor" aria-hidden="true">'+referenceArt("floral","jx-floral-left")+referenceArt("floral","jx-floral-right")+'</div>';
  }
  if (id==="love-mail") {
    return '<div class="jx-decor" aria-hidden="true">'+referenceArt("ribbon","jx-ribbon")+'<div class="jx-gingham"></div></div>';
  }
  return "";
}
function sceneArt(id, kind) {
  if (kind==="envelope" && ["birthday-party","love-mail","anniversary"].includes(id)) {
    if (session.open) return '<div class="jx-open-card">'+referenceArt("envelope")+'</div>';
    return referenceArt("envelope");
  }
  if (kind==="box" && id==="rose-gift") {
    return session.open
      ? '<div class="jx-open-card">'+referenceArt("floral")+'</div>' : referenceArt("rose-box");
  }
  if (kind==="roses") return referenceArt("floral");
  return art[kind];
}
function renderScene(effect=false) {
  const stage=root.querySelector("#jx-stage");
  if (!stage || !session) return;
  const n=session.view==="edit"?session.edit:session.scene;
  const t=type(), original=t.scenes[n], s=session.gift.scenes[n];
  const kind=original.kind;
  const navBack=n>0&&session.view!=="edit"?action("‹ Back","previous"):"";
  const advance=action(["envelope","box","lights","curtain","cakecut","candle"].includes(kind)?(s.after||"Continue →"):s.button,"next","","primary");
  let main="", buttons=advance, copy=kind==="calendar"?"":s.text;
  if (art[kind]) {
    main='<div class="jx-object" aria-hidden="true">'+sceneArt(session.gift.id,kind)+'</div>';
    if (["envelope","box","lights","curtain","cakecut","candle"].includes(kind)&&!session.open) {
      buttons=action(s.button,"reveal","","primary");
    }
    if (kind==="envelope"&&session.open) main+='<div class="jx-letter-peek">For you ♡</div>';
  } else if (kind==="letter"||kind==="card") {
    main='<article class="jx-paper">'+(kind==="card"&&t.mascot?drawing(t.mascot):"")+(kind==="card"&&session.gift.id==="anniversary"?referenceArt("ribbon","jx-ribbon"):"")+'<p>'+escape(s.text)+'</p></article>'; copy="";
  } else if (kind==="calendar") {
    main=calendar(s.text);
  } else if (["list","firsts","playlist","hub"].includes(kind)) {
    const items=values(s);
    if (kind==="hub"||kind==="playlist") {
      main='<div class="jx-list">'+items.slice(0,kind==="hub"?4:10).map((v,i)=>action((kind==="playlist"?"♫  ":"✧  ")+v,kind,i)).join("")+'</div>';
      if (kind==="playlist"&&session.result) main+='<p role="status">'+escape(session.result)+'</p>';
    } else main='<div class="jx-list">'+items.map(v=>'<div class="jx-paper">'+escape(v)+'</div>').join("")+'</div>';
    copy="";
  } else if (kind==="question") {
    main=t.mascot?drawing(t.mascot):"";
  } else if (kind==="photos"||kind==="wall") {
    const total=session.gift.photos.length||3;
    main=kind==="wall"?'<div class="jx-wall">'+Array.from({length:total},(_,i)=>photo(i)).join("")+'</div>':photo(session.pick)+'<div class="jx-actions">'+action("‹ Photo","photo",-1)+'<span>'+(session.pick+1)+' / '+total+'</span>'+action("Photo ›","photo",1)+'</div>';
  } else if (kind==="pin") {
    main='<p class="jx-digits" aria-label="'+session.digits.length+' of 4 digits entered">'+("●".repeat(session.digits.length)+"○".repeat(4-session.digits.length))+'</p>'+
      '<div class="jx-keypad">'+[1,2,3,4,5,6,7,8,9,"Clear",0,"⌫"].map(v=>action(v,"digit",v)).join("")+'</div>';
    if (session.open) main='<p class="jx-paper">Unlocked ♡</p>';
    else buttons="";
    if (session.wrong) main+='<p role="status">Wrong PIN. Try again.</p>';
    if (session.gift.id==="birthday-secret") main+=referenceArt("teddy","jx-pin-art");
  } else if (kind==="countdown") {
    main='<p class="jx-clock">00:'+String(session.count??8).padStart(2,"0")+'</p>';
    buttons=session.count===0?advance:session.count===null?action(s.button,"count","","primary"):"";
  } else if (kind==="balloons"||kind==="boxes") {
    const notes=values(s).slice(0,6);
    copy="";
    main='<div class="jx-reveals '+kind+'">'+notes.map((_,i)=>action(session.notes.includes(i)?"✧":"♥","note",i,"reveal-button")).join("")+'</div>'+
      '<div class="jx-list">'+session.notes.map(i=>notes[i]).filter(Boolean).map(v=>'<div class="jx-paper">'+escape(v)+'</div>').join("")+'</div>';
  } else if (kind==="scratch") {
    copy="";
    main=session.scratch.length>=6?'<div class="jx-paper">'+escape(s.text)+'</div>':'<div class="jx-puzzle jx-scratch">'+Array.from({length:9},(_,i)=>action(session.scratch.includes(i)?"✧":"Scratch","scratch",i)).join("")+'</div>';
  } else if (kind==="puzzle") {
    const img=session.gift.photos[0];
    main='<div class="jx-puzzle">'+session.tiles.map((v,i)=>'<button type="button" data-action="tile" data-val="'+i+'" aria-label="Tile '+(v+1)+'" aria-pressed="'+(session.tile===i)+'"'+(img?' style="background-image:url(&quot;'+escape(img)+'&quot;);background-position:'+((v%3)*50)+'% '+(Math.floor(v/3)*50)+'%"':'')+'>'+(img?"":v+1)+'</button>').join("")+'</div>';
    if (session.tiles.every((v,i)=>v===i)) main+='<p role="status">Memory restored ♡</p>';
  } else if (kind==="apology") {
    main=drawing("panda");
    buttons=action(s.yes,"apology","yes","yes")+action(s.no,"apology","no","no");
    if (session.result==="no") { main+='<p class="jx-paper">'+escape(s.decline)+'</p>'; buttons=action("Read again","replay"); }
  } else if (kind==="hearts") {
    main='<div class="jx-game"><small>Hearts caught: '+session.score+'</small><span>'+String(session.count??12).padStart(2,"0")+'s</span>'+
      (session.count>0?'<button type="button" aria-label="Catch heart" data-action="catch" style="--hx:'+((session.beat*37+9)%75)+'%;--hy:'+((session.beat*27+12)%68)+'%">♥</button>':"")+
      (session.count===0?'<p>You caught '+session.score+' '+(session.score===1?"heart":"hearts")+'. ♡</p>':"")+'</div>';
    buttons=session.count===0?advance:session.count===null?action(s.button,"game","","primary"):"";
  } else if (kind==="finale") {
    main=session.gift.id==="rose-gift"?referenceArt("floral","small"):t.mascot?drawing(session.gift.id==="panda-sorry"?"penguin":t.mascot):'<div class="jx-roses">✧ ♡ ✧</div>';
    buttons=action(s.button,"replay","","primary");
  }
  stage.className="jx-stage jx-"+session.gift.id+" kind-"+kind+(session.open?" revealed":"")+(kind==="lights"&&!session.open?" dark-room":"");
  stage.innerHTML=sceneDecor(session.gift.id,kind)+'<div class="jx-layer"><small class="jx-step">'+(n+1)+' / '+t.scenes.length+'</small><h2>'+escape(s.title)+'</h2>'+(copy?'<p class="jx-copy">'+escape(copy)+'</p>':"")+main+
    '<div class="jx-actions">'+navBack+buttons+(session.gift.id==="love-mail"&&n>1?action("Back to envelope","hub-home"):"")+'</div></div>'+(effect?confetti():"");
}
function goto(n,effect=false) {
  resetScene(Math.max(0,Math.min(n,type().scenes.length-1)));
  renderScene(effect);
}
function tick(key,total) {
  if (session.count!==null) return;
  session.count=total;
  renderScene();
  timer=setInterval(()=>{
    session.count--;
    if (key==="game") session.beat++;
    if (!session.count) clearInterval(timer);
    renderScene(!session.count);
  },1000);
}
let audio;
function noteTune(index) {
  const Audio=window.AudioContext||window.webkitAudioContext;
  if (!Audio) return;
  try {
    audio?.close().catch(()=>{});
    audio=new Audio();
    const context=audio;
    context.resume().catch(()=>{});
    const notes=[[261,329,392,523,392],[293,349,440,587,440],[220,293,349,440,349]][index%3];
    for(const [i,n] of notes.entries()) {
      const osc=context.createOscillator(), gain=context.createGain(), at=context.currentTime+i*.3;
      osc.frequency.value=n;
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(.075,at+.05);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.46);
      osc.connect(gain).connect(context.destination);
      osc.start(at);osc.stop(at+.47);
    }
    setTimeout(()=>context.close().catch(()=>{}),2100);
  } catch {}
}
function playStep(name,value) {
  const n=Number(value);
  if (name==="reveal") { session.open=true; renderScene(["lights","cakecut","candle"].includes(type().scenes[session.scene].kind)); }
  if (name==="next") goto(session.scene+1,session.scene+1===type().scenes.length-1);
  if (name==="previous") goto(session.scene-1);
  if (name==="replay") goto(0);
  if (name==="photo") {
    const total=session.gift.photos.length||3;
    session.pick=(session.pick+n+total)%total;renderScene();
  }
  if (name==="digit"&&!session.open) {
    session.wrong=false;
    if (value==="Clear") session.digits="";
    else if (value==="⌫") session.digits=session.digits.slice(0,-1);
    else session.digits+=value;
    if (session.digits.length===4) {
      session.open=session.digits===session.gift.pin;
      if (!session.open) { session.digits="";session.wrong=true; }
    }
    renderScene(session.open);
  }
  if (name==="note") {
    if (!session.notes.includes(n)) session.notes.push(n);
    renderScene(true);
  }
  if (name==="tile") {
    if (session.tile===-1) session.tile=n;
    else {
      [session.tiles[session.tile],session.tiles[n]]=[session.tiles[n],session.tiles[session.tile]];
      session.tile=-1;
    }
    renderScene(session.tiles.every((v,i)=>v===i));
  }
  if (name==="scratch") {
    if (!session.scratch.includes(n)) session.scratch.push(n);
    renderScene(session.scratch.length>=6);
  }
  if (name==="count") tick("count",8);
  if (name==="game") tick("game",12);
  if (name==="catch"&&session.count>0) { session.score++;session.beat++;renderScene(); }
  if (name==="apology") {
    if (value==="yes") goto(1,true);
    else {session.result="no";renderScene();}
  }
  if (name==="hub") goto(n+2);
  if (name==="hub-home") goto(1);
  if (name==="playlist") {
    noteTune(n);
    session.result="Playing sample melody "+(n+1)+".";
    renderScene();
  }
}
async function post(url, actionName, fields) {
  const body=JSON.stringify({action:actionName,...fields});
  let status, data;
  if (window.JoyvelopeAndroid?.postGiftRequest) {
    const reply=JSON.parse(window.JoyvelopeAndroid.postGiftRequest(url,body));
    if (reply.error) throw new Error(reply.error);
    status=reply.status;data=JSON.parse(reply.body||"{}");
  } else {
    const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body});
    status=response.status;data=await response.json();
  }
  if (status<200||status>=300) throw new Error(data.error||"Sharing failed.");
  return data;
}
function httpUrl(value) {
  const url=new URL(value);
  if (url.protocol!=="https:") throw new Error("Public HTTPS sharing is required.");
  return url;
}
async function publish() {
  if (sharing) return;
  const active=session;
  let revokeToken, endpoint;
  try {
    endpoint=httpUrl(config.giftApiUrl).href;
    const destination=httpUrl(config.recipientSiteUrl);
    const gift=clean(active.gift,active.gift.photos);
    const {photos,...content}=gift;
    const payload=JSON.stringify(content);
    if (payload.length>11000) throw new Error("Shorten the messages before publishing.");
    sharing=true;notice("Publishing gift and photos…");
    const created=await post(endpoint,"create",{gift:{template:"letter",title:gift.scenes[0].title.slice(0,70),recipient:"",sender:"",message:"",theme:"rose",sound:"none",memories:[],experience:content},photoCount:photos.length});
    revokeToken=created.revokeToken;
    if (!shareTokens.test(created.token)||!shareTokens.test(revokeToken)) throw new Error("Invalid gift token.");
    if (created.experienceVersion!==1) throw new Error("Deploy the updated rapid-api function before sharing a new template.");
    for (const [index,photo] of photos.entries()) await post(endpoint,"upload",{revokeToken,index,photo});
    destination.hash="show="+created.token;
    try {localStorage.setItem("joyvelope-last-experience-link",JSON.stringify({url:destination.href,revokeToken}));} catch {}
    if (session!==active) return;
    sharedUrl=destination.href;view();notice("Gift ready. Open the link or send it on WhatsApp.");
    if (window.JoyvelopeAndroid?.shareText) {
      try {window.JoyvelopeAndroid.shareText(sharedUrl);} catch {}
    }
  } catch(error) {
    if (revokeToken) try {await post(endpoint,"revoke",{revokeToken});} catch {}
    if (session===active) notice(error.message);
  } finally {
    sharing=false;
    if(session===active) {
      const share=root.querySelector('[data-action="share"]');
      if(share) share.textContent="Publish gift link";
    }
  }
}
async function copy() {
  try {
    if (window.JoyvelopeAndroid?.copyText) window.JoyvelopeAndroid.copyText(sharedUrl);
    else await navigator.clipboard.writeText(sharedUrl);
    notice("Gift link copied.");
  } catch {root.querySelector("#jx-link")?.select();notice("Link selected. Copy it from the field.");}
}
async function jpeg(file) {
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    image.src=url;
    await image.decode();
    const scale=Math.min(1,960/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.fillStyle="#fff0e2";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/jpeg",.76);
  } finally { URL.revokeObjectURL(url); }
}
function route() {
  const request=++routeRequest;
  const hash=location.hash.slice(1);
  clearInterval(timer);
  if (!(hash==="experiences"||hash.startsWith("experience/")||hash.startsWith("show="))) {
    root.hidden=true;legacy.hidden=false;session=null;
    return;
  }
  root.hidden=false;legacy.hidden=true;
  if (hash==="experiences") { session=null;chooser();return; }
  if (hash.startsWith("show=")) {
    session=null;
    root.innerHTML=brand()+'<main class="jx-wrap"><h1>Opening your surprise…</h1></main>';
    Promise.resolve().then(async()=>{
      const token=new URLSearchParams(hash).get("show");
      if (!shareTokens.test(token)) throw new Error();
      const result=await post(httpUrl(config.giftApiUrl).href,"read",{token});
      if (request!==routeRequest) return;
      session={gift:clean(result.gift.experience,result.gift.photos),...defaultPart(),view:"recipient"};
      view();
    }).catch(()=>{
      if (request===routeRequest) root.innerHTML=brand()+'<main class="jx-wrap"><h1>Gift link unavailable</h1><p>Ask the sender for a fresh Joyvelope link.</p></main>';
    });
    return;
  }
  const id=hash.split("/")[1];
  if (!Object.hasOwn(templates,id)) {location.hash="experiences";return;}
  sharedUrl="";
  const saved=readDrafts()[id];
  let gift=newExperience(id);
  if (saved) try {gift=clean(saved,saved.photos);} catch {}
  session={gift,...defaultPart()};
  view();
}
window.JoyExperiences = {
  cards,
  back() {
    if(root.hidden) return false;
    if (session?.view==="preview" && session.scene>0) {goto(session.scene-1);return true;}
    if (session?.view==="preview") {session.view="edit";resetScene(0);view();return true;}
    if (location.hash!=="#experiences") {location.hash="experiences";return true;}
    location.hash="home";return true;
  }
};
root.addEventListener("input",event=>{
  if (!session || session.view!=="edit") return;
  const input=event.target, key=input.dataset.key;
  if (!key) return;
  if (key==="pin") session.gift.pin=input.value.replace(/\D/g,"").slice(0,4);
  else {
    session.gift.scenes[session.edit][key]=input.value;
    renderScene();
  }
});
root.addEventListener("change",async event=>{
  if(!session||session.view!=="edit") return;
  const input=event.target;
  if(input.id==="jx-edit") {session.edit=Number(input.value);resetScene(session.edit);view();return;}
  if(input.id!=="jx-photos") return;
  const active=session;
  const files=[...input.files].slice(0,6);
  try {
    const ready=await Promise.allSettled(files.map(jpeg));
    if(session!==active) return;
    session.gift.photos=ready.filter(item=>item.status==="fulfilled").map(item=>item.value);
    view();
    if(files.length!==session.gift.photos.length) notice("Some photos could not be opened.");
  } catch {notice("Could not read the photos.");}
});
root.addEventListener("click",event=>{
  const button=event.target.closest("[data-action]");
  if(!button||!session) return;
  const name=button.dataset.action;
  if(name==="save") {save();return;}
  if(name==="share") {publish();return;}
  if(name==="copy") {copy();return;}
  if(name==="clearphotos") {session.gift.photos=[];view();return;}
  if(name==="edit") {session.view="edit";resetScene(0);view();return;}
  if(name==="preview") {
    if(!/^\d{4}$/.test(session.gift.pin)) {notice("Enter a four-digit surprise PIN.");return;}
    session.view="preview";resetScene(0);view();return;
  }
  if(session.view==="edit") {
    const selected=session.edit;
    session.scene=selected;
    if(["next","previous","replay","hub","hub-home"].includes(name)) {
      session.edit=name==="next"?Math.min(selected+1,type().scenes.length-1):name==="previous"?Math.max(0,selected-1):name==="hub"?Number(button.dataset.val)+2:name==="hub-home"?1:0;
      resetScene(session.edit);view();return;
    }
  }
  playStep(name,button.dataset.val||"");
});
window.addEventListener("hashchange",route);
window.JoyRefreshHome?.();
route();
})();

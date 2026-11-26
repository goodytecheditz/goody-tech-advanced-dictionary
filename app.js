
const $ = id => document.getElementById(id);

const starterWords = [
{word:"abundant",meaning:"Existing in large quantities; plentiful."},
{word:"brilliant",meaning:"Exceptionally clever or impressive."},
{word:"courage",meaning:"The ability to face danger or difficulty."},
{word:"diligent",meaning:"Showing careful and persistent effort."},
{word:"eloquent",meaning:"Fluent and persuasive in speaking or writing."},
{word:"freedom",meaning:"The power or right to act freely."},
{word:"genuine",meaning:"Truly what something is said to be; authentic."},
{word:"humble",meaning:"Having a modest view of one's importance."},
{word:"innovate",meaning:"To introduce new ideas or methods."},
{word:"justice",meaning:"Fair treatment and the quality of being fair."},
{word:"knowledge",meaning:"Facts and information acquired through learning."},
{word:"loyal",meaning:"Giving firm and constant support."},
{word:"magnificent",meaning:"Extremely beautiful or impressive."},
{word:"nurture",meaning:"To care for and encourage growth."},
{word:"optimistic",meaning:"Hopeful and confident about the future."},
{word:"persevere",meaning:"To continue despite difficulty."},
{word:"quality",meaning:"The standard of something."},
{word:"resilient",meaning:"Able to recover quickly from difficulties."},
{word:"sincere",meaning:"Honest and genuine."},
{word:"thrive",meaning:"To grow, develop or prosper."},
{word:"unique",meaning:"Being the only one of its kind."},
{word:"valuable",meaning:"Worth a great deal or important."},
{word:"wisdom",meaning:"Good judgement based on knowledge and experience."},
{word:"yearn",meaning:"To have a strong feeling of longing."},
{word:"zeal",meaning:"Great energy or enthusiasm."}
];

const KEYS = {
saved:"gtad_favourites",
recent:"gtad_recent",
cache:"gtad_word_cache"
};

let wordCache = JSON.parse(localStorage.getItem(KEYS.cache)||"{}");

function updateConnection(){
 $("connection").textContent = navigator.onLine ? "● ONLINE" : "● OFFLINE";
}
updateConnection();
window.addEventListener("online",updateConnection);
window.addEventListener("offline",updateConnection);

function escapeHTML(value){
 return String(value||"").replace(/[&<>"']/g,c=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
 })[c]);
}

function rememberSearch(word){
 let list=JSON.parse(localStorage.getItem(KEYS.recent)||"[]");
 list=[word,...list.filter(x=>x!==word)].slice(0,30);
 localStorage.setItem(KEYS.recent,JSON.stringify(list));
}

function displayWord(data){
 const meanings=data.meanings||[];
 let html=`<h2>${escapeHTML(data.word)}</h2>`;
 if(data.phonetic) html+=`<p>${escapeHTML(data.phonetic)}</p>`;
 if(data.phonetics?.length){
  const audio=data.phonetics.find(p=>p.audio)?.audio;
  if(audio) html+=`<div class="actions"><button id="audioBtn">🔊 Play pronunciation</button></div>`;
 }
 meanings.forEach(m=>{
  html+=`<div class="definition"><p class="small-label">${escapeHTML(m.partOfSpeech)}</p>`;
  (m.definitions||[]).forEach(d=>{
   html+=`<p>${escapeHTML(d.definition)}</p>`;
   if(d.example) html+=`<p class="example">Example: ${escapeHTML(d.example)}</p>`;
  });
  if(m.synonyms?.length) html+=`<p><b>Synonyms:</b> ${escapeHTML(m.synonyms.join(", "))}</p>`;
  html+="</div>";
 });
 html+=`<div class="actions"><button id="speakBtn">Speak word</button><button id="saveBtn">★ Save favourite</button></div>`;
 $("result").innerHTML=html;

 const audio=data.phonetics?.find(p=>p.audio)?.audio;
 if(audio) $("audioBtn").onclick=()=>new Audio(audio).play();
 $("speakBtn").onclick=()=>speak(data.word);
 $("saveBtn").onclick=()=>saveFavourite(data.word);
}

function speak(word){
 if("speechSynthesis" in window){
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(word));
 }
}

async function searchWord(value){
 const word=value.trim().toLowerCase();
 if(!word)return;
 $("message").textContent="Searching dictionary...";
 rememberSearch(word);

 if(!navigator.onLine){
  const saved=wordCache[word];
  const basic=starterWords.find(x=>x.word===word);
  if(saved){displayWord(saved);$("message").textContent="Loaded from offline memory.";return;}
  if(basic){
   displayWord({word:basic.word,meanings:[{partOfSpeech:"Meaning",definitions:[{definition:basic.meaning}]}]});
   $("message").textContent="Loaded from built-in offline dictionary.";
   return;
  }
  $("result").innerHTML="<h2>Internet required</h2><p>This word is not saved on this device yet. Connect to the internet and search it once.</p>";
  $("message").textContent="Offline word unavailable.";
  return;
 }

 try{
  const response=await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(word));
  if(!response.ok)throw new Error("Word not found");
  const data=await response.json();
  const item=data[0];
  wordCache[word]=item;
  localStorage.setItem(KEYS.cache,JSON.stringify(wordCache));
  displayWord(item);
  $("message").textContent="Dictionary result loaded successfully.";
 }catch(error){
  const basic=starterWords.find(x=>x.word===word);
  if(basic){
   displayWord({word:basic.word,meanings:[{partOfSpeech:"Meaning",definitions:[{definition:basic.meaning}]}]});
  }else{
   $("result").innerHTML="<h2>Word not found</h2><p>Check the spelling or try another English word.</p>";
  }
  $("message").textContent="Search completed.";
 }
}

function saveFavourite(word){
 let list=JSON.parse(localStorage.getItem(KEYS.saved)||"[]");
 if(!list.includes(word.toLowerCase()))list.push(word.toLowerCase());
 localStorage.setItem(KEYS.saved,JSON.stringify(list));
 alert("Favourite saved successfully.");
}

function showList(title,items){
 $("result").innerHTML=`<h2>${title}</h2>`;
 if(!items.length){
  $("result").innerHTML+="<p>No words here yet.</p>";
  return;
 }
 items.forEach(word=>{
  const button=document.createElement("button");
  button.textContent=word;
  button.className="secondary";
  button.onclick=()=>{$("wordInput").value=word;searchWord(word);};
  $("result").appendChild(button);
 });
}

$("searchForm").addEventListener("submit",event=>{
 event.preventDefault();
 searchWord($("wordInput").value);
});

$("favoritesBtn").onclick=()=>showList("Favourite words",JSON.parse(localStorage.getItem(KEYS.saved)||"[]"));
$("recentBtn").onclick=()=>showList("Recent searches",JSON.parse(localStorage.getItem(KEYS.recent)||"[]"));
$("offlineBtn").onclick=()=>showList("Built-in offline words",starterWords.map(x=>x.word));

const daily=starterWords[new Date().getDate()%starterWords.length];
$("dailyWord").innerHTML=`<h3>${escapeHTML(daily.word)}</h3><p>${escapeHTML(daily.meaning)}</p>`;

if("serviceWorker" in navigator){
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
 });
}

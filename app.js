
const $ = id => document.getElementById(id);

const KEYS = {
  saved: "gtad_favourites",
  recent: "gtad_recent",
  cache: "gtad_word_cache"
};

const starterWords = [
  {word:"abundant",meaning:"Existing in large quantities; plentiful."},
  {word:"beautiful",meaning:"Pleasing the senses or mind aesthetically."},
  {word:"brilliant",meaning:"Exceptionally clever, talented or impressive."},
  {word:"courage",meaning:"The ability to face danger or difficulty."},
  {word:"diligent",meaning:"Showing careful and persistent effort."},
  {word:"eloquent",meaning:"Fluent and persuasive in speaking or writing."},
  {word:"freedom",meaning:"The power or right to act freely."},
  {word:"genuine",meaning:"Truly authentic or real."},
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

let wordCache = JSON.parse(localStorage.getItem(KEYS.cache) || "{}");

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  })[c]);
}

function updateConnection() {
  $("connection").textContent =
    navigator.onLine ? "● ONLINE" : "● OFFLINE";
}

updateConnection();
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);

function rememberSearch(word) {
  let list = JSON.parse(localStorage.getItem(KEYS.recent) || "[]");
  list = [word, ...list.filter(x => x !== word)].slice(0, 40);
  localStorage.setItem(KEYS.recent, JSON.stringify(list));
}

function saveResult(word, result) {
  wordCache[word.toLowerCase()] = result;
  localStorage.setItem(KEYS.cache, JSON.stringify(wordCache));
}

function displayResult(result) {
  let html = `<h2>${escapeHTML(result.title || result.word)}</h2>`;

  if (result.subtitle) {
    html += `<p class="small-label">${escapeHTML(result.subtitle)}</p>`;
  }

  if (result.phonetic) {
    html += `<p>${escapeHTML(result.phonetic)}</p>`;
  }

  if (result.meanings && result.meanings.length) {
    result.meanings.forEach(section => {
      html += `<div class="definition">`;

      if (section.partOfSpeech) {
        html += `<p class="small-label">${escapeHTML(section.partOfSpeech)}</p>`;
      }

      (section.definitions || []).forEach(def => {
        html += `<p>${escapeHTML(def.definition)}</p>`;

        if (def.example) {
          html += `<p class="example">Example: ${escapeHTML(def.example)}</p>`;
        }
      });

      if (section.synonyms && section.synonyms.length) {
        html += `<p><b>Synonyms:</b> ${escapeHTML(section.synonyms.join(", "))}</p>`;
      }

      if (section.antonyms && section.antonyms.length) {
        html += `<p><b>Antonyms:</b> ${escapeHTML(section.antonyms.join(", "))}</p>`;
      }

      html += `</div>`;
    });
  }

  if (result.description) {
    html += `<p>${escapeHTML(result.description)}</p>`;
  }

  if (result.extra) {
    html += `<p>${escapeHTML(result.extra)}</p>`;
  }

  if (result.sourceUrl) {
    html += `<p><a href="${escapeHTML(result.sourceUrl)}" target="_blank" rel="noopener">Read more from source ↗</a></p>`;
  }

  html += `
    <div class="actions">
      <button id="speakBtn">🔊 Pronounce</button>
      <button id="saveBtn">★ Save favourite</button>
    </div>
  `;

  $("result").innerHTML = html;

  $("speakBtn").onclick = () => speak(result.title || result.word);
  $("saveBtn").onclick = () => saveFavourite(result.title || result.word);
}

function speak(word) {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(word));
  }
}

function saveFavourite(word) {
  let list = JSON.parse(localStorage.getItem(KEYS.saved) || "[]");
  const value = word.toLowerCase();

  if (!list.includes(value)) list.push(value);

  localStorage.setItem(KEYS.saved, JSON.stringify(list));
  alert("Word saved to favourites!");
}

// SOURCE 1: English dictionary
async function dictionarySearch(word) {
  const url =
    "https://api.dictionaryapi.dev/api/v2/entries/en/" +
    encodeURIComponent(word);

  const response = await fetch(url);
  if (!response.ok) throw new Error("Dictionary result unavailable");

  const data = await response.json();
  const item = data[0];

  return {
    title: item.word,
    subtitle: "English dictionary definition",
    phonetic: item.phonetic || "",
    meanings: (item.meanings || []).map(m => ({
      partOfSpeech: m.partOfSpeech,
      definitions: (m.definitions || []).slice(0, 8).map(d => ({
        definition: d.definition,
        example: d.example || ""
      })),
      synonyms: [...new Set([
        ...(m.synonyms || []),
        ...(m.definitions || []).flatMap(d => d.synonyms || [])
      ])].slice(0, 15),
      antonyms: [...new Set([
        ...(m.antonyms || []),
        ...(m.definitions || []).flatMap(d => d.antonyms || [])
      ])].slice(0, 15)
    })),
    sourceUrl: "https://en.wiktionary.org/wiki/" + encodeURIComponent(item.word)
  };
}

// SOURCE 2: Wiktionary for words, expressions and documented names
async function wiktionarySearch(word) {
  const url = "https://en.wiktionary.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: word,
      prop: "extracts",
      explaintext: "1",
      exintro: "1",
      redirects: "1",
      format: "json",
      origin: "*"
    });

  const response = await fetch(url);
  if (!response.ok) throw new Error("Wiktionary unavailable");

  const data = await response.json();
  const pages = data.query && data.query.pages;
  const page = pages && Object.values(pages)[0];

  if (!page || page.missing !== undefined || !page.extract) {
    throw new Error("No Wiktionary entry");
  }

  return {
    title: page.title || word,
    subtitle: "Wiktionary explanation",
    description: page.extract.slice(0, 4500),
    sourceUrl: "https://en.wiktionary.org/wiki/" + encodeURIComponent(page.title || word)
  };
}

// SOURCE 3: Wikipedia for names, people, countries, places and topics
async function wikipediaSearch(word) {
  const url =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(word);

  const response = await fetch(url);
  if (!response.ok) throw new Error("No Wikipedia article");

  const data = await response.json();

  if (!data.extract || data.type === "disambiguation") {
    throw new Error("No suitable Wikipedia explanation");
  }

  return {
    title: data.title || word,
    subtitle: "General knowledge explanation",
    description: data.extract,
    sourceUrl: data.content_urls?.desktop?.page ||
      "https://en.wikipedia.org/wiki/" + encodeURIComponent(word)
  };
}

// Search all available sources
async function searchWord(value) {
  const word = value.trim().replace(/\s+/g, " ");

  if (!word) return;

  rememberSearch(word);

  $("message").textContent = "Searching multiple information sources...";
  $("result").innerHTML =
    "<h2>Searching...</h2><p>Please wait while we look for information.</p>";

  // Use saved result when offline
  if (!navigator.onLine) {
    const saved = wordCache[word.toLowerCase()];
    const basic = starterWords.find(
      item => item.word.toLowerCase() === word.toLowerCase()
    );

    if (saved) {
      displayResult(saved);
      $("message").textContent = "Loaded from offline memory.";
      return;
    }

    if (basic) {
      displayResult({
        title: basic.word,
        subtitle: "Built-in offline dictionary",
        meanings: [{
          partOfSpeech: "Meaning",
          definitions: [{definition: basic.meaning}]
        }]
      });
      $("message").textContent = "Loaded from offline dictionary.";
      return;
    }

    $("result").innerHTML =
      "<h2>Internet required</h2><p>This entry has not been saved on this device. Connect to the internet and search again.</p>";

    $("message").textContent = "This result is not available offline yet.";
    return;
  }

  // Try the standard English dictionary first
  try {
    const result = await dictionarySearch(word);
    saveResult(word, result);
    displayResult(result);
    $("message").textContent = "English dictionary result found.";
    return;
  } catch (error) {
    // Continue to other sources
  }

  // Try Wiktionary next
  try {
    const result = await wiktionarySearch(word);
    saveResult(word, result);
    displayResult(result);
    $("message").textContent = "Additional word information found.";
    return;
  } catch (error) {
    // Continue to Wikipedia
  }

  // Try Wikipedia for general knowledge
  try {
    const result = await wikipediaSearch(word);
    saveResult(word, result);
    displayResult(result);
    $("message").textContent = "General knowledge information found.";
    return;
  } catch (error) {
    // Continue to built-in vocabulary
  }

  const basic = starterWords.find(
    item => item.word.toLowerCase() === word.toLowerCase()
  );

  if (basic) {
    const result = {
      title: basic.word,
      subtitle: "Built-in dictionary",
      meanings: [{
        partOfSpeech: "Meaning",
        definitions: [{definition: basic.meaning}]
      }]
    };

    saveResult(word, result);
    displayResult(result);
    $("message").textContent = "Built-in dictionary result.";
    return;
  }

  $("result").innerHTML = `
    <h2>No verified entry found</h2>
    <p>We couldn't find a reliable explanation for "${escapeHTML(word)}" in our available sources.</p>
    <p>Try checking the spelling or searching a shorter phrase.</p>
  `;

  $("message").textContent =
    "No result found. Try another spelling or phrase.";
}

// Search form
$("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  searchWord($("wordInput").value);
});

// Favourites
$("favoritesBtn").onclick = () => {
  const list = JSON.parse(localStorage.getItem(KEYS.saved) || "[]");
  showList("Favourite words", list);
};

// Recent searches
$("recentBtn").onclick = () => {
  const list = JSON.parse(localStorage.getItem(KEYS.recent) || "[]");
  showList("Recent searches", list);
};

// Built-in offline words
$("offlineBtn").onclick = () => {
  showList("Built-in offline words", starterWords.map(x => x.word));
};

function showList(title, items) {
  $("result").innerHTML = `<h2>${escapeHTML(title)}</h2>`;

  if (!items.length) {
    $("result").innerHTML += "<p>No words available yet.</p>";
    return;
  }

  items.forEach(word => {
    const button = document.createElement("button");
    button.textContent = word;
    button.className = "secondary";
    button.style.margin = "5px";
    button.onclick = () => {
      $("wordInput").value = word;
      searchWord(word);
    };
    $("result").appendChild(button);
  });
}

// Word of the day
const daily = starterWords[new Date().getDate() % starterWords.length];

$("dailyWord").innerHTML =
  `<h3>${escapeHTML(daily.word)}</h3><p>${escapeHTML(daily.meaning)}</p>`;

// Register offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.log("Offline setup:", error));
  });
}

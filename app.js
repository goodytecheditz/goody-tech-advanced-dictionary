
const CACHE_KEY = "goodyTechDictionaryCache";
const FAVORITES_KEY = "goodyTechDictionaryFavorites";
const RECENT_KEY = "goodyTechDictionaryRecent";

const customEntries = {
  goodnews: {
    title: "Goodnews",
    type: "Name / English expression",
    definition: "Good news means information about something positive, welcome or encouraging. Goodnews is also used as a personal name, often expressing the hope or joy associated with positive news."
  },
  wahala: {
    title: "Wahala",
    type: "Nigerian Pidgin / West African expression",
    definition: "Wahala means trouble, problem, difficulty or an unpleasant situation. Example: 'No wahala' means 'No problem'."
  },
  omo: {
    title: "Omo",
    type: "Nigerian expression",
    definition: "Omo is commonly used in Nigerian conversation as an expression of surprise, emphasis, excitement or disbelief. Its meaning depends on the context."
  },
  "na wa": {
    title: "Na wa",
    type: "Nigerian Pidgin",
    definition: "Na wa is an expression used to show surprise, disbelief, disappointment or amazement. Example: 'Na wa for you!'"
  },
  calabar: {
    title: "Calabar",
    type: "Place",
    definition: "Calabar is a city in Cross River State, southeastern Nigeria. It is known for its cultural heritage, festivals and historical significance."
  },
  nigeria: {
    title: "Nigeria",
    type: "Country",
    definition: "Nigeria is a country in West Africa. Its capital is Abuja, and it is known for its diverse cultures, languages and people."
  }
};

let savedWords = loadStorage(CACHE_KEY, {});
let favorites = loadStorage(FAVORITES_KEY, []);
let recent = loadStorage(RECENT_KEY, []);

const searchForm = document.getElementById("searchForm");
const wordInput = document.getElementById("wordInput");
const message = document.getElementById("message");
const result = document.getElementById("result");
const connection = document.getElementById("connection");

function loadStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function setMessage(text) {
  if (message) message.textContent = text;
}

function updateConnection() {
  if (connection) {
    connection.textContent = navigator.onLine ? "Online" : "Offline";
  }
}

window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);
updateConnection();

function showResult(data) {
  if (!result) return;

  const definitions = (data.definitions || []).map(item => `
    <div class="definition">
      <p>${escapeHTML(item.partOfSpeech || "Meaning")}</p>
      <strong>${escapeHTML(item.text)}</strong>
      ${item.example ? `<p class="example">Example: ${escapeHTML(item.example)}</p>` : ""}
    </div>
  `).join("");

  const synonyms = data.synonyms?.length
    ? `<p><strong>Synonyms:</strong> ${escapeHTML(data.synonyms.join(", "))}</p>`
    : "";

  const antonyms = data.antonyms?.length
    ? `<p><strong>Antonyms:</strong> ${escapeHTML(data.antonyms.join(", "))}</p>`
    : "";

  const pronunciation = data.phonetic
    ? `<p><strong>Pronunciation:</strong> ${escapeHTML(data.phonetic)}</p>`
    : "";

  result.innerHTML = `
    <div class="word-result">
      <h2>${escapeHTML(data.title)}</h2>
      <p class="small-label">${escapeHTML(data.type || "Dictionary entry")}</p>
      ${pronunciation}
      ${definitions}
      ${data.description ? `<p>${escapeHTML(data.description)}</p>` : ""}
      ${synonyms}
      ${antonyms}
      <p class="small-label">GOODY TECH ADVANCED DICTIONARY</p>
    </div>
  `;

  result.style.display = "block";
}

function addRecent(word) {
  recent = [word, ...recent.filter(item => item.toLowerCase() !== word.toLowerCase())].slice(0, 20);
  saveStorage(RECENT_KEY, recent);
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Search request failed");
  return response.json();
}

async function searchDictionary(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const data = await fetchJSON(url);

  if (!Array.isArray(data) || !data.length) throw new Error("No dictionary entry");

  const entry = data[0];
  const definitions = [];

  (entry.meanings || []).forEach(meaning => {
    (meaning.definitions || []).forEach(def => {
      if (def.definition) {
        definitions.push({
          partOfSpeech: meaning.partOfSpeech,
          text: def.definition,
          example: def.example || ""
        });
      }
    });
  });

  if (!definitions.length) throw new Error("No definitions");

  return {
    title: entry.word || word,
    type: "English dictionary",
    phonetic: entry.phonetic || entry.phonetics?.find(p => p.text)?.text || "",
    definitions,
    synonyms: [...new Set((entry.meanings || []).flatMap(m => m.synonyms || []))].slice(0, 12),
    antonyms: [...new Set((entry.meanings || []).flatMap(m => m.antonyms || []))].slice(0, 12)
  };
}

async function searchWiktionary(word) {
  const url = `https://en.wiktionary.org/w/api.php?action=query&format=json&origin=*&prop=extracts&explaintext=1&exintro=1&redirects=1&titles=${encodeURIComponent(word)}`;
  const data = await fetchJSON(url);
  const pages = Object.values(data.query?.pages || {});
  const page = pages.find(item => item.extract && item.extract.trim());

  if (!page) throw new Error("No Wiktionary entry");

  return {
    title: page.title || word,
    type: "Word, name or expression",
    description: page.extract.slice(0, 5000),
    definitions: []
  };
}

async function searchWikipedia(word) {
  const searchURL = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(word)}&srlimit=1&format=json&origin=*`;
  const searchData = await fetchJSON(searchURL);
  const match = searchData.query?.search?.[0];

  if (!match) throw new Error("No matching topic");

  const pageURL = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&format=json&origin=*&titles=${encodeURIComponent(match.title)}`;
  const pageData = await fetchJSON(pageURL);
  const page = Object.values(pageData.query?.pages || {})[0];

  if (!page?.extract) throw new Error("No explanation found");

  return {
    title: page.title || match.title,
    type: "General knowledge",
    description: page.extract.slice(0, 5000),
    definitions: []
  };
}

async function searchWord(input) {
  const word = cleanText(input);
  const key = word.toLowerCase();

  if (!word) {
    setMessage("Please enter a word or phrase.");
    return;
  }

  setMessage("Searching for your meaning...");
  if (result) result.style.display = "none";

  if (customEntries[key]) {
    const data = {
      ...customEntries[key],
      definitions: [{ partOfSpeech: "Explanation", text: customEntries[key].definition }]
    };
    savedWords[key] = data;
    saveStorage(CACHE_KEY, savedWords);
    addRecent(word);
    showResult(data);
    setMessage("Meaning found.");
    return;
  }

  if (savedWords[key]) {
    showResult(savedWords[key]);
    addRecent(word);
    setMessage(navigator.onLine ? "Meaning found in your saved dictionary." : "Offline meaning found.");
    return;
  }

  if (!navigator.onLine) {
    setMessage("You're offline. Connect to the internet to search for new words.");
    return;
  }

  const searchMethods = [
    searchDictionary,
    searchWiktionary,
    searchWikipedia
  ];

  for (const method of searchMethods) {
    try {
      const data = await method(word);

      if (data && (data.definitions?.length || data.description)) {
        savedWords[key] = data;
        saveStorage(CACHE_KEY, savedWords);
        addRecent(word);
        showResult(data);
        setMessage("Meaning found.");
        return;
      }
    } catch (error) {
      // Continue to the next knowledge source.
    }
  }

  setMessage(`We couldn't find a reliable explanation for "${word}". Try another spelling or a related term.`);
}

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchWord(wordInput?.value || "");
  });
}

function showWordList(items, heading) {
  if (!result) return;

  if (!items.length) {
    setMessage(`No ${heading.toLowerCase()} yet.`);
    return;
  }

  result.innerHTML = `
    <div class="word-result">
      <h2>${escapeHTML(heading)}</h2>
      ${items.map(word => `
        <button class="secondary word-list-item" data-word="${escapeHTML(word)}">
          ${escapeHTML(word)}
        </button>
      `).join("")}
    </div>
  `;

  result.style.display = "block";
  setMessage("Tap a word to search again.");

  result.querySelectorAll("[data-word]").forEach(button => {
    button.addEventListener("click", () => {
      if (wordInput) wordInput.value = button.dataset.word;
      searchWord(button.dataset.word);
    });
  });
}

const favoritesBtn = document.getElementById("favoritesBtn");
const recentBtn = document.getElementById("recentBtn");
const offlineBtn = document.getElementById("offlineBtn");

if (favoritesBtn) {
  favoritesBtn.addEventListener("click", () => showWordList(favorites, "Your favourites"));
}

if (recentBtn) {
  recentBtn.addEventListener("click", () => showWordList(recent, "Recent searches"));
}

if (offlineBtn) {
  offlineBtn.addEventListener("click", () => {
    showWordList(Object.keys(savedWords), "Saved offline words");
  });
}

const dailyWord = document.getElementById("dailyWord");
if (dailyWord) {
  dailyWord.textContent = "Discover a new word every day with GOODY TECH.";
}

// 📦 IndexedDB Setup & Zugriffsfunktionen
function openMediaDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MediaDB", 1);

    request.onerror = () => reject("Datenbank konnte nicht geöffnet werden.");
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("mediaItems")) {
        db.createObjectStore("mediaItems", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

async function loadMediaItemsFromDB() {
  const db = await openMediaDB();
  const tx = db.transaction("mediaItems", "readonly");
  const store = tx.objectStore("mediaItems");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Fehler beim Lesen der MediaItems.");
  });
}

async function addMediaItemToDB(item) {
  const db = await openMediaDB();
  const tx = db.transaction("mediaItems", "readwrite");
  const store = tx.objectStore("mediaItems");
  store.add(item);
  return tx.complete;
}

async function deleteMediaItemFromDB(id) {
  const db = await openMediaDB();
  const tx = db.transaction("mediaItems", "readwrite");
  const store = tx.objectStore("mediaItems");
  store.delete(id);
  return tx.complete;
}

// 🧱 DOM-Erstellung für ein MediaItem
function createSongBox(item) {
  const box = document.createElement("div");
  box.classList.add("song-box");
  box.dataset.id = item.id;

  box.innerHTML = `
    <div class="song-picture" style="background-image: url('${item.src}');" alt="Song Cover"></div>
    <div class="song-info">
      <div class="left-elements">
        <div class="lorempixel">${item.owner}</div>
        <div class="song-title">${item.title}</div>
        <div class="song-artist">${item.numOfTags} Tags</div>
        <div class="play-box">
          <div class="play-button"></div>
          <div class="play-number">0</div>
        </div>
      </div>
      <div class="right-elements">
        <div class="song-release">${item.added}</div>
        <div class="options-icon"></div>
      </div>
    </div>
  `;

  const optionsIcon = box.querySelector(".options-icon");
  optionsIcon.addEventListener("click", (e) => {
    e.stopPropagation();

    const actionMenu = document.getElementById("action-menu");
    const titleField = actionMenu.querySelector(".action-title");

    titleField.textContent = item.title;

    actionMenu.dataset.id = item.id;
    actionMenu.dataset.title = item.title;
    actionMenu.dataset.src = item.src;

    actionMenu.classList.add("visible");
    document.querySelector(".song-list").classList.add("list-dimmed");
  });

  return box;
}

// 🔄 MediaItems laden & anzeigen
async function loadSongsFromDB() {
  const songList = document.querySelector(".song-list");
  songList.innerHTML = "";

  const items = await loadMediaItemsFromDB();
  items.forEach(item => {
    const box = createSongBox(item);
    songList.appendChild(box);
  });

  document.dispatchEvent(new Event("songsLoaded"));
}

// 🚀 Beim Seitenstart + Buttons initialisieren
document.addEventListener("DOMContentLoaded", () => {
  loadSongsFromDB();

  const refreshBtn = document.querySelector('.refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadSongsFromDB();
    });
  }

  const addButton = document.querySelector('.add');
  if (addButton) {
    addButton.addEventListener('click', () => {
      const title = prompt("Titel des neuen MediaItems:");
      const src = prompt("Bild-URL des neuen MediaItems:");

      if (!title || !src) {
        alert("Titel und Bild-URL dürfen nicht leer sein.");
        return;
      }

      const heute = new Date();
      const tag = String(heute.getDate()).padStart(2, '0');
      const monat = String(heute.getMonth() + 1).padStart(2, '0');
      const jahr = heute.getFullYear();
      const datum = `${tag}.${monat}.${jahr}`;

      const newItem = {
        title: title,
        owner: "userinput",
        added: datum,
        numOfTags: 0,
        src: src
      };

      addMediaItemToDB(newItem).then(() => loadSongsFromDB());
    });
  }
});

// 🧩 Aktionsmenü: Editieren
document.getElementById("action-edit").addEventListener("click", async () => {
  const menu = document.getElementById("action-menu");
  const id = Number(menu.dataset.id);
  const oldTitle = menu.dataset.title;
  const oldSrc = menu.dataset.src;

  const newTitle = prompt("Neuer Titel:", oldTitle);
  const newSrc = prompt("Neue Bild-URL:", oldSrc);

  if (!newTitle || !newSrc) return;

  const db = await openMediaDB();
  const tx = db.transaction("mediaItems", "readwrite");
  const store = tx.objectStore("mediaItems");

  const request = store.get(id);
  request.onsuccess = () => {
    const item = request.result;
    item.title = newTitle;
    item.src = newSrc;
    store.put(item);
    tx.oncomplete = () => {
      closeActionMenu();
      loadSongsFromDB();
    };
  };
});

// 🧩 Aktionsmenü: Löschen
document.getElementById("action-delete").addEventListener("click", () => {
  const id = Number(document.getElementById("action-menu").dataset.id);
  deleteMediaItemFromDB(id).then(() => {
    closeActionMenu();
    loadSongsFromDB();
  });
});

// Klick außerhalb des Menüs ➝ Menü schließen
document.addEventListener("click", (e) => {
  const menu = document.getElementById("action-menu");
  if (menu.classList.contains("visible") && !menu.contains(e.target)) {
    closeActionMenu();
  }
});

// Menü schließen (Hilfsfunktion)
function closeActionMenu() {
  const menu = document.getElementById("action-menu");
  menu.classList.remove("visible");
  document.querySelector(".song-list").classList.remove("list-dimmed");
}
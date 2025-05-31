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
    const overlay = document.getElementById("overlay");

    actionMenu.dataset.id = item.id;
    actionMenu.dataset.title = item.title;
    actionMenu.dataset.src = item.src;

    actionMenu.querySelector(".action-title").textContent = item.title;
    actionMenu.querySelector("#edit-title").value = item.title;
    actionMenu.querySelector("#edit-src").value = item.src;

    actionMenu.classList.add("visible");
    overlay.classList.add("visible");

    const editForm = actionMenu.querySelector(".edit-form");
    const actionButtons = actionMenu.querySelector(".action-buttons");
    editForm.classList.add("hidden");
    actionButtons.classList.remove("hidden");
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

// 🚀 DOM geladen
document.addEventListener("DOMContentLoaded", () => {
  loadSongsFromDB();

  document.querySelector(".refresh")?.addEventListener("click", () => loadSongsFromDB());

  document.querySelector(".add")?.addEventListener("click", () => {
    document.getElementById("add-title").value = "";
    document.getElementById("add-src").value = "";
    document.getElementById("add-popup").classList.add("visible");
    document.getElementById("overlay").classList.add("visible");
  });

  document.getElementById("add-confirm").addEventListener("click", () => {
    const title = document.getElementById("add-title").value.trim();
    const src = document.getElementById("add-src").value.trim();

    if (!title || !src) {
      alert("Titel und Bild-URL dürfen nicht leer sein.");
      return;
    }

    const heute = new Date();
    const datum = `${String(heute.getDate()).padStart(2, '0')}.${String(heute.getMonth() + 1).padStart(2, '0')}.${heute.getFullYear()}`;

    const newItem = { title, owner: "userinput", added: datum, numOfTags: 0, src };

    addMediaItemToDB(newItem).then(() => {
      loadSongsFromDB();
      closeAddPopup();
    });
  });

  document.getElementById("add-cancel").addEventListener("click", () => closeAddPopup());

  document.getElementById("overlay").addEventListener("click", () => {
    closeAddPopup();
    closeActionMenu();
  });

  // 📝 Bearbeiten
  document.getElementById("action-edit").addEventListener("click", () => {
    const menu = document.getElementById("action-menu");
    const editForm = menu.querySelector(".edit-form");
    const buttons = menu.querySelector(".action-buttons");

    editForm.classList.remove("hidden");
    buttons.classList.add("hidden");

    document.getElementById("edit-title").value = menu.dataset.title || "";
    document.getElementById("edit-src").value = menu.dataset.src || "";
  });

  document.getElementById("cancel-edit").addEventListener("click", () => {
    const menu = document.getElementById("action-menu");
    const editForm = menu.querySelector(".edit-form");
    const buttons = menu.querySelector(".action-buttons");

    editForm.classList.add("hidden");
    buttons.classList.remove("hidden");
  });

  document.getElementById("save-edit").addEventListener("click", async () => {
    const menu = document.getElementById("action-menu");
    const id = Number(menu.dataset.id);
    const newTitle = document.getElementById("edit-title").value.trim();
    const newSrc = document.getElementById("edit-src").value.trim();

    if (!newTitle || !newSrc) {
      alert("Bitte beide Felder ausfüllen.");
      return;
    }

    const db = await openMediaDB();
    const tx = db.transaction("mediaItems", "readwrite");
    const store = tx.objectStore("mediaItems");

    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result;
      if (!item) {
        alert("Fehler: Objekt nicht gefunden.");
        return;
      }

      item.title = newTitle;
      item.src = newSrc;

      store.put(item).onsuccess = () => {
        closeActionMenu();
        loadSongsFromDB();
      };
    };

    request.onerror = () => {
      alert("Fehler beim Lesen aus der Datenbank.");
    };
  });

  // 🗑️ Löschen
  document.getElementById("action-delete").addEventListener("click", () => {
    const id = Number(document.getElementById("action-menu").dataset.id);
    deleteMediaItemFromDB(id).then(() => {
      closeActionMenu();
      loadSongsFromDB();
    });
  });
});

// 🔒 Popup schließen
function closeAddPopup() {
  document.getElementById("add-popup").classList.remove("visible");
  document.getElementById("overlay").classList.remove("visible");
}

function closeActionMenu() {
  const menu = document.getElementById("action-menu");
  menu.classList.remove("visible");
  document.getElementById("overlay").classList.remove("visible");
  menu.querySelector(".edit-form").classList.add("hidden");
  menu.querySelector(".action-buttons").classList.remove("hidden");
}

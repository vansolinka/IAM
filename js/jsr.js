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

    document.getElementById("edit-title").value = item.title;
    document.getElementById("edit-src").value = item.src;

    actionMenu.classList.add("visible");
    document.getElementById("overlay").classList.add("visible");

    // Buttons/Forms reset
    document.querySelector(".edit-form").classList.add("hidden");
    document.querySelector(".action-buttons").classList.remove("hidden");

    // 🟢 Editieren
    const editBtn = document.getElementById("action-edit");
    editBtn.onclick = () => {
      document.querySelector(".action-buttons").classList.add("hidden");
      document.querySelector(".edit-form").classList.remove("hidden");
    };

    // 🔴 Abbrechen
    const cancelBtn = document.getElementById("cancel-edit");
    cancelBtn.onclick = () => {
      document.querySelector(".edit-form").classList.add("hidden");
      document.querySelector(".action-buttons").classList.remove("hidden");
    };

    // 💾 Speichern
    const saveBtn = document.getElementById("save-edit");
    saveBtn.onclick = async () => {
      const id = Number(actionMenu.dataset.id);
      const newTitle = document.getElementById("edit-title").value;
      const newSrc = document.getElementById("edit-src").value;

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
    };
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

// 🚀 DOM vollständig geladen
document.addEventListener("DOMContentLoaded", () => {
  loadSongsFromDB();

  const refreshBtn = document.querySelector('.refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadSongsFromDB());
  }

  const addButton = document.querySelector('.add');
  if (addButton) {
    addButton.addEventListener('click', () => {
      const title = prompt("Titel des neuen MediaItems:");
      const src = prompt("Bild-URL des neuen MediaItems:");
      if (!title || !src) return alert("Titel und Bild-URL dürfen nicht leer sein.");

      const heute = new Date();
      const datum = `${String(heute.getDate()).padStart(2, '0')}.${String(heute.getMonth() + 1).padStart(2, '0')}.${heute.getFullYear()}`;

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

  // 🗑️ Löschen
  const deleteBtn = document.getElementById("action-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      const id = Number(document.getElementById("action-menu").dataset.id);
      deleteMediaItemFromDB(id).then(() => {
        closeActionMenu();
        loadSongsFromDB();
      });
    });
  }

  // Overlay Klick schließt Menü
  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.addEventListener("click", () => closeActionMenu());
  }
});

// 🧹 Menü schließen
function closeActionMenu() {
  const menu = document.getElementById("action-menu");
  menu.classList.remove("visible");
  document.getElementById("overlay").classList.remove("visible");

  document.querySelector(".edit-form").classList.add("hidden");
  document.querySelector(".action-buttons").classList.remove("hidden");
}

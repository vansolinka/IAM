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
  if (!Number.isInteger(id)) {
    console.error("❌ Ungültige ID übergeben an deleteMediaItemFromDB:", id);
    return;
  }

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
  box.dataset.title = item.title;
  box.dataset.src = item.src;

  box.innerHTML = `
    <div class="song-picture" style="background-image: url('${item.src}');"></div>
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

  // 📍 Klick auf die Box → Detailansicht anzeigen
  box.addEventListener("click", (e) => {
    if (e.target.closest(".options-icon")) return;

    const detailView = document.getElementById("detail-view");
    const detailTitle = document.getElementById("detail-title");
    const detailImage = document.getElementById("detail-image");
    const detailDelete = document.getElementById("detail-delete");

    if (!detailView || !detailTitle || !detailImage || !detailDelete) {
      console.warn("❌ Detailansicht-Elemente fehlen!");
      return;
    }

    detailTitle.textContent = item.title;
    detailImage.src = item.src;

    // ✅ ID für Löschbutton korrekt setzen
    detailDelete.setAttribute("data-id", item.id);

    document.querySelector(".song-list")?.classList.add("hidden");
    detailView.classList.remove("hidden");
    detailView.classList.add("fade-in");

    console.log("✅ Detailansicht geöffnet:", item.title);
  });

  // 📦 Options-Menü Klick (Popup)
  box.querySelector(".options-icon").addEventListener("click", (e) => {
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

    actionMenu.querySelector(".edit-form").classList.add("hidden");
    actionMenu.querySelector(".action-buttons").classList.remove("hidden");
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

  // 🔥 Dieses Event war bisher nicht da
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

  // Zurück-Button in Detailansicht
  document.getElementById("detail-back")?.addEventListener("click", () => {
    document.getElementById("detail-view").classList.add("hidden");
    document.querySelector(".song-list").classList.remove("hidden");
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

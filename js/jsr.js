
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
async function createSongBox(item) {
  const box = document.createElement("div");
  box.classList.add("song-box");
  box.dataset.id = item.id;
  box.dataset.title = item.title;
  box.dataset.src = item.src;

  box.innerHTML = `
    <div class="song-picture"></div>
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

  const pictureDiv = box.querySelector(".song-picture");

if (item.src.startsWith("http")) {
  pictureDiv.style.backgroundImage = `url('${item.src}')`;
} else {
  window.loadImageUrlFromFolder(item.src)
    .then(url => {
      pictureDiv.style.backgroundImage = `url('${url}')`;
    })
    .catch(err => {
      console.warn("⚠️ Bild konnte nicht geladen werden:", err);
      pictureDiv.style.backgroundImage = "url('img/png/image_not_supported.png')";
    });
}


  box.addEventListener("click", async (e) => {
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
    detailDelete.setAttribute("data-id", item.id);

if (item.src.startsWith("http")) {
  detailImage.src = item.src;
} else {
  window.loadImageUrlFromFolder(item.src)
    .then(url => {
      detailImage.src = url;
    })
    .catch(() => {
      detailImage.src = "img/png/image_not_supported.png";
    });
}


    document.querySelector(".song-list")?.classList.add("hidden");
    detailView.classList.remove("hidden");
    detailView.classList.add("fade-in");

    console.log("✅ Detailansicht geöffnet:", item.title);
  });

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
  for (const item of items) {
  const box = await createSongBox(item);
  songList.appendChild(box);
}


  // 🔥 Dieses Event war bisher nicht da
  document.dispatchEvent(new Event("songsLoaded"));
}


// 🚀 DOM geladen
document.addEventListener("DOMContentLoaded", () => {
  // 📁 Ordner-Button für File System Access API
  const folderButton = document.getElementById("select-folder");
  if (folderButton) {
    folderButton.addEventListener("click", async () => {
      try {
        await getOrRequestImageDirectory(); // erlaubt durch Button-Klick
        await loadSongsFromDB(); // neu laden nach Auswahl
      } catch (err) {
        alert("Ordnerzugriff abgelehnt oder abgebrochen.");
        console.warn(err);
      }
    });
  }

  // 🔄 Reload-Button
  document.querySelector(".refresh")?.addEventListener("click", () => loadSongsFromDB());

  // ➕ Hinzufügen-Button
  document.querySelector(".add")?.addEventListener("click", () => {
    document.getElementById("add-title").value = "";
    document.getElementById("add-src").value = "";
    document.getElementById("add-file").value = "";
    document.getElementById("preview-add").style.display = "none";

    document.getElementById("add-popup").classList.add("visible");
    document.getElementById("overlay").classList.add("visible");
  });

  // 💾 Hinzufügen bestätigen
  document.getElementById("add-confirm").addEventListener("click", async () => {
    const title = document.getElementById("add-title").value.trim();
    const urlInput = document.getElementById("add-src").value.trim();
    const fileInput = document.getElementById("add-file");

    if (!title) {
      alert("Bitte gib einen Titel ein.");
      return;
    }

    if ((!fileInput || fileInput.files.length === 0) && !urlInput) {
      alert("Bitte gib eine Bild-URL ein oder lade eine Bilddatei hoch.");
      return;
    }

    let src = "";
    if (fileInput && fileInput.files.length > 0) {
     const filename = await window.saveImageToFolder(fileInput.files[0], crypto.randomUUID() + "-" + fileInput.files[0].name);

      src = filename;
    } else {
      src = urlInput;
    }

    const heute = new Date();
    const datum = `${String(heute.getDate()).padStart(2, '0')}.${String(heute.getMonth() + 1).padStart(2, '0')}.${heute.getFullYear()}`;
    const newItem = { title, owner: "userinput", added: datum, numOfTags: 0, src };

    addMediaItemToDB(newItem).then(() => {
      loadSongsFromDB();
      closeAddPopup();
    });
  });

  // ❌ Abbrechen Hinzufügen
  document.getElementById("add-cancel").addEventListener("click", () => closeAddPopup());

  // ✨ Overlay Klick → alles schließen
  document.getElementById("overlay").addEventListener("click", () => {
    closeAddPopup();
    closeActionMenu();
    resetEditForm();
  });

  // ✏️ Edit starten
  document.getElementById("action-edit").addEventListener("click", () => {
    const menu = document.getElementById("action-menu");
    const editForm = menu.querySelector(".edit-form");
    const buttons = menu.querySelector(".action-buttons");

    editForm.classList.remove("hidden");
    buttons.classList.add("hidden");

    const src = menu.dataset.src || "";
    document.getElementById("edit-title").value = menu.dataset.title || "";

    if (!src.startsWith("data:")) {
      document.getElementById("edit-src").value = src;
    } else {
      document.getElementById("edit-src").value = "";
    }

    const preview = document.getElementById("preview-edit");
    preview.src = src;
    preview.style.display = "block";
    document.getElementById("edit-file").value = "";
  });

  // ❌ Edit abbrechen
  document.getElementById("cancel-edit").addEventListener("click", () => {
    const menu = document.getElementById("action-menu");
    menu.querySelector(".edit-form").classList.add("hidden");
    menu.querySelector(".action-buttons").classList.remove("hidden");
    resetEditForm();
  });

  // 💾 Edit speichern
  document.getElementById("save-edit").addEventListener("click", async () => {
    const menu = document.getElementById("action-menu");
    const id = Number(menu.dataset.id);
    const newTitle = document.getElementById("edit-title").value.trim();
    const newSrcInput = document.getElementById("edit-src").value.trim();
    const fileInput = document.getElementById("edit-file");

    if (!newTitle) {
      alert("Bitte gib einen Titel ein.");
      return;
    }

    if ((!fileInput || fileInput.files.length === 0) && !newSrcInput) {
      alert("Bitte gib eine Bild-URL ein oder lade eine Bilddatei hoch.");
      return;
    }

    let newSrc = "";
    if (fileInput && fileInput.files.length > 0) {
      const filename = await saveImageToDirectory(fileInput.files[0]);
      newSrc = filename;
    } else {
      newSrc = newSrcInput;
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

  // 🔙 Zurück aus Detailansicht
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
function setupImagePreview(fileInputId, previewImgId, titleInputId = null, urlInputId = null) {
  const fileInput = document.getElementById(fileInputId);
  const previewImg = document.getElementById(previewImgId);
  const fileNameLabel = document.getElementById(fileInputId + "-name"); // <-- NEU

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewImg.style.display = "block";

    if (fileNameLabel) fileNameLabel.textContent = file.name; // <-- NEU

    if (urlInputId) {
      document.getElementById(urlInputId).value = "";
    }

    if (titleInputId) {
      const titleInput = document.getElementById(titleInputId);
      if (titleInput.value.trim() === "") {
        const filename = file.name.replace(/\.[^/.]+$/, "");
        titleInput.value = filename;
      }
    }
  });
}


setupImagePreview("add-file", "preview-add", "add-title", "add-src");
setupImagePreview("edit-file", "preview-edit", "edit-title", "edit-src");

function resetEditForm() {
  const menu = document.getElementById("action-menu");

  // Zurücksetzen aller Eingabefelder
  document.getElementById("edit-title").value = menu.dataset.title || "";
  document.getElementById("edit-src").value = menu.dataset.src || "";
  document.getElementById("edit-file").value = "";

  // Vorschau zurücksetzen
  const preview = document.getElementById("preview-edit");
  preview.src = menu.dataset.src || "";
  preview.style.display = "block";

  // Formular-Zustände zurücksetzen
  menu.querySelector(".edit-form").classList.add("hidden");
  menu.querySelector(".action-buttons").classList.remove("hidden");
}



let storageFilterMode = "all"; // Mögliche Werte: all, local, remote
let pendingDeleteId = null;

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
      //pictureDiv.style.backgroundImage = "url('img/png/image_not_supported.png')";
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
      //detailImage.src = "img/png/image_not_supported.png";
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

  // 🧠 Filter anwenden
  const filtered = items.filter(item => {
    if (storageFilterMode === "local") return item.owner === "local";
    if (storageFilterMode === "remote") return item.owner === "remote";
    return true; // "all"
  });

  for (const item of filtered) {
    const box = await createSongBox(item);
    songList.appendChild(box);
  }

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
async function extractGeoLocationFromImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      // Hier könntest du später echte EXIF-GPS-Daten lesen
      // Für jetzt einfach zurückgeben: null (kein GPS)
      resolve(null);
    };
    reader.readAsArrayBuffer(file);
  });
}

// 💾 Hinzufügen bestätigen
document.getElementById("add-confirm").addEventListener("click", async () => {
  console.log("📦 Speicherort gewählt:", document.getElementById("add-storage-type").value);

  // 📌 Eingabefelder auslesen
  const title = document.getElementById("add-title").value.trim();
  const urlInput = document.getElementById("add-src").value.trim();
  const fileInput = document.getElementById("add-file");
  const storageType = document.getElementById("add-storage-type").value;

  // ❗ Validierung: Titel erforderlich
  if (!title) {
    alert("Bitte gib einen Titel ein.");
    return;
  }

  // ❗ Validierung: entweder Datei oder URL muss vorhanden sein
  if ((!fileInput || fileInput.files.length === 0) && !urlInput) {
    alert("Bitte gib eine Bild-URL ein oder lade eine Bilddatei hoch.");
    return;
  }

  let src = "";           // Bildpfad oder URL
  let location = null;    // 📍 Standortdaten (optional)

  // 📁 Datei wurde hochgeladen
  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];

    // 📍 (Optional) Standortdaten aus EXIF ermitteln – kann später eingefügt werden
    // location = await extractGeoLocationFromImage(file);

    if (storageType === "local") {
      console.log("📁 Lokale Speicherung wird versucht...");

      // Bild im lokalen Verzeichnis speichern
      const filename = await window.saveImageToFolder(
        file,
        crypto.randomUUID() + "-" + file.name
      );
      src = filename;
    } else if (storageType === "remote") {
      console.log("🌐 Remote-Upload wird versucht...");
      try {
        // Bild zu externem Server hochladen
        src = await uploadImageToRemoteServer(file);
      } catch (err) {
        alert("❌ Fehler beim Hochladen: " + err.message);
        return;
      }
    }
  } else {
    // 🌐 Nur URL wurde eingegeben → keine Datei nötig
    console.log("🌐 Nur URL wird verwendet, kein Upload nötig.");
    src = urlInput;
  }

  // 📍 Wenn keine Standortdaten vorhanden → Default auf Berlin setzen
  if (!location) {
    location = { lat: 52.52, lng: 13.405 }; // fallback
  }

  // 📅 Aktuelles Datum im Format TT.MM.JJJJ
  const heute = new Date();
  const datum = `${String(heute.getDate()).padStart(2, '0')}.${String(heute.getMonth() + 1).padStart(2, '0')}.${heute.getFullYear()}`;

  // 🧱 Neues Medienobjekt erstellen
  const newItem = {
    title,
    owner: storageType,
    added: datum,
    numOfTags: 0,
    src,
    location // 📍 wird gespeichert für Kartenansicht
  };

  // ✅ In IndexedDB speichern und UI aktualisieren
  addMediaItemToDB(newItem).then(() => {
    loadSongsFromDB();   // Medienliste aktualisieren
    closeAddPopup();     // Popup schließen
  });
});



// ❌ Abbrechen Hinzufügen
document.getElementById("add-cancel").addEventListener("click", () => closeAddPopup());

// 🔙 Detailansicht schließen
function closeDetailView() {
  document.getElementById("detail-view").classList.add("hidden");
  document.querySelector(".song-list").classList.remove("hidden");
}

// 🗑️ Detailansicht Löschen
document.getElementById("detail-delete").addEventListener("click", () => {
  closeActionMenu();
  const detailDelete = document.getElementById("detail-delete");
  pendingDeleteId = Number(detailDelete.dataset.id);
  const title = document.getElementById("detail-title").textContent;

  document.getElementById("delete-item-title").textContent = `"${title}"`;
  document.getElementById("delete-dialog").classList.remove("dialog-hidden");
  document.getElementById("overlay").classList.add("visible");
});

// 🗑️ Action-Menü Löschen
document.getElementById("action-delete").addEventListener("click", () => {
  closeActionMenu();
  const menu = document.getElementById("action-menu");
  pendingDeleteId = Number(menu.dataset.id);
  const title = menu.dataset.title;

  document.getElementById("delete-item-title").textContent = `"${title}"`;
  document.getElementById("delete-dialog").classList.remove("dialog-hidden");
  document.getElementById("overlay").classList.add("visible");
});

// ❌ Löschen abbrechen
document.getElementById("cancel-delete").addEventListener("click", () => {
  pendingDeleteId = null;
  document.getElementById("delete-dialog").classList.add("dialog-hidden"); // verstecken
  document.getElementById("overlay").classList.remove("visible"); // verstecken
});

// ✅ Löschen bestätigen
document.getElementById("confirm-delete").addEventListener("click", async () => {
  if (pendingDeleteId != null) {
    await deleteMediaItemFromDB(pendingDeleteId);
    pendingDeleteId = null;
    closeActionMenu();
    closeDetailView();
    loadSongsFromDB();
  }

  document.getElementById("delete-dialog").classList.add("dialog-hidden"); // verstecken
  document.getElementById("overlay").classList.remove("visible"); // verstecken
});

// ✨ Overlay Klick → alles schließen
document.getElementById("overlay").addEventListener("click", () => {
  closeAddPopup();
  closeActionMenu();
  resetEditForm();
  document.getElementById("delete-dialog").classList.add("dialog-hidden"); // sicherheitshalber
});


  // ✏️ Edit starten
document.getElementById("action-edit").addEventListener("click", () => {
  const menu = document.getElementById("action-menu");
  const editForm = menu.querySelector(".edit-form");
  const buttons = menu.querySelector(".action-buttons");

  editForm.classList.remove("hidden");
  buttons.classList.add("hidden");

  const src = menu.dataset.src || "";
  const titleField = document.getElementById("edit-title");
  const srcField = document.getElementById("edit-src");
  const storageSelect = document.getElementById("edit-storage-type");
  const preview = document.getElementById("preview-edit");
  const fileInput = document.getElementById("edit-file");

  titleField.value = menu.dataset.title || "";

  // Quelle in URL-Feld setzen (nur wenn nicht base64)
  const isRemote = src.startsWith("http");
  srcField.value = isRemote ? src : "";

  // Speicherort anzeigen (remote/local)
  if (storageSelect) {
    storageSelect.disabled = true; // Optional wieder aktivierbar bei Bedarf
    storageSelect.value = isRemote ? "remote" : "local";
    console.log("📦 Speicherort gesetzt auf:", storageSelect.value);
  }

  preview.src = src;
  preview.style.display = "block";
  fileInput.value = "";
});
async function uploadImageToRemoteServer(file) {
  console.log("📤 Starte Upload für:", file?.name);

  const formData = new FormData();
  formData.append("filedata", file); // 👈 laut Anleitung

  const response = await fetch("http://localhost:7077/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    console.error("❌ Upload fehlgeschlagen:", response.status, response.statusText);
    throw new Error("Upload fehlgeschlagen");
  }

  const result = await response.json();
  console.log("🧪 Upload-Serverantwort:", result);

  // 📦 Hole ersten String-Wert aus dem data-Objekt (z. B. "content/img/...")
  const uploadedPath = Object.values(result?.data || {}).find(
    (v) => typeof v === "string" && v.includes("content/img/")
  );

  if (!uploadedPath) {
    throw new Error("❌ Kein gültiger Pfad vom Server erhalten!");
  }

  const fullUrl = `http://localhost:7077/${uploadedPath}`;
  console.log("📤 Bild erreichbar unter:", fullUrl);

  return fullUrl;
}




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

      // Ursprünglicher Speicherort (aus verstecktem Feld oder disabled select)
      const originalStorage = document.getElementById("edit-storage-type")?.value || "remote";
      let newSrc = "";

      if (fileInput && fileInput.files.length > 0) {
        if (originalStorage === "local") {
          const filename = await saveImageToDirectory(fileInput.files[0]); // Lokale Speicherung
          newSrc = filename;
        } else {
          alert("Dieses Medium wurde ursprünglich als URL gespeichert. Bitte gib eine neue URL ein.");
          return;
        }
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
//document.getElementById("action-delete").addEventListener("click", () => {
//    const id = Number(document.getElementById("action-menu").dataset.id);
 //   deleteMediaItemFromDB(id).then(() => {
  //    closeActionMenu();
  //    loadSongsFromDB();
  //  });
 // });

  // 🔙 Zurück aus Detailansicht
  document.getElementById("detail-back")?.addEventListener("click", () => {
    document.getElementById("detail-view").classList.add("hidden");
    document.querySelector(".song-list").classList.remove("hidden");
  });
  

document.getElementById("toggle-storage-filter").addEventListener("click", () => {
  if (storageFilterMode === "all") {
    storageFilterMode = "local";
    document.getElementById("toggle-storage-filter").textContent = "📁 Lokal";
  } else if (storageFilterMode === "local") {
    storageFilterMode = "remote";
    document.getElementById("toggle-storage-filter").textContent = "🌐 Remote";
  } else {
    storageFilterMode = "all";
    document.getElementById("toggle-storage-filter").textContent = "📦 Alle";
  }

  loadSongsFromDB(); // neu filtern
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


function openNav() {
  document.getElementById("mySidenav").style.width = "240px";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}


let mapInstance = null;

function showListView() {
  document.querySelector('.song-list').classList.remove('hidden');
  document.querySelector('#map-view').classList.add('hidden');
}

function showMapView() {
  document.querySelector('.song-list').classList.add('hidden');
  document.querySelector('#map-view').classList.remove('hidden');

  // Nur einmal initialisieren
  if (!mapInstance) {
    mapInstance = L.map('map-view').setView([52.52, 13.405], 13); // z. B. Berlin

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(mapInstance);

    L.marker([52.52, 13.405]).addTo(mapInstance)
      .bindPopup('Du bist hier.')
      .openPopup();
  } else {
    setTimeout(() => mapInstance.invalidateSize(), 200); // wichtig beim wieder Anzeigen
  }
}

// Klick-Event auf Sidebar-Links
document.querySelectorAll('#mySidenav a[data-view]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.getAttribute('data-view');
    closeNav();

    if (view === 'grid') {
      showMapView();
    } else if (view === 'list') {
      showListView();
    }
  });
});

function goToHome() {
  closeNav(); // Menü schließen

  // Nach kurzem Timeout zur Startseite navigieren
  setTimeout(() => {
    window.location.href = "htm.html"; // oder "index.html"
  }, 300); // 300ms passt zum .sidenav transition
}

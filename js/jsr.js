let storageFilterMode = "all"; // Mögliche Werte: all, local, remote
let pendingDeleteId = null;
let src = "";           // Bildpfad oder URL
// 📁 Initialisiere IndexedDB und erstelle "mediaItems", falls noch nicht vorhanden
const dbRequest = indexedDB.open("MediaDB", 1);

dbRequest.onupgradeneeded = function (event) {
  const db = event.target.result;
  if (!db.objectStoreNames.contains("mediaItems")) {
    db.createObjectStore("mediaItems", { keyPath: "id", autoIncrement: true });
    console.log("✅ Objektstore 'mediaItems' wurde erstellt");
  }
};

dbRequest.onerror = function () {
  console.error("❌ Fehler beim Öffnen der IndexedDB");
};

dbRequest.onsuccess = function () {
  console.log("📦 IndexedDB verbunden");
};

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

  return new Promise((resolve, reject) => {
    const request = store.add(item);

    request.onsuccess = (event) => {
      // 🧠 ID wird automatisch gesetzt – wir fügen sie zurück ins Objekt ein
      item.id = event.target.result;
      console.log("✅ Gespeichert mit ID:", item.id);
      resolve(item);
    };

    request.onerror = (e) => {
      console.error("❌ Fehler beim Hinzufügen:", e.target.error);
      reject("Fehler beim Hinzufügen in DB");
    };
  });
}


async function deleteMediaItemFromDB(id) {
  if (!Number.isInteger(id)) {
    console.error("❌ Ungültige ID übergeben an deleteMediaItemFromDB:", id);
    return;
  }
  // Wenn die Karte gerade aktiv ist, aktualisiere sie
if (!document.getElementById("map-view").classList.contains("hidden")) {
  await renderMediaItemMarkers();
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
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    if (tags["GPSLatitude"] && tags["GPSLongitude"]) {
      const toDecimal = (arr, ref) =>
        (arr[0].numerator / arr[0].denominator) +
        (arr[1].numerator / arr[1].denominator) / 60 +
        (arr[2].numerator / arr[2].denominator) / 3600 * (ref === "S" || ref === "W" ? -1 : 1);

      const lat = toDecimal(tags["GPSLatitude"].description, tags["GPSLatitudeRef"].description);
      const lng = toDecimal(tags["GPSLongitude"].description, tags["GPSLongitudeRef"].description);

      return { lat, lng };
    }
  } catch (e) {
    console.warn("EXIF-Standortdaten konnten nicht gelesen werden:", e);
  }

  return null; // fallback
}


// 💾 Hinzufügen bestätigen
document.getElementById("add-confirm").addEventListener("click", async () => {
  
let location = null;    // 📍 Standortdaten (optional)
  console.log("📦 Speicherort gewählt:", document.getElementById("add-storage-type").value);
  console.log("🧭 Standort, der gespeichert wird:", location);


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



  // 📁 Datei wurde hochgeladen
  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];

    // 📍 (Optional) Standortdaten aus EXIF ermitteln – kann später eingefügt werden
     location = await extractGeoLocationFromImage(file);

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
console.log("📍 Standort vor dem Speichern:", location);

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
      loadSongsFromDB(); // Liste aktualisieren
      if (!document.getElementById("map-view").classList.contains("hidden")) {
        renderMediaItemMarkers(); // Falls Karte sichtbar → Marker neu zeichnen
      }
      closeAddPopup(); // Popup schließen
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

    // 📄 Liste aktualisieren, wenn sichtbar
    if (!document.querySelector(".song-list").classList.contains("hidden")) {
      await loadSongsFromDB();
    }

    // 🗺️ Marker neu zeichnen, wenn Karte sichtbar
    if (!document.getElementById("map-view").classList.contains("hidden")) {
      await renderMediaItemMarkers();
    }
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

  if (cameFromMapView) {
    showMapView();
  } else {
    document.querySelector(".song-list").classList.remove("hidden");
  }

  cameFromMapView = false; // zurücksetzen
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
let mediaMarkerGroup = null;


function showMapView() {
  document.querySelector(".song-list")?.classList.add("hidden");
  document.getElementById("detail-view")?.classList.add("hidden");
  document.getElementById("map-view")?.classList.remove("hidden");

  // 💡 WICHTIG: Nur 1 Ansicht darf sichtbar sein
  document.getElementById("map-view").style.display = "block";
  document.querySelector(".song-list").style.display = "none";
  document.getElementById("detail-view").style.display = "none";

  if (!mapInstance) {
    mapInstance = L.map("map-view").setView([52.52, 13.405], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(mapInstance);
    mediaMarkerGroup = L.layerGroup().addTo(mapInstance);
  } else {
    setTimeout(() => mapInstance.invalidateSize(), 200);
  }

    renderMediaItemMarkers();

  // 🧭 Nur einmal registrieren!
  if (!mapInstance._hasPopupOpenHandler) {
    mapInstance.on("popupopen", (e) => {
      const button = e.popup._contentNode.querySelector(".marker-detail-button");
      if (button) {
        button.addEventListener("click", () => {
        const id = button.dataset.id;
          if (id) {
            showDetailView(id); // zeigt Detailansicht für dieses MediaItem
          }
        });
      }
    });
    mapInstance._hasPopupOpenHandler = true;
  }

}
async function renderMediaItemMarkers() {
  if (!mediaMarkerGroup) return;

  mediaMarkerGroup.clearLayers();
  const items = await loadMediaItemsFromDB();

  const uniqueLocations = new Set();

  items.forEach((item) => {
    if (!item.location || !item.location.lat || !item.location.lng) return;

    const { lat, lng } = item.location;
    const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;

    if (uniqueLocations.has(key)) return;
    uniqueLocations.add(key);

    const marker = L.marker([lat, lng]).addTo(mediaMarkerGroup);

    const popupHtml = `
      <div>
        <strong>${item.title}</strong><br />
        <button class="marker-detail-button" data-id="${item.id}">📄 Details</button>
      </div>
    `;
    marker.bindPopup(popupHtml);

    // 🧠 Event registrieren, wenn Popup geöffnet wird
    marker.on("popupopen", () => {
      const button = document.querySelector(".marker-detail-button");
      if (button) {
        button.addEventListener("click", () => {
          showDetailView(item.id); 
        });
      }
    });
  });
}


document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("marker-detail-button")) {
    const id = Number(e.target.dataset.id);
    const items = await loadMediaItemsFromDB();
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Karte & Liste ausblenden, Detailansicht anzeigen
    document.querySelector(".song-list").classList.add("hidden");
    document.querySelector("#map-view").classList.add("hidden");

    const detailView = document.getElementById("detail-view");
    detailView.classList.remove("hidden");

    document.getElementById("detail-title").textContent = item.title;
    document.getElementById("detail-image").src = item.src;
    document.getElementById("detail-delete").dataset.id = item.id;

    detailView.classList.add("fade-in");
  }
});


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
function showListView() {
  document.querySelector(".song-list")?.classList.remove("hidden");
  document.getElementById("map-view")?.classList.add("hidden");
  document.getElementById("detail-view")?.classList.add("hidden");

  // 💡 Nur song-list sichtbar
  document.querySelector(".song-list").style.display = "flex";
  document.getElementById("map-view").style.display = "none";
  document.getElementById("detail-view").style.display = "none";

  loadSongsFromDB();
}
function goToHome() {
  closeNav(); // Menü schließen
}

async function showDetailView(id) {
  const item = await getMediaItemFromDB(id);
  if (!item) return;

  const detailView = document.getElementById("detail-view");
  const detailTitle = document.getElementById("detail-title");
  const detailImage = document.getElementById("detail-image");
  const detailDelete = document.getElementById("detail-delete");

  detailTitle.textContent = item.title || "Unbenannt";
  detailImage.src = item.src || "";
  detailDelete.dataset.id = item.id;

  document.getElementById("map-view").classList.add("hidden");
  document.querySelector(".song-list").classList.add("hidden");
  detailView.classList.remove("hidden");
  detailView.style.display = "flex";

  // 🧠 Wichtig für Delete
  pendingDeleteId = Number(item.id);

  // EventHandler setzen für Dialog-Anzeige
  detailDelete.onclick = () => {
    document.getElementById("delete-item-title").textContent = `"${item.title}"`;
    document.getElementById("delete-dialog").classList.remove("dialog-hidden");
    document.getElementById("overlay").classList.add("visible");
  };

  console.log("✅ Detailansicht geöffnet für:", item.title, "| ID:", item.id);
}



function getMediaItemFromDB(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MediaDB", 1); 

    request.onerror = () => reject("❌ DB-Fehler beim Öffnen");

    request.onsuccess = () => {
      const db = request.result;

      // 👉 Stelle sicher, dass der Store existiert
      if (!db.objectStoreNames.contains("mediaItems")) {
        console.error("❌ mediaItems store nicht gefunden.");
        reject("❌ mediaItems store nicht gefunden.");
        return;
      }

      try {
        const tx = db.transaction("mediaItems", "readonly");
        const store = tx.objectStore("mediaItems");
        const parsedId = Number(id);
        if (!Number.isInteger(parsedId)) {
          console.error("❌ Ungültige ID übergeben:", id);
          reject("Ungültige ID.");
          return;
        }
        const getRequest = store.get(parsedId);

        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject("Fehler beim Lesen des MediaItem");
      } catch (err) {
        reject("❌ Fehler beim Zugriff auf Store: " + err.message);
      }
    };
  });
}



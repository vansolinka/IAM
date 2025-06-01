let currentView = "list";
console.log("JSL wurde geladen ✅");

// Ansicht umschalten (Grid <-> Liste)
const tileButton = document.querySelector('.tile');
const appContainer = document.querySelector('.app-container');
const mainContent = document.querySelector('.song-list');

tileButton.addEventListener('click', () => {
  mainContent.classList.add('fade-out');

  setTimeout(() => {
    appContainer.classList.toggle('view-grid');
    appContainer.classList.toggle('view-list');

    mainContent.classList.remove('fade-out');
    mainContent.classList.add('fade-in');

    setTimeout(() => {
      mainContent.classList.remove('fade-in');
    }, 1000);
  }, 2000);
});

// Bild-URL aus Hintergrund extrahieren
function extractBackgroundImageUrl(style) {
  if (!style) return '';
  return style.slice(5, -2);
}

// Zurück zur Listenansicht
function closeDetailView() {
  console.log("🚫 Detailansicht wird nicht geschlossen – Testmodus");
  const detailView = document.getElementById('detail-view');
  detailView.classList.add('fade-out');
  setTimeout(() => {
    detailView.classList.add('hidden');
    document.querySelector('.song-list').classList.remove('hidden');
    detailView.classList.remove('fade-out');
  }, 300);
}

// Detail-Buttons (zurück, löschen)
document.getElementById('detail-back')?.addEventListener('click', closeDetailView);
document.getElementById('detail-footer-back')?.addEventListener('click', closeDetailView);
document.getElementById('detail-delete')?.addEventListener('click', () => {
  const raw = document.getElementById('detail-delete').dataset.id;
  const id = Number(raw);

  if (isNaN(id)) {
    console.error("❌ Ungültige ID für Löschen:", raw);
    return;
  }

  deleteMediaItemFromDB(id).then(() => {
    closeDetailView();
    loadSongsFromDB();
  });
});


// Nach dem Laden der Songs: Interaktion aktivieren
document.addEventListener("songsLoaded", () => {
  const songBoxes = document.querySelectorAll(".song-box");

  songBoxes.forEach(box => {
    box.addEventListener("click", () => {
      

      const title = box.dataset.title;
      const src = box.dataset.src;

      const detailView = document.getElementById("detail-view");
      const detailImage = document.getElementById("detail-image");
      const detailTitle = document.getElementById("detail-title");

      detailTitle.textContent = title;
      detailImage.src = src;

      detailView.classList.remove("hidden");
      document.querySelector(".song-list").classList.add("hidden");
    });
  });
});


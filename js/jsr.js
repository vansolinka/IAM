// 🔁 Songs vom Server laden & DOM aktualisieren
function loadSongs() {
    fetch("data/listitems.json")
      .then(response => response.json())
      .then(data => {
        const songList = document.querySelector(".song-list");
        songList.innerHTML = ""; // Liste leeren
  
        data.forEach((item, index) => {
          const box = document.createElement("div");
          box.classList.add("song-box");
  
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
  
          songList.appendChild(box);
        });
  
        // 🔔 Interaktions-Skript benachrichtigen
        document.dispatchEvent(new Event("songsLoaded"));
      })
      .catch(error => {
        console.error("Fehler beim Laden der Songs:", error);
      });
  }
  
  // ⏱️ Beim Laden der Seite direkt Songs holen + Refresh aktivieren
  document.addEventListener("DOMContentLoaded", () => {
    loadSongs();
  
    const refreshBtn = document.querySelector('.refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadSongs();
      });
    }
  });
  
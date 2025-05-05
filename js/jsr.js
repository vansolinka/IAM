//Songs vom Server laden & DOM aktualisieren
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
        document.dispatchEvent(new Event("songsLoaded"));
      })
      .catch(error => {
        console.error("Fehler beim Laden der Songs:", error);
      });
  }
  
  // Beim Laden der Seite direkt Songs holen + Refresh aktivieren
  document.addEventListener("DOMContentLoaded", () => {
    loadSongs();
  
    const refreshBtn = document.querySelector('.refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadSongs();
      });
    }
  });

  //Beim Klick auf das + Symbol ein neues Element hinzufügen
document.addEventListener("DOMContentLoaded", () => {
    const addButton = document.querySelector('.add');
    if (addButton) {
      addButton.addEventListener('click', () => {
        const songList = document.querySelector(".song-list");
  
        const heute = new Date();
        const tag = String(heute.getDate()).padStart(2, '0');
        const monat = String(heute.getMonth() + 1).padStart(2, '0');
        const jahr = heute.getFullYear();
        const datum = `${tag}.${monat}.${jahr}`;
  
        const box = document.createElement("div");
        box.classList.add("song-box");
  
        box.innerHTML = `
          <div class="song-picture" style="background-image: url('https://picsum.photos/seed/new/200');" alt="Song Cover"></div>
          <div class="song-info">
            <div class="left-elements">
              <div class="lorempixel">newbeats</div>
              <div class="song-title">New Track</div>
              <div class="song-artist">5 Tags</div>
              <div class="play-box">
                <div class="play-button"></div>
                <div class="play-number">0</div>
              </div>
            </div>
            <div class="right-elements">
              <div class="song-release">${datum}</div>
              <div class="options-icon"></div>
            </div>
          </div>
        `;
  
        songList.appendChild(box);
  
        // Event neu, falls andere Skripte reagieren sollen
        document.dispatchEvent(new Event("songsLoaded"));
      });
    }
  });
  
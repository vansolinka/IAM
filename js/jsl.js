console.log("📦 jsl.js geladen");

// Umschalten der Ansicht
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

// Wenn die Songs geladen wurden, erst dann Interaktion hinzufügen
document.addEventListener("songsLoaded", () => {
  console.log("🔄 Warte auf songsLoaded...");

  const songItems = document.querySelectorAll('.song-box');
  const optionsIcons = document.querySelectorAll('.options-icon');

  optionsIcons.forEach(icon => {
    icon.setAttribute('role', 'button');
    icon.setAttribute('tabindex', '0');
  });

  songItems.forEach(song => {
    song.addEventListener('click', (event) => {
      const clickedElement = event.target;

      const titleElement = song.querySelector('.song-title');
      const imgElement = song.querySelector('.song-picture');

      const title = titleElement ? titleElement.textContent : '';
      const imgUrl = imgElement ? extractBackgroundImageUrl(imgElement.style.backgroundImage) : '';

      if (clickedElement.classList.contains('options-icon')) {
        alert(`Titel: ${title}\nBild-URL: ${imgUrl}`);
        event.stopPropagation();
      } else {
        alert(`Titel: ${title}`);
      }
    });
  });
});

// Bild-URL extrahieren
function extractBackgroundImageUrl(backgroundImageStyle) {
  if (!backgroundImageStyle) return '';
  return backgroundImageStyle.slice(5, -2);
}

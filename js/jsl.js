// Elemente aus dem DOM holen
const tileButton = document.querySelector('.tile'); // Button zum Umschalten der Ansicht
const appContainer = document.querySelector('.app-container'); // Gesamte App-Hülle
const mainContent = document.querySelector('.song-list'); // Hauptbereich mit den Songs
const songItems = document.querySelectorAll('.song-box'); // Alle einzelnen Song-Elemente
const optionsIcons = document.querySelectorAll('.options-icon'); // Alle Optionen-Icons

// Optionen-Icons zugänglicher machen
optionsIcons.forEach(icon => {
  icon.setAttribute('role', 'button');   // Für Screenreader als Button lesbar
  icon.setAttribute('tabindex', '0');     // Mit Tab-Taste erreichbar
});

// Umschalten zwischen Grid- und Listenansicht
tileButton.addEventListener('click', () => {
  // Hauptbereich ausblenden (2 Sekunden)
  mainContent.classList.add('fade-out');

  setTimeout(() => {
    // Ansicht wechseln (grid <-> list)
    if (appContainer.classList.contains('view-grid')) {
      appContainer.classList.remove('view-grid');
      appContainer.classList.add('view-list');
    } else {
      appContainer.classList.remove('view-list');
      appContainer.classList.add('view-grid');
    }

    // Hauptbereich einblenden (1 Sekunde)
    mainContent.classList.remove('fade-out');
    mainContent.classList.add('fade-in');

    setTimeout(() => {
      // Fade-in Klasse wieder entfernen
      mainContent.classList.remove('fade-in');
    }, 1000); // Einblenden dauert 1 Sekunde
  }, 2000); // Nach 2 Sekunden Ausblenden
});

// Klick-Events für alle Song-Elemente
songItems.forEach(song => {
  song.addEventListener('click', (event) => {
    const clickedElement = event.target; // Was genau wurde angeklickt?

    const titleElement = song.querySelector('.song-title'); // Songtitel holen
    const imgElement = song.querySelector('.song-picture'); // Bild-Hintergrund

    const title = titleElement ? titleElement.textContent : '';
    const imgUrl = imgElement ? extractBackgroundImageUrl(imgElement.style.backgroundImage) : '';

    if (clickedElement.classList.contains('options-icon')) {
      // Klick auf Optionen-Icon
      alert(`Titel: ${title}\nBild-URL: ${imgUrl}`);
      event.stopPropagation(); // verhindert normalen Listenklick
    } else {
      // Klick auf restliches Listenelement
      alert(`Titel: ${title}`);
    }
  });
});

// Hilfsfunktion um Background-Image URL aus style="background-image: url('...');" zu extrahieren
function extractBackgroundImageUrl(backgroundImageStyle) {
  if (!backgroundImageStyle) return '';
  return backgroundImageStyle.slice(5, -2); // entfernt 'url("...' und '")'
}

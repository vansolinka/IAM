const tileButton = document.querySelector('.tile');
const appContainer = document.querySelector('.app-container');
const mainContent = document.querySelector('.song-list'); // jetzt song-list!

tileButton.addEventListener('click', () => {
  // Nur den Song-Listen-Hauptbereich ausblenden
  mainContent.classList.add('fade-out');

  setTimeout(() => {
    // Ansicht wechseln (ganze App-Container bekommt view-grid oder view-list)
    if (appContainer.classList.contains('view-grid')) {
      appContainer.classList.remove('view-grid');
      appContainer.classList.add('view-list');
    } else {
      appContainer.classList.remove('view-list');
      appContainer.classList.add('view-grid');
    }

    // Hauptbereich wieder einblenden
    mainContent.classList.remove('fade-out');
    mainContent.classList.add('fade-in');

    setTimeout(() => {
      mainContent.classList.remove('fade-in');
    }, 1000);

  }, 2000);
});

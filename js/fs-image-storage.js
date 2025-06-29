// 📁 Globale Referenz auf Bild-Ordner (File System API)
let directoryHandle = null;

async function getOrRequestImageDirectory() {
  if (directoryHandle) return directoryHandle;
  try {
    directoryHandle = await window.showDirectoryPicker();
    return directoryHandle;
  } catch (err) {
    throw new Error("📁 Ordnerzugriff verweigert oder abgebrochen.");
  }
}

async function saveImageToDirectory(file) {
  const dir = await getOrRequestImageDirectory();
  const filename = `${crypto.randomUUID()}-${file.name}`;
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
  return filename;
}

async function getImageUrlFromDirectory(filename) {
  if (!directoryHandle) throw new Error("📁 Kein Ordner ausgewählt – Zugriff erforderlich.");
  const fileHandle = await directoryHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  return URL.createObjectURL(file);
}

// 📆 MediaItem-Rendering
function renderImage(src, targetImgOrDiv, fallback = "img/png/image_not_supported.png") {
  if (src.startsWith("http")) {
    if (targetImgOrDiv.tagName === "IMG") {
      targetImgOrDiv.src = src;
    } else {
      targetImgOrDiv.style.backgroundImage = `url('${src}')`;
    }
  } else {
    getImageUrlFromDirectory(src)
      .then((url) => {
        if (targetImgOrDiv.tagName === "IMG") {
          targetImgOrDiv.src = url;
        } else {
          targetImgOrDiv.style.backgroundImage = `url('${url}')`;
        }
      })
      .catch((err) => {
        console.warn("⚠️ Bild konnte nicht geladen werden:", err);
        if (targetImgOrDiv.tagName === "IMG") {
          targetImgOrDiv.src = fallback;
        } else {
          targetImgOrDiv.style.backgroundImage = `url('${fallback}')`;
        }
      });
  }
}

function loadImageUrlFromFolder(filename) {
  return getImageUrlFromDirectory(filename); // einfaches Alias
}
window.loadImageUrlFromFolder = loadImageUrlFromFolder;

window.getOrRequestImageDirectory = getOrRequestImageDirectory;
window.saveImageToDirectory = saveImageToDirectory;
window.getImageUrlFromDirectory = getImageUrlFromDirectory;
window.renderImage = renderImage;
window.saveImageToFolder = saveImageToDirectory; // Alias für Kompatibilität


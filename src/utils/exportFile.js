// Cross-platform "save a file the user keeps" + clipboard helpers.
//
// Web keeps the original behavior (blob download / navigator.clipboard). Native
// writes the file to the app cache and opens the OS share sheet, and uses the
// Clipboard plugin. Capacitor plugins are imported dynamically so their native
// shells never load into the web bundle's main chunk.
import { Capacitor } from '@capacitor/core'

export async function saveOrShare(filename, text, mimeType = 'application/octet-stream') {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
    await Share.share({ title: filename, url: uri })
    return
  }

  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyText(text) {
  if (Capacitor.isNativePlatform()) {
    const { Clipboard } = await import('@capacitor/clipboard')
    await Clipboard.write({ string: text })
    return
  }
  await navigator.clipboard.writeText(text)
}

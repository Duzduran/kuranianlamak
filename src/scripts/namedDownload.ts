// Vercel statik dosyaları `Content-Disposition: inline; filename="<slug>.docx"`
// başlığıyla sunar ve bu başlık <a download="..."> ile verilen adı ezer.
// Dosya önce tarayıcıya alınıp blob adresiyle indirilirse `download` adı korunur.
// Herhangi bir hata olursa normal bağlantı davranışına geri dönülür.

const handleClick = async (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-named-download]") : null;
  if (!target || target.dataset.busy === "true") return;

  const fileName = target.getAttribute("download");
  if (!fileName || !("fetch" in window) || !("URL" in window)) return;

  event.preventDefault();
  target.dataset.busy = "true";
  target.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(target.href);
    if (!response.ok) throw new Error(String(response.status));
    const blobUrl = URL.createObjectURL(await response.blob());

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch {
    window.location.href = target.href;
  } finally {
    delete target.dataset.busy;
    target.removeAttribute("aria-busy");
  }
};

export const enableNamedDownloads = () => {
  document.addEventListener("click", (event) => void handleClick(event));
};

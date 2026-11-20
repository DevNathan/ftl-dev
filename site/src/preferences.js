// Apply saved preferences before styles and the editor bundle can paint.
(() => {
  const root = document.documentElement;
  let language;
  let theme;
  try {
    language = localStorage.getItem("ftl-dev-lang");
    theme = localStorage.getItem("ftl-dev-theme");
  } catch { /* System preferences still work when storage is unavailable. */ }
  root.dataset.lang = language === "en" || language === "ko" ? language
    : (navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en";
  root.lang = root.dataset.lang;
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
})();

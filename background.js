// Service worker: open the side panel when the toolbar icon is clicked.

// Make the toolbar icon open the side panel directly.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("sidePanel setPanelBehavior failed:", err));

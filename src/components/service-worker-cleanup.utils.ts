const cleanupReloadKey = "paymug:service-worker-cleanup";

export const legacyServiceWorkerCleanupScript = `
(() => {
  if (!("serviceWorker" in navigator)) return;

  void (async () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregisterResults = await Promise.all(
      registrations.map((registration) => registration.unregister())
    );

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    const removedRegistration = unregisterResults.some(Boolean);
    const cleanupReloadKey = "paymug:service-worker-cleanup";
    if (
      hadController &&
      removedRegistration &&
      sessionStorage.getItem(cleanupReloadKey) !== "done"
    ) {
      sessionStorage.setItem(cleanupReloadKey, "done");
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(cleanupReloadKey);
  })();
})();
`;

export async function cleanupLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();
  const unregisterResults = await Promise.all(
    registrations.map((registration) => registration.unregister())
  );

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  const removedRegistration = unregisterResults.some(Boolean);
  if (
    hadController &&
    removedRegistration &&
    sessionStorage.getItem(cleanupReloadKey) !== "done"
  ) {
    sessionStorage.setItem(cleanupReloadKey, "done");
    window.location.reload();
    return;
  }

  sessionStorage.removeItem(cleanupReloadKey);
}

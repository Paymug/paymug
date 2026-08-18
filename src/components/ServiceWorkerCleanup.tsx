import { legacyServiceWorkerCleanupScript } from "./service-worker-cleanup.utils";

export function ServiceWorkerCleanup() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: legacyServiceWorkerCleanupScript }}
    />
  );
}

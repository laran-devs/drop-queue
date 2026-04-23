"use client";

import { useEffect } from "react";

/**
 * Diagnostic component to catch and report malformed "undefined" requests
 * in the browser. It intercepts fetch and image errors.
 */
export function FlightRecorder() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("%c [FLIGHT_RECORDER] Diagnostic tools active. Monitoring for malformed requests...", "color: #9146ff; font-weight: bold;");

    // 1. Intercept Fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : "";
      
      if (url.includes("undefined") || url.includes("null")) {
        console.error("%c [CATCH_UNDEFINED] Intercepted malformed fetch:", "color: white; background: red; font-weight: bold;", url);
        console.group("Stack Trace");
        console.trace();
        console.groupEnd();
      }
      
      return originalFetch.apply(this, [input, init]);
    };

    // 2. Intercept Image Errors
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const target = event.target as any;
      if (target && (target.tagName === "IMG" || target.tagName === "IFRAME")) {
        const src = target.src || target.href;
        if (src && (src.includes("undefined") || src.includes("null"))) {
          console.error("%c [CATCH_UNDEFINED] Malformed asset source detected:", "color: white; background: #ff8800; font-weight: bold;", src);
          console.log("Element:", target);
        }
      }
    };

    window.addEventListener("error", handleError as any, true);
    
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", handleError as any, true);
    };
  }, []);

  return null;
}

// ==UserScript==
// @name        Highest quality on https://cinejoy.to
// @namespace   LOL
// @icon        https://cinejoy.to/favicon.ico
// @version     1.0.0
// @grant       none
// run-at       document-start
// @match        https://*.cinejoy.to/*
// ==/UserScript==


(() => {
  const XHR = XMLHttpRequest.prototype;

  const originalOpen = XHR.open;
  const originalResponseText = Object.getOwnPropertyDescriptor(
    XHR,
    "responseText"
  );

  XHR.open = function (method, url, ...args) {
    this.__playlistUrl = String(url);
    return originalOpen.call(this, method, url, ...args);
  };

  Object.defineProperty(XHR, "responseText", {
    configurable: true,
    get: function () {
      const original = originalResponseText.get.call(this);

      if (
        !this.__playlistUrl?.includes("nfo.movieboxnoob.cc/playlist/") ||
        !original?.startsWith("#EXTM3U")
      ) {
        return original;
      }

      return rewritePlaylist(original);
    }
  });

  function rewritePlaylist(src) {
    const audio = src.match(
      /^#EXT-X-MEDIA:TYPE=AUDIO,[^\r\n]+/m
    )?.[0];

    const variants = [...src.matchAll(
      /^#EXT-X-STREAM-INF:([^\r\n]+)\r?\n(https?:\/\/[^\r\n]+)/gm
    )];

    if (!variants.length) {
      return src;
    }

    const best = variants
      .map(m => {
        const resolution = m[1].match(/RESOLUTION=(\d+)x(\d+)/);
        const width = resolution ? +resolution[1] : 0;
        const height = resolution ? +resolution[2] : 0;
        const bandwidth = +(m[1].match(/BANDWIDTH=(\d+)/)?.[1] || 0);

        return {
          attrs: m[1],
          url: m[2],
          pixels: width * height,
          bandwidth
        };
      })
      .sort((a, b) =>
        b.pixels - a.pixels ||
        b.bandwidth - a.bandwidth
      )[0];

    return [
      "#EXTM3U",
      "#EXT-X-VERSION:7",
      "#EXT-X-INDEPENDENT-SEGMENTS",
      "",
      ...(audio ? [audio, ""] : []),
      `#EXT-X-STREAM-INF:${best.attrs}`,
      best.url
    ].join("\n");
  }
})();
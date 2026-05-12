export default function Head() {
  // Some browsers (and occasionally Next metadata merging across nested routes)
  // can end up without a stable favicon on client-side navigations.
  // Explicit link tags here ensure the favicon is always present for every route.
  return (
    <>
      {/* Preload so the browser doesn't show a fallback icon during navigation. */}
      <link rel="preload" as="image" href="/favicon.ico" type="image/x-icon" fetchPriority="high" />
      <link rel="icon" href="/favicon.ico" sizes="any" type="image/x-icon" />
      <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      <link rel="icon" type="image/png" href="/favicon-16x16.png" sizes="16x16" />
      <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
      <link rel="icon" type="image/png" href="/favicon-64x64.png" sizes="64x64" />
      <link rel="apple-touch-icon" href="/favicon-64x64.png" />
    </>
  );
}


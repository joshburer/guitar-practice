// index.html is a page fragment: Claude wraps it when it is published as an artifact.
// For local preview and for hosting it yourself, this wraps it into a complete document the same way.
// head: optional extra markup for <head>, such as the build's update check.
export const wrap = (body, head = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
${head}</head>
<body>
${body}</body>
</html>
`;

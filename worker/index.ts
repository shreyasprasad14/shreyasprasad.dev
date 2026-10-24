// Serves each app at its own subdomain: anagrams.shreyasprasad.dev/x is dist/apps/anagrams/x.
// Any other host gets dist/ as-is, so workers.dev preview URLs keep serving apps at /apps/<slug>/.

interface Env {
  ASSETS: {fetch(request: Request): Promise<Response>};
}

const APEX = "shreyasprasad.dev";
// <slug>.localhost lets `pnpm preview` serve subdomains too; browsers resolve *.localhost to loopback
const APP_HOST = new RegExp(`^([a-z0-9-]+)\\.(?:${APEX.replaceAll(".", "\\.")}|localhost)$`);
const APP_PATH = /^\/apps\/([a-z0-9-]+)(\/.*)?$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const slug = url.hostname.match(APP_HOST)?.[1];

    if (slug === undefined) {
      // On the real domain the subdomain is canonical, so /apps/<slug>/ links move there
      const app = url.hostname === APEX ? url.pathname.match(APP_PATH) : null;
      if (app) return Response.redirect(`https://${app[1]}.${APEX}${app[2] ?? "/"}${url.search}`, 301);
      return env.ASSETS.fetch(request);
    }

    if (slug === "www") return Response.redirect(`https://${APEX}${url.pathname}${url.search}`, 301);

    const prefix = `/apps/${slug}`;
    const path = url.pathname;
    url.pathname = prefix + path;
    const response = await env.ASSETS.fetch(new Request(url, request));

    if (response.status === 404) {
      // No such app: send visitors to the gallery rather than a page of broken links
      if (path === "/") return Response.redirect(`https://${APEX}/apps/`, 302);
      // The site's 404 page links to root paths that don't exist here, so keep it plain
      return new Response("Not found", {status: 404, headers: {"Content-Type": "text/plain; charset=utf-8"}});
    }

    // Trailing-slash redirects point at /apps/<slug>/...; strip the prefix so they stay on the subdomain
    const location = response.headers.get("Location");
    if (location !== null) {
      const target = new URL(location, url);
      if (target.origin === url.origin && target.pathname.startsWith(`${prefix}/`)) {
        const headers = new Headers(response.headers);
        headers.set("Location", target.pathname.slice(prefix.length) + target.search);
        return new Response(response.body, {status: response.status, headers});
      }
    }
    return response;
  },
};

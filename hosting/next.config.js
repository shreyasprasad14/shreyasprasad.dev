/** @type {import('next').NextConfig} */
module.exports = {
    // Build a fully static site into ./out, served by Cloudflare (see wrangler.jsonc)
    output: "export",
    images: {
        unoptimized: true,
    },
};

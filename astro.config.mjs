import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({
 output:'static',outDir:'./build',trailingSlash:'never',session:false,
 adapter:cloudflare({prerenderEnvironment:'node',imageService:'passthrough'}),
 build:{format:'file',client:'./',server:'../.astro-server/'},
 devToolbar:{enabled:false}
});

import {defineConfig} from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({output:'server',adapter:process.env.KEYSTATIC_CLOUDFLARE_BUILD==='1'?cloudflare({imageService:'compile'}):undefined,integrations:[react(),markdoc(),keystatic()],publicDir:'../../public',server:{host:'127.0.0.1',port:54943}});

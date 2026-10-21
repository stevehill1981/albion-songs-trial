import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
export const collections={pages:defineCollection({loader:glob({base:'./content/pages',pattern:'**/*.mdoc'})})};

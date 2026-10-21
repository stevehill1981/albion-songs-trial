import {defineMarkdocConfig,component} from '@astrojs/markdoc/config';
export default defineMarkdocConfig({tags:{
 story:{render:component('./src/components/Story.astro'),attributes:{heading:{type:String},text:{type:String},sourceLabel:{type:String},sourceURL:{type:String}}},
 photograph:{render:component('./src/components/CreditedPhoto.astro'),attributes:{heading:{type:String},photograph:{type:String}}}
}});

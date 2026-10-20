import CMS from 'decap-cms-core';
import {en} from 'decap-cms-locales';
import {GitHubBackend} from 'decap-cms-backend-github';
import React from 'react';
import createClass from 'create-react-class';
import StringWidget from 'decap-cms-widget-string';
import TextWidget from 'decap-cms-widget-text';
import NumberWidget from 'decap-cms-widget-number';
import BooleanWidget from 'decap-cms-widget-boolean';
import SelectWidget from 'decap-cms-widget-select';
import ListWidget from 'decap-cms-widget-list';
import ObjectWidget from 'decap-cms-widget-object';
import RelationWidget from 'decap-cms-widget-relation';
import ImageWidget from 'decap-cms-widget-image';

// Keep the existing museum controls/previews on Decap's public extension API.
window.CMS_MANUAL_INIT=true;
window.CMS=CMS;
window.h=React.createElement;
window.createClass=createClass;
CMS.registerBackend('github',GitHubBackend);
CMS.registerLocale('en',en);
CMS.registerWidget([StringWidget,TextWidget,NumberWidget,BooleanWidget,SelectWidget,ListWidget,ObjectWidget,RelationWidget,ImageWidget].map(widget=>widget.Widget()));
await import(/* @vite-ignore */ '/admin/preview.mjs');

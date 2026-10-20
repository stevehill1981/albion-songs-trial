import test from 'node:test';
import assert from 'node:assert/strict';
import {checkModules,checkWidgets} from '../scripts/build-editor.mjs';
test('candidate rejects unsupported configured controls rather than a silent unknown widget',()=>{
 assert.deepEqual(checkWidgets({collections:[{fields:[{widget:'layout-blocks',types:[{fields:[{widget:'relation'}]}]}]}]}),['layout-blocks','relation']);
 assert.throws(()=>checkWidgets({collections:[]}),/no widgets/);
 assert.throws(()=>checkWidgets({fields:[{widget:'layout-blocks',types:[{fields:[{widget:'markdown'}]}]}]}),/does not register/);
});
test('actual module inventory must exclude vulnerable trim, Plate, unused widgets and unrelated backends',()=>{
 for(const path of ['trim/index.js','@platejs/core/dist/index.mjs','platejs/index.js','decap-cms-widget-richtext/index.js','decap-cms-widget-markdown/index.js','decap-cms-backend-gitlab/index.js'])assert.throws(()=>checkModules(['node_modules/'+path]),/Forbidden editor module/);
 assert.throws(()=>checkModules([]),/empty/);
 checkModules(['node_modules/decap-cms-core/dist/esm/index.js','node_modules/decap-cms-backend-github/dist/esm/index.js','node_modules/react-markdown/node_modules/remark-parse/index.js']);
});

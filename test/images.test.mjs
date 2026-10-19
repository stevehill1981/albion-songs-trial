import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {photoURL,MAX_IMAGE_BYTES} from '../src/lib/image-paths.mjs';
import {inspectImage,inspectUploads} from '../src/lib/image-files.mjs';
import {loadMuseum} from '../src/lib/museum-content.mjs';
import {renderPhoto} from '../src/lib/image-library.mjs';
import {renderPageContent} from '../src/lib/blocks.mjs';
import {checkEditorialPaths,checkUploadChanges} from '../scripts/check-editorial-diff.mjs';

test('image addresses remain local and preserve all legacy references',()=>{
 assert.equal(photoURL('team-1888.jpg'),'/assets/team-1888.jpg');assert.equal(photoURL('/assets/team-1888.jpg'),'/assets/team-1888.jpg');assert.equal(photoURL('/uploads/new-photo.webp'),'/uploads/new-photo.webp');
 for(const path of ['/uploads/../private.jpg','/uploads/a/other.png','/uploads/x.svg','/uploads/a.png?x=1','https://example.com/x.jpg','//example.com/x.png','/assets/../../x.jpg','/uploads/a..jpg'])assert.throws(()=>photoURL(path));
});

test('upload drafts add credited raster files while keeping published files and code protected',()=>{
 const added={status:'A',path:'public/uploads/new-photo.jpg'};const photos=[{file:'/uploads/new-photo.jpg'}];
 checkUploadChanges([added,{status:'A',path:'content/photographs/new-photo.json'}],photos);
 for(const status of ['M','D','T'])assert.throws(()=>checkUploadChanges([{...added,status}],photos),/cannot be overwritten or removed/);
 assert.throws(()=>checkUploadChanges([added],[]),/credited photograph/);
 for(const path of ['public/uploads/evil.svg','public/uploads/../app.js','public/assets/old.jpg','public/uploads/not-an-image.txt','scripts/prepare.mjs'])assert.throws(()=>checkEditorialPaths([path]));
});

test('actual image bytes determine dimensions and credited uploads render in reusable blocks',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'albion-images-'));const root=pathToFileURL(dir+'/');
 try{
  await cp('content',join(dir,'content'),{recursive:true});await cp('public',join(dir,'public'),{recursive:true});await mkdir(join(dir,'public/uploads'),{recursive:true});
  const existingUploads=(await inspectUploads(root)).size;
  const target=join(dir,'public/uploads/new-photo.jpg');await cp('public/assets/team-1888.jpg',target);
  const original=JSON.parse(await readFile('content/photographs/team-1888.json','utf8'));
  const photo={...original,id:'new-photo',file:'/uploads/new-photo.jpg',width:1,height:1};
  const record=join(dir,'content/photographs/new-photo.json');await writeFile(record,JSON.stringify(photo));
  const museum=await loadMuseum(root);const actual=museum.photographs['new-photo'];assert.equal(actual.width,675);assert.equal(actual.height,492);
  const page=JSON.parse(await readFile('test/fixtures/layout-initial.json','utf8'));page.blocks[1].columns[1].blocks[0].photograph='new-photo';
  const html=renderPageContent(page,museum);assert(html.includes('src="/uploads/new-photo.jpg" width="675" height="492"'));assert(html.includes(actual.author));
  const parsed=await inspectUploads(root);assert.equal(parsed.size,existingUploads+1);
  for(const key of ['alt','caption','author','licence','url']){await writeFile(record,JSON.stringify({...photo,[key]:''}));await assert.rejects(loadMuseum(root));}
  await writeFile(record,JSON.stringify(photo));await rm(target);await assert.rejects(loadMuseum(root),/missing/);
  await writeFile(target,'not an image');await assert.rejects(inspectImage(root,'/uploads/new-photo.jpg'),/could not be read/);
  await writeFile(target,Buffer.alloc(MAX_IMAGE_BYTES+1));await assert.rejects(inspectImage(root,'/uploads/new-photo.jpg'),/5 MB/);
  await rm(target);await symlink(join(dir,'public/assets/team-1888.jpg'),target);await assert.rejects(inspectImage(root,'/uploads/new-photo.jpg'),/regular files/);
  await rm(target);await cp('public/assets/team-1888.jpg',join(dir,'public/uploads/wrong-format.png'));await assert.rejects(inspectUploads(root),/do not match/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('incomplete image previews cannot introduce executable credit links or markup',()=>{
 const html=renderPhoto({file:'/uploads/photo.jpg',alt:'<img onerror=alert(1)>',caption:'<script>alert(1)</script>',author:'<b>name</b>',licence:'Copyright',url:'javascript:alert(1)',licenceUrl:'data:text/html,test'},{dimensions:false});
 assert(!html.includes('href="javascript:'));assert(!html.includes('href="data:'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));
});

test('image control forwards media updates and resolves draft assets before public URLs',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'albion-image-widget-'));
 let control;const requested=[];const previous=globalThis.window;
 try{
  await cp('public/admin/image-widget.mjs',join(dir,'image-widget.mjs'));await cp('src/lib/image-paths.mjs',join(dir,'image-paths.mjs'));
  const {registerImageWidget}=await import(pathToFileURL(join(dir,'image-widget.mjs')));
  globalThis.window={CMS:{getWidget:()=>({control:function NativeImage(){}}),registerWidget:(_name,definition)=>{control=definition;}},createClass:definition=>definition,h:(type,props,...children)=>({type,props,children})};
  registerImageWidget();
  const instance={...control,props:{value:'/uploads/new-photo.jpg',field:{set(){return this;}},getAsset:path=>{requested.push(path);return{toString:()=> 'blob:local-draft',fileObj:{size:100}};}},state:control.getInitialState(),setState(update){Object.assign(this.state,update);}};
  assert.equal(instance.shouldComponentUpdate(),true);
  instance.resolveImage();assert.deepEqual(requested,['new-photo.jpg']);assert.equal(instance.state.asset,'blob:local-draft');assert.equal(instance.state.loading,true);
  const tree=instance.render();tree.children.find(node=>node?.type==='img').props.onLoad({currentTarget:{naturalWidth:675,naturalHeight:492}});
  assert.equal(instance.state.dimensions,'675 × 492 pixels');assert.equal(instance.isValid(),true);
  instance.props.value='https://untrusted.example/image.jpg';instance.resolveImage();assert.doesNotThrow(()=>instance.render());assert(instance.isValid().error);
 }finally{globalThis.window=previous;await rm(dir,{recursive:true,force:true});}
});

import{test}from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{cloneLayout}from'../src/lib/layout-copy.mjs';
import{validatePage,renderPageContent}from'../src/lib/blocks.mjs';
import{loadContent,publicPage}from'../src/lib/content.mjs';
test('saved layout copies are independent, retain columns, and reject unsupported nesting',async()=>{
 const p=JSON.parse(await readFile('test/fixtures/layout-initial.json','utf8'));
 const copied=cloneLayout(p.blocks);copied[1].columns[0].blocks[0].heading='An independent page heading';
 assert.notEqual(p.blocks[1].columns[0].blocks[0].heading,copied[1].columns[0].blocks[0].heading);
 const context={photographs:{'team-1888':{file:'team-1888.jpg',width:675,height:492,alt:'Team',caption:'Team',author:'Unknown',licence:'Public domain',url:'https://example.com/photo'}}};
 assert(renderPageContent({...p,blocks:copied},context).includes('layout-columns-2'));
 const broken=structuredClone(p);broken.blocks[1].columns.push(...structuredClone(broken.blocks[1].columns));assert.throws(()=>validatePage(broken));
 const nested=structuredClone(p);nested.blocks[1].columns[0].blocks=[structuredClone(p.blocks[1])];assert.throws(()=>validatePage(nested));
 const badBackground=structuredClone(p);badBackground.blocks[1].background='url(javascript:alert(1))';assert.throws(()=>validatePage(badBackground));
});
test('editable quiz data round-trips safely through the built document',async()=>{
 const c=await loadContent();c.quiz.questions[0].question='</script><script>alert(1)</script>';
 const page=c.pages.find(p=>p.slug==='home');const html=publicPage(c,page,'test');
 const raw=html.match(/<script id="quiz-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
 assert(!raw.includes('<'));assert.equal(JSON.parse(raw)[0].question,c.quiz.questions[0].question);
});
test('reused interactive sections retain their controls and page routes remain distinct',async()=>{
 const c=await loadContent();
 const result=c.pages.find(p=>p.slug==='results');
 assert.throws(()=>validatePage({...result,blocks:result.blocks.filter(b=>b.type!=='results-div-2')}),/source-status section together/);
 const home=c.pages.find(p=>p.slug==='home');const intro=c.pages.find(p=>p.slug==='songs').blocks[0];
 const standalone={slug:'new-quiz',title:'New quiz',description:'A standalone quiz',collections:[],blocks:[intro,home.blocks.find(b=>b.type==='home-quiz')]};
 const html=publicPage(c,standalone,'check');assert(html.includes('id="quiz-data"'));assert(html.includes('src="/app.js"'));
 for(const slug of ['templates','data','uploads'])assert.throws(()=>validatePage({...standalone,slug}),/reserved/);
 const story={...standalone,blocks:[intro,result.blocks.find(b=>b.type==='results-rival-villa')]};
 assert(!publicPage(c,story,'check').includes('src="/results.js"'));
});

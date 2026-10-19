import{cloneLayout,toEditorValue}from'./layout-copy.mjs';
import{validatePage}from'./blocks.mjs';
const key='albion-layout-copy-v1';
const plain=value=>value?.toJS?value.toJS():value||[];
export function registerLayoutWidget(){
 window.CMS.registerWidget('answer-choice',window.createClass({render(){return window.h('select',{id:this.props.forID,value:this.props.value??0,onChange:e=>this.props.onChange(Number(e.target.value)),className:this.props.classNameWrapper},...[0,1,2,3,4,5].map(i=>window.h('option',{key:i,value:i},`Answer ${i+1}`)));}}));
 const List=window.CMS.getWidget('list').control;
 const Control=window.createClass({
  getInitialState(){return{library:[],selected:'',message:'',listRevision:0};},
  componentDidMount(){this.live=true;fetch('/admin/layout-library.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(library=>{if(this.live)this.setState({library});}).catch(()=>{if(this.live)this.setState({message:'Saved layouts are unavailable. You can still arrange blocks manually.'});});},
  componentWillUnmount(){this.live=false;},
  isValid(){try{validatePage({slug:'layout-check',title:'Layout',description:'Layout',collections:[],blocks:plain(this.props.value)});return true;}catch(e){return{error:{message:e.message}};}},
  apply(blocks){const copied=cloneLayout(blocks);validatePage({slug:'layout-check',title:'Layout',description:'Layout',collections:[],blocks:copied});this.props.onChange(toEditorValue(copied,this.props.field));this.setState({listRevision:this.state.listRevision+1,message:'Layout copied. This page has its own independent blocks; save a draft and preview before publishing.'});},
  render(){
   const selected=this.state.library.find(item=>item.key===this.state.selected);
   return window.h('div',{},
    window.h('div',{style:{padding:'12px',border:'1px solid #cbd5e1',marginBottom:'16px'}},
     window.h('label',{},'Start from a saved template or published page',window.h('select',{value:this.state.selected,onChange:e=>this.setState({selected:e.target.value}),style:{display:'block',width:'100%',marginBlock:'8px'}},window.h('option',{value:''},'Choose a layout…'),...this.state.library.map(item=>window.h('option',{key:item.key,value:item.key},`${item.kind}: ${item.title}`)))),
     window.h('button',{type:'button',disabled:!selected,onClick:()=>{try{this.apply(selected.blocks);}catch(e){this.setState({message:e.message});}}},'Replace blocks with selected layout'),
     window.h('button',{type:'button',style:{marginLeft:'8px'},onClick:()=>{try{sessionStorage.setItem(key,JSON.stringify({version:1,blocks:plain(this.props.value)}));this.setState({message:'Layout copied. To save it as a template: open Page templates → New, enter its name and address, then choose Paste copied layout below and save.'});}catch{this.setState({message:'This layout could not be copied. Save it as a draft first, then copy it from the published-page list.'});}}},'Copy layout for a template'),
     window.h('button',{type:'button',style:{marginLeft:'8px'},onClick:()=>{try{const copied=JSON.parse(sessionStorage.getItem(key));if(copied?.version!==1)throw Error('Copy a layout first.');this.apply(copied.blocks);}catch(e){this.setState({message:e.message||'Copy a layout first.'});}}},'Paste copied layout'),
     window.h('p',{role:'status'},this.state.message),
     window.h('p',{},'Template copies are independent. Changing a saved template affects future copies only. Layouts keep their text and links: replace sample content before publishing.')
    ),
    window.h(List,{...this.props,key:this.state.listRevision,field:this.props.field.set('widget','list')})
   );
  }
 });
 window.CMS.registerWidget('layout-blocks',Control);
}

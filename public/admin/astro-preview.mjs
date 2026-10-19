import {isComponentDraft,validateComponentPage} from './component-preview.mjs';
import {createLivePreview} from './live-preview.mjs';
export function createAstroPreview({getToken,fallback}){
 const Live=window.createClass({
  getInitialState(){return{html:'',status:'updating',message:'Preparing Astro component preview…'};},
  componentDidMount(){
   this.live=true;
   this.preview=createLivePreview({
    request:async(page,signal)=>{
     try{validateComponentPage(page);}catch{throw Error('Complete the required page and block fields to update the preview.');}const token=await getToken();
     const response=await fetch('/editor-preview',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({page}),signal,cache:'no-store',credentials:'omit',redirect:'error'});
     if(!response.ok)throw Error(await response.text());
     if(response.headers.get('X-Albion-Renderer')!=='astro-components')throw Error('The Astro preview response could not be verified.');
     return response.text();
    },
    onState:update=>{
     if(!this.live)return;
     const view=this.props.window;const scroll=view?{x:view.scrollX,y:view.scrollY}:null;
     this.setState(update,()=>{if(scroll&&update.html!==undefined)view.scrollTo(scroll.x,scroll.y);});
    }
   });
   this.updatePreview();
  },
  componentDidUpdate(previous){if(previous.entry.get('data')!==this.props.entry.get('data'))this.updatePreview();},
  componentWillUnmount(){this.live=false;this.preview?.dispose();},
  updatePreview(){const data=this.props.entry.get('data').toJS();data.collections??=[];this.preview.update(data);},
  render(){if(!isComponentDraft(this.props.entry.get('data').toJS()))return fallback(this.props);return window.h('div',{},window.h('p',{role:'status',style:{padding:'10px 20px',background:'#edf1f8',color:'#111d49',fontSize:'14px',position:'sticky',top:0,zIndex:5}},this.state.message+(this.state.status==='error'&&this.state.html?' The last successful preview is still shown.':'')),this.state.html?window.h('div',{'aria-busy':this.state.status==='updating',dangerouslySetInnerHTML:{__html:this.state.html}}):null);}
 });
 return props=>window.h(Live,props);
}

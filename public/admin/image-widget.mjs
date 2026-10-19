import {photoURL,checkUploadSize,MAX_IMAGE_PIXELS} from './image-paths.mjs';
export function registerImageWidget(){
 const ImageControl=window.CMS.getWidget('image').control;
 const Control=window.createClass({
  getInitialState(){return{asset:'',dimensions:'',error:'',loading:false};},
  // Decap's outer Widget otherwise drops mediaPaths updates when value is unchanged.
  shouldComponentUpdate(){return true;},
  componentDidMount(){this.resolveImage();},
  componentDidUpdate(){this.resolveImage();},
  resolveImage(){
   if(!this.props.value){if(this.state.asset||this.state.error)this.setState({asset:'',dimensions:'',error:'',loading:false});return;}
   try{const path=photoURL(this.props.value);const asset=this.props.getAsset(path.startsWith('/uploads/')?path.split('/').pop():path,this.props.field);if(asset?.fileObj)checkUploadSize(asset.fileObj.size);if(String(asset)!==this.state.asset)this.setState({asset:String(asset),dimensions:'',error:'',loading:true});}catch(error){if(this.state.error!==error.message)this.setState({asset:'',dimensions:'',error:error.message,loading:false});}
  },
  isValid(){if(this.state.error)return{error:{message:this.state.error}};if(this.state.loading)return{error:{message:'Wait for the image thumbnail and dimensions to finish loading.'}};return true;},
  render(){let value='';try{value=this.props.value?photoURL(this.props.value):'';}catch{}return window.h('div',{},
   window.h(ImageControl,{...this.props,field:this.props.field.set('widget','image'),value,getAsset:(path,field)=>this.props.getAsset(path.startsWith('/uploads/')?path.split('/').pop():path,field),onChange:value=>{try{if(value)photoURL(value);this.props.onChange(value);}catch(error){this.setState({error:error.message});}}}),
   this.state.asset?window.h('img',{key:this.state.asset,src:this.state.asset,alt:'',hidden:true,onLoad:event=>{const{naturalWidth:width,naturalHeight:height}=event.currentTarget;this.setState({loading:false,dimensions:`${width.toLocaleString()} × ${height.toLocaleString()} pixels`,error:width>8000||height>8000||width*height>MAX_IMAGE_PIXELS?'Resize this image: the limit is 8,000 pixels per side and 32 megapixels.':''});},onError:()=>this.setState({loading:false,error:'This image could not be loaded. Choose a valid JPEG, PNG or WebP.'})}):null,
   window.h('p',{role:'status'},this.state.error||this.state.dimensions||'Upload or choose a JPEG, PNG or WebP, up to 5 MB. Dimensions are read automatically.'),
   window.h('p',{},'Save this photograph as a draft with its caption and credits, preview it, then publish it before choosing it on another page.')
  );}
 });
 window.CMS.registerWidget('museum-image',Control);
}

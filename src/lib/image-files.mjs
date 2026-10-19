import {readFile,lstat,realpath,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {sep} from 'node:path';
import {imageMetadata} from 'astro/assets/utils';
import {photoURL,checkUploadSize,MAX_UPLOAD_BYTES,MAX_IMAGE_PIXELS} from './image-paths.mjs';
export async function inspectImage(root,publicPath){
 const path=photoURL(publicPath);const target=new URL(`public${path}`,root);
 const info=await lstat(target).catch(()=>{throw Error(`The selected image is missing: ${path}. Upload it with this photograph draft.`);});
 const publicRoot=await realpath(new URL('public/',root));const resolved=await realpath(target);
 if(!info.isFile()||info.isSymbolicLink()||!resolved.startsWith(publicRoot+sep))throw Error('Image files must be regular files inside the public image library.');
 if(path.startsWith('/uploads/'))checkUploadSize(info.size);
 let metadata;try{metadata=await imageMetadata(await readFile(target),fileURLToPath(target));}catch{throw Error(`This image could not be read: ${path}. Choose a valid JPEG, PNG or WebP.`);}
 const extension=path.split('.').at(-1).replace('jpeg','jpg');
 if(!['jpg','png','webp'].includes(metadata.format)||metadata.format!==extension)throw Error(`The image contents do not match its filename: ${path}.`);
 const {width,height}=metadata;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8000||height>8000||width*height>MAX_IMAGE_PIXELS)throw Error('Images must be at most 8,000 pixels on either side and 32 megapixels. Resize this image before uploading.');
 return {width,height,bytes:info.size};
}
export async function inspectUploads(root){
 const directory=new URL('public/uploads/',root);let files;
 try{const stat=await lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('The upload library must be a regular directory.');files=await readdir(directory);}catch(error){if(error.code==='ENOENT')return new Map();throw error;}
 if(files.length>500)throw Error('The free image library has reached its 500-upload limit.');
 const entries=[];let total=0;
 for(const name of files){const path=photoURL(`/uploads/${name}`);const image=await inspectImage(root,path);total+=image.bytes;if(total>MAX_UPLOAD_BYTES)throw Error('The free image library has reached its 100 MB upload limit.');entries.push([path,image]);}
 return new Map(entries);
}

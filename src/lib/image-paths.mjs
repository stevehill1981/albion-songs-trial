export const MAX_IMAGE_BYTES=5*1024*1024;
export const MAX_UPLOAD_BYTES=100*1024*1024;
export const MAX_IMAGE_PIXELS=32_000_000;
export const uploadPathPattern=/^\/uploads\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/;
export function photoURL(file){
 if(typeof file!=='string'||file.includes('..'))throw Error('Choose a JPEG, PNG or WebP from the image library.');
 if(uploadPathPattern.test(file))return file;
 if(/^(?:\/assets\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp)$/.test(file))return file.startsWith('/')?file:`/assets/${file}`;
 throw Error('Choose a local JPEG, PNG or WebP; external image addresses and folders are not supported.');
}
export function checkUploadSize(bytes){if(!Number.isInteger(bytes)||bytes<1||bytes>MAX_IMAGE_BYTES)throw Error('Choose an image no larger than 5 MB.');}

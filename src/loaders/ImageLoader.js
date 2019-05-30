import { DataImage } from '../DataImage.js';
import 'three';

/**
 * Image loader with progress based on {@link https://github.com/mrdoob/three.js/blob/master/src/loaders/ImageLoader.js}
 * @memberOf PANOLENS
 * @namespace
 */
const ImageLoader = {

	load: function ( url, onLoad, onProgress, onError ) {

		// Enable cache
		THREE.Cache.enabled = true;

		let cached, request, arrayBufferView, blob, urlCreator, image, reference;
	
		// Reference key
		for ( let iconName in DataImage ) {
	
			if ( DataImage.hasOwnProperty( iconName ) && url === DataImage[ iconName ] ) {
	
				reference = iconName;
	
			}
	
		}
	
		// Cached
		cached = THREE.Cache.get( reference ? reference : url );
	
		if ( cached !== undefined ) {
	
			if ( onLoad ) {
	
				setTimeout( function () {
	
					if ( onProgress ) {
	
						onProgress( { loaded: 1, total: 1 } );
	
					} 
					
					onLoad( cached );
	
				}, 0 );
	
			}
	
			return cached;
	
		}
		
		// Construct a new XMLHttpRequest
		urlCreator = window.URL || window.webkitURL;
		image = document.createElementNS( 'http://www.w3.org/1999/xhtml', 'img' );
	
		// Add to cache
		THREE.Cache.add( reference ? reference : url, image );
	
		const onImageLoaded = () => {
	
			urlCreator.revokeObjectURL( image.src );
			onLoad && onLoad( image );
	
		}
	
		if ( url.indexOf( 'data:' ) === 0 ) {
	
			image.addEventListener( 'load', onImageLoaded, false );
			image.src = url;
			return image;
		}
	
		image.crossOrigin = this.crossOrigin !== undefined ? this.crossOrigin : '';
	
		request = new XMLHttpRequest();
		request.open( 'GET', url, true );
		request.responseType = 'arraybuffer';
		request.onprogress = function ( event ) {
	
				if ( event.lengthComputable ) {
	
					onProgress && onProgress( { loaded: event.loaded, total: event.total } );
	
				}
	
		};
		request.onloadend = function( event ) {
	
				arrayBufferView = new Uint8Array( this.response );
				blob = new Blob( [ arrayBufferView ] );
				
				image.addEventListener( 'load', onImageLoaded, false );
			image.src = urlCreator.createObjectURL( blob );
	
		};
	
		request.send(null);
	
	}

};

export { ImageLoader };
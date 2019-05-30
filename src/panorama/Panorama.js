import { Infospot } from '../infospot/Infospot';
import { DataImage } from '../DataImage';
import 'three';
import TWEEN from '@tweenjs/tween.js';

/**
 * Skeleton panorama derived from THREE.Mesh
 * @constructor
 * @param {THREE.Geometry} geometry - The geometry for this panorama
 * @param {THREE.Material} material - The material for this panorama
 */
function Panorama ( geometry, material ) {

	THREE.Mesh.call( this, geometry, material );

	this.type = 'panorama';

	this.ImageQualityLow = 1;
	this.ImageQualityFair = 2;
	this.ImageQualityMedium = 3;
	this.ImageQualityHigh = 4;
	this.ImageQualitySuperHigh = 5;

	this.animationDuration = 1000;

	this.defaultInfospotSize = 350;

	this.container = undefined;

	this.loaded = false;

	this.linkedSpots = [];

	this.isInfospotVisible = false;
	
	this.linkingImageURL = undefined;
	this.linkingImageScale = undefined;

	this.material.side = THREE.BackSide;
	this.material.opacity = 0;

	this.scale.x *= -1;
	this.renderOrder = -1;

	this.active = false;

	this.infospotAnimation = new TWEEN.Tween( this ).to( {}, this.animationDuration / 2 );

	this.addEventListener( 'load', this.fadeIn.bind( this ) );
	this.addEventListener( 'panolens-container', this.setContainer.bind( this ) );
	this.addEventListener( 'click', this.onClick.bind( this ) );

	this.setupTransitions();

}

Panorama.prototype = Object.assign( Object.create( THREE.Mesh.prototype ), {

	constructor: Panorama,

	/**
	 * Adding an object
	 * To counter the scale.x = -1, it will automatically add an 
	 * empty object with inverted scale on x
	 * @param {THREE.Object3D} object - The object to be added
	 */
	add: function ( object ) {

		let invertedObject;

		if ( arguments.length > 1 ) {

			for ( var i = 0; i < arguments.length; i ++ ) {

				this.add( arguments[ i ] );

			}

			return this;

		}

		// In case of infospots
		if ( object instanceof Infospot ) {

			invertedObject = object;

			if ( object.dispatchEvent ) {

				this.container && object.dispatchEvent( { type: 'panolens-container', container: this.container } );
				
				object.dispatchEvent( { type: 'panolens-infospot-focus', method: function ( vector, duration, easing ) {

					/**
					 * Infospot focus handler event
					 * @type {object}
					 * @event PANOLENS.Panorama#panolens-viewer-handler
					 * @property {string} method - Viewer function name
					 * @property {*} data - The argument to be passed into the method
					 */
					this.dispatchEvent( { type : 'panolens-viewer-handler', method: 'tweenControlCenter', data: [ vector, duration, easing ] } );


				}.bind( this ) } );
			}

		} else {

			// Counter scale.x = -1 effect
			invertedObject = new THREE.Object3D();
			invertedObject.scale.x = -1;
			invertedObject.scalePlaceHolder = true;
			invertedObject.add( object );

		}

		THREE.Object3D.prototype.add.call( this, invertedObject );

	},

	load: function () {

		this.onLoad();
		
	},

	/**
	 * Click event handler
	 * @param  {object} event - Click event
	 * @fires PANOLENS.Infospot#dismiss
	 */
	onClick: function ( event ) {

		if ( event.intersects && event.intersects.length === 0 ) {

			this.traverse( function ( object ) {

				/**
				 * Dimiss event
				 * @type {object}
				 * @event PANOLENS.Infospot#dismiss
				 */
				object.dispatchEvent( { type: 'dismiss' } );

			} );

		}

	},

	/**
	 * Set container of this panorama 
	 * @param {HTMLElement|object} data - Data with container information
	 * @fires PANOLENS.Infospot#panolens-container
	 */
	setContainer: function ( data ) {

		let container;

		if ( data instanceof HTMLElement ) {

			container = data;

		} else if ( data && data.container ) {

			container = data.container;

		}

		if ( container ) {

			this.children.forEach( function ( child ) {

				if ( child instanceof Infospot && child.dispatchEvent ) {

					/**
					 * Set container event
					 * @type {object}
					 * @event PANOLENS.Infospot#panolens-container
					 * @property {HTMLElement} container - The container of this panorama
					 */
					child.dispatchEvent( { type: 'panolens-container', container: container } );

				}

			} );

			this.container = container;

		}

	},

	/**
	 * This will be called when panorama is loaded
	 * @fires PANOLENS.Panorama#load
	 */
	onLoad: function () {

		this.loaded = true;

		/**
		 * Load panorama event
		 * @type {object}
		 * @event PANOLENS.Panorama#load
		 */
		this.dispatchEvent( { type: 'load' } );

	},

	/**
	 * This will be called when panorama is in progress
	 * @fires PANOLENS.Panorama#progress
	 */
	onProgress: function ( progress ) {

		/**
		 * Loading panorama progress event
		 * @type {object}
		 * @event PANOLENS.Panorama#progress
		 * @property {object} progress - The progress object containing loaded and total amount
		 */
		this.dispatchEvent( { type: 'progress', progress: progress } );

	},

	/**
	 * This will be called when panorama loading has error
	 * @fires PANOLENS.Panorama#error
	 */
	onError: function () {

		/**
		 * Loading panorama error event
		 * @type {object}
		 * @event PANOLENS.Panorama#error
		 */
		this.dispatchEvent( { type: 'error' } );

	},

	/**
	 * Get zoom level based on window width
	 * @return {number} zoom level indicating image quality
	 */
	getZoomLevel: function () {

		let zoomLevel;

		if ( window.innerWidth <= 800 ) {

			zoomLevel = this.ImageQualityFair;

		} else if ( window.innerWidth > 800 &&  window.innerWidth <= 1280 ) {

			zoomLevel = this.ImageQualityMedium;

		} else if ( window.innerWidth > 1280 && window.innerWidth <= 1920 ) {

			zoomLevel = this.ImageQualityHigh;

		} else if ( window.innerWidth > 1920 ) {

			zoomLevel = this.ImageQualitySuperHigh;

		} else {

			zoomLevel = this.ImageQualityLow;

		}

		return zoomLevel;

	},

	/**
	 * Update texture of a panorama
	 * @param {THREE.Texture} texture - Texture to be updated
	 */
	updateTexture: function ( texture ) {

		this.material.map = texture;
		this.material.needsUpdate = true;

	},

	/**
	 * Toggle visibility of infospots in this panorama
	 * @param  {boolean} isVisible - Visibility of infospots
	 * @param  {number} delay - Delay in milliseconds to change visibility
	 * @fires PANOLENS.Panorama#infospot-animation-complete
	 */
	toggleInfospotVisibility: function ( isVisible, delay ) {

		delay = ( delay !== undefined ) ? delay : 0;

		const visible = ( isVisible !== undefined ) ? isVisible : ( this.isInfospotVisible ? false : true );

		this.traverse( function ( object ) {

			if ( object instanceof Infospot ) {

				visible ? object.show( delay ) : object.hide( delay );

			}

		} );

		this.isInfospotVisible = visible;

		// Animation complete event
		this.infospotAnimation.onComplete( function () {

			/**
			 * Complete toggling infospot visibility
			 * @event PANOLENS.Panorama#infospot-animation-complete
			 * @type {object} 
			 */
			this.dispatchEvent( { type : 'infospot-animation-complete', visible: visible } );

		}.bind( this ) ).delay( delay ).start();

	},

	/**
	 * Set image of this panorama's linking infospot
	 * @param {string} url   - Url to the image asset
	 * @param {number} scale - Scale factor of the infospot
	 */
	setLinkingImage: function ( url, scale ) {

		this.linkingImageURL = url;
		this.linkingImageScale = scale;

	},

	/**
	 * Link one-way panorama
	 * @param  {PANOLENS.Panorama} pano  - The panorama to be linked to
	 * @param  {THREE.Vector3} position - The position of infospot which navigates to the pano
	 * @param  {number} [imageScale=300] - Image scale of linked infospot
	 * @param  {string} [imageSrc=PANOLENS.DataImage.Arrow] - The image source of linked infospot
	 */
	link: function ( pano, position, imageScale, imageSrc ) {

		let scale, img;

		this.visible = true;

		if ( !position ) {

			console.warn( 'Please specify infospot position for linking' );

			return;

		}

		// Infospot scale
		if ( imageScale !== undefined ) {

			scale = imageScale;

		} else if ( pano.linkingImageScale !== undefined ) {

			scale = pano.linkingImageScale;

		} else {

			scale = 300;

		}


		// Infospot image
		if ( imageSrc ) {

			img = imageSrc

		} else if ( pano.linkingImageURL ) {

			img = pano.linkingImageURL;

		} else {

			img = DataImage.Arrow;

		}

		// Creates a new infospot
		const spot = new Infospot( scale, img );
		spot.position.copy( position );
		spot.toPanorama = pano;
		spot.addEventListener( 'click', function () {

			/**
			 * Viewer handler event
			 * @type {object}
			 * @event PANOLENS.Panorama#panolens-viewer-handler
			 * @property {string} method - Viewer function name
			 * @property {*} data - The argument to be passed into the method
			 */
			this.dispatchEvent( { type : 'panolens-viewer-handler', method: 'setPanorama', data: pano } );

		}.bind( this ) );

		this.linkedSpots.push( spot );

		this.add( spot );

		this.visible = false;

	},

	reset: function () {

		this.children.length = 0;	

	},

	setupTransitions: function () {

		this.fadeInAnimation = new TWEEN.Tween( this.material )
			.easing( TWEEN.Easing.Quartic.Out )
			.onStart( function () {

				this.visible = true;
				//this.material.visible = true;

				/**
				 * Enter panorama fade in start event
				 * @event PANOLENS.Panorama#enter-fade-start
				 * @type {object} 
				 */
				this.dispatchEvent( { type: 'enter-fade-start' } );

			}.bind( this ) );

		this.fadeOutAnimation = new TWEEN.Tween( this.material )
			.easing( TWEEN.Easing.Quartic.Out )
			.onComplete( function () {

				this.visible = false;
				//this.material.visible = true;

				/**
				 * Leave panorama complete event
				 * @event PANOLENS.Panorama#leave-complete
				 * @type {object} 
				 */
				this.dispatchEvent( { type: 'leave-complete' } );

			}.bind( this ) );

		this.enterTransition = new TWEEN.Tween( this )
			.easing( TWEEN.Easing.Quartic.Out )
			.onComplete( function () {

				/**
				 * Enter panorama and animation complete event
				 * @event PANOLENS.Panorama#enter-animation-complete
				 * @type {object} 
				 */
				this.dispatchEvent( { type: 'enter-animation-complete' } );

			}.bind ( this ) )
			.start();

		this.leaveTransition = new TWEEN.Tween( this )
			.easing( TWEEN.Easing.Quartic.Out );

	},

	onFadeAnimationUpdate: function () {

		const alpha = this.material.opacity;
		const { uniforms } = this.material;

		if ( uniforms && uniforms.opacity ) {
			uniforms.opacity.value = alpha;
		}

	},

	/**
	 * Start fading in animation
	 * @fires PANOLENS.Panorama#enter-fade-complete
	 */
	fadeIn: function ( duration ) {

		duration = duration >= 0 ? duration : this.animationDuration;

		this.fadeOutAnimation.stop();
		this.fadeInAnimation
		.to( { opacity: 1 }, duration )
		.onUpdate( this.onFadeAnimationUpdate.bind( this ) )
		.onComplete( function () {

				this.toggleInfospotVisibility( true, duration / 2 );

				/**
				 * Enter panorama fade complete event
				 * @event PANOLENS.Panorama#enter-fade-complete
				 * @type {object} 
				 */
				this.dispatchEvent( { type: 'enter-fade-complete' } );			

			}.bind( this ) )
		.start();

	},

	/**
	 * Start fading out animation
	 */
	fadeOut: function ( duration ) {

		duration = duration >= 0 ? duration : this.animationDuration;

		this.fadeInAnimation.stop();
		this.fadeOutAnimation
		.to( { opacity: 0 }, duration )
		.onUpdate( this.onFadeAnimationUpdate.bind( this ) )
		.start();

	},

	/**
	 * This will be called when entering a panorama 
	 * @fires PANOLENS.Panorama#enter
	 * @fires PANOLENS.Panorama#enter-animation-start
	 */
	onEnter: function () {

		const duration = this.animationDuration;

		this.leaveTransition.stop();
		this.enterTransition
			.to( {}, duration )
			.onStart( function () {

				/**
				 * Enter panorama and animation starting event
				 * @event PANOLENS.Panorama#enter-animation-start
				 * @type {object} 
				 */
				this.dispatchEvent( { type: 'enter-animation-start' } );
				
				if ( this.loaded ) {

					this.fadeIn( duration );

				} else {

					this.load();

				}
				
			}.bind( this ) )
			.start();

		/**
		 * Enter panorama event
		 * @event PANOLENS.Panorama#enter
		 * @type {object} 
		 */
		this.dispatchEvent( { type: 'enter' } );

		this.children.forEach( child => {

			child.dispatchEvent( { type: 'panorama-enter' } );

		} );

		this.active = true;

	},

	/**
	 * This will be called when leaving a panorama
	 * @fires PANOLENS.Panorama#leave
	 */
	onLeave: function () {

		const duration = this.animationDuration;

		this.enterTransition.stop();
		this.leaveTransition
			.to( {}, duration )
			.onStart( function () {

				/**
				 * Leave panorama and animation starting event
				 * @event PANOLENS.Panorama#leave-animation-start
				 * @type {object} 
				 */
				this.dispatchEvent( { type: 'leave-animation-start' } );

				this.fadeOut( duration );
				this.toggleInfospotVisibility( false );

			}.bind( this ) )
			.start();

		/**
		 * Leave panorama event
		 * @event PANOLENS.Panorama#leave
		 * @type {object} 
		 */
		this.dispatchEvent( { type: 'leave' } );

		this.children.forEach( child => {

			child.dispatchEvent( { type: 'panorama-leave' } );

		} );

		this.active = false;

	},

	/**
	 * Dispose panorama
	 */
	dispose: function () {

		/**
		 * On panorama dispose handler
		 * @type {object}
		 * @event PANOLENS.Panorama#panolens-viewer-handler
		 * @property {string} method - Viewer function name
		 * @property {*} data - The argument to be passed into the method
		 */
		this.dispatchEvent( { type : 'panolens-viewer-handler', method: 'onPanoramaDispose', data: this } );

		// recursive disposal on 3d objects
		function recursiveDispose ( object ) {

			for ( var i = object.children.length - 1; i >= 0; i-- ) {

				recursiveDispose( object.children[i] );
				object.remove( object.children[i] );

			}

			if ( object instanceof Infospot ) {

				object.dispose();

			}
			
			object.geometry && object.geometry.dispose();
			object.material && object.material.dispose();
		}

		recursiveDispose( this );

		if ( this.parent ) {

			this.parent.remove( this );

		}

	}

} );

export { Panorama };

/*
	AssetManager keeps track of all the special assets like animated NPCs and bonuses.
	At initialisation, it create groups that will hold the loaded assets once loading is done.
	AssetManager is able to hide/show the groups when gameState tells it to change of graph.
*/

function AssetManager() {

	// assets constants
	const SCALE_ALPINIST = 0.1 ;
	const SCALE_LADY = 0.08 ;
	const SCALE_CHAR = 0.075 ;
	const SCALE_EDELWEISS = 0.02 ;

	const CAVE_EXIT_LIGHT_INTENS = 0.5;
	const CAVE_EXIT_LIGHT_LENGTH = 9;

	const OFFSET_EDELWEISS = new THREE.Vector3( 0, 0.1, 0 );

	const particleGeometry = new THREE.SphereBufferGeometry( 0.03, 4, 3 );
	const particleMaterial = new THREE.MeshBasicMaterial({ color:0xffffff });

	// What graph the player is currently playing in ?
	var currentGraph = 'mountain' ;

	// will be used to add a label at the top of the hero if multiplayer
	const textCanvas = document.createElement( 'canvas' );
	textCanvas.height = 34;

	// Hold one mixer and (optionally) one set of actions per asset iteration
	var charMixers = [], charActions = [];
	var miscMixers = new Map(), miscModels = new Map(), bonusCubes = {}, bonusWasDeleted = {};

	// Asset groups arrays
	var characters = [ new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group() ];

	// different sets of color for the hero character,
	// for multiplayer differentiation.
	var charSkins = [
		textureLoader.load( 'assets/models/hero-2.png' ),
		textureLoader.load( 'assets/models/hero-3.png' ),
		textureLoader.load( 'assets/models/hero-4.png' ),
		null
	];

	// procedural bonus (could be glb file, too)
	function makeBonus( resolve ) {
		
		const bonus = { scene: new THREE.Group(), animations: [] };

		const cone = new THREE.ConeBufferGeometry( 0.1, 0.2, 4 );
		const half1 = new THREE.Mesh( cone, particleMaterial );
		const half2 = new THREE.Mesh( cone, particleMaterial );

		half1.position.y = 0.1 ;
		half2.position.y = -0.1 ;
		half2.rotation.x = Math.PI ;

		bonus.scene.add( half1, half2 );

		resolve( bonus );

	};

	// create animation of little balls spinning around bonuses
	function addParticles( group ) {

		for ( let i = 0 ; i < 26 ; i ++ ) {

			let particle = new THREE.Mesh(
				particleGeometry,
				particleMaterial
			);

			let particleGroup = new THREE.Group();
			particleGroup.scale.setScalar( 1 / group.scale.x );

			let yOffset = Math.random() ;

			particle.position.y += ( yOffset * 1.7 ) - 0.3 ;
			particle.position.x += ( Math.random() * 0.1 ) + ( ( 1 - yOffset ) * 0.2 ) + 0.1 ;

			particle.scale.setScalar( (1 - yOffset) + 0.1 );

			particleGroup.rotation.y = Math.random() * ( Math.PI * 2 );
			particleGroup.userData.rotationSpeed = ( Math.random() * 0.1 ) + 0.02 ;

			particleGroup.add( particle );
			group.add( particleGroup );

		};

	};

	//// ASSETS LOADING /////

	var charGlb;

	gltfLoader.load('assets/models/hero.glb', (glb)=> {

		charGlb = glb;

		const body = glb.scene.getObjectByName( 'hero001' );
		if ( body ) charSkins[ 3 ] = body.material.map;

		createMultipleModels(
			glb,
			SCALE_CHAR,
			characters,
			charMixers,
			charActions
		);

	});

	// Create iterations of the same loaded asset. nasty because of skeletons.
	// Hopefully THREE.SkeletonUtils.clone() is able to clone skeletons correctly.
	function createMultipleModels( glb, scale, modelsArr, mixers, actions ) {

		glb.scene.scale.setScalar( scale );

		for ( let i = mixers ? mixers.length : 0 ; i < modelsArr.length ; i++ ) {

			let newModel = THREE.SkeletonUtils.clone( glb.scene );

			modelsArr[ i ].add( newModel );

			if ( mixers ) {

				mixers[ i ] = new THREE.AnimationMixer( newModel );

				actions[ i ] = {};
				for ( let clip of glb.animations ) {
					actions[ i ][ clip.name ] = mixers[ i ].clipAction( clip ).play();
				};

			};

			setLambert( newModel );

		};

	};

	// Create a label at the top of the hero characters head,
	// for multiplayer differentiation
	function createCharacterLabel( text ) {

		const ctx = textCanvas.getContext( '2d' );
		const font = '24px grobold';

		ctx.font = font;
		textCanvas.width = Math.ceil( ctx.measureText( text ).width + 16 );

		ctx.font = font;
		ctx.strokeStyle = '#222';
		ctx.lineWidth = 8;
		ctx.lineJoin = 'miter';
		ctx.miterLimit = 3;
		ctx.strokeText( text, 8, 26 );
		ctx.fillStyle = 'white';
		ctx.fillText( text, 8, 26 );

		const spriteMap = new THREE.Texture( ctx.getImageData( 0, 0, textCanvas.width, textCanvas.height ) );
		spriteMap.minFilter = THREE.LinearFilter;
		spriteMap.generateMipmaps = false;
		spriteMap.needsUpdate = true;

		const sprite = new THREE.Sprite( new THREE.SpriteMaterial( { map: spriteMap } ) );
		sprite.scale.set( 0.12 * textCanvas.width / textCanvas.height, 0.12, 1 );
		sprite.position.y = 0.7 ;

		return sprite;

	};

	//

	function createCharacter( skinIndex, displayName ) {

		for ( let i = 0; i < characters.length; i++ ) {

			if ( !characters[ i ].userData.isUsed ) {
				 
				 characters[ i ].userData.isUsed = true;

				// assign character skin
				let skin = charSkins[ skinIndex % charSkins.length ];
				if( skin ) {
					let body = characters[ i ].getObjectByName( 'hero001' );
					if( body ) {
						body.material.map = skin;
					};
				};

				// set up charater display name
				if( displayName ) {
					characters[ i ].add( createCharacterLabel( displayName ) );
				};

				// return both the character and its actions
				return {
					model : characters[ i ], actions : charActions[ i ]
				};
			};

		};

		// if here, we have exhausted all the characters - make some more

		characters.push( new THREE.Group(), new THREE.Group() );

		createMultipleModels(
			charGlb,
			SCALE_CHAR,
			characters,
			charMixers,
			charActions
		);

		return createCharacter( skinIndex, displayName );
	};

	//

	function releaseCharacter( model ) {

		model.userData.isUsed = false;

		const label = model.getObjectByProperty( 'type', 'Sprite' );
		if ( label ) model.remove( label ) && label.material.map.dispose();

	};

	//

	function toggleCharacterShadows( enabled ) {

		for ( let character of characters ) {

			character.traverse( function (child) {

				if ( child.type == 'Mesh' ||
					 child.type == 'SkinnedMesh' ) {

					child.castShadow = enabled ;
					child.receiveShadow = enabled ;
				};

			});

		};

	};

	/////////////////////
	///  INSTANCES SETUP
	/////////////////////

	var glbs = {};

	function createNewObject( logicCube ) {

		if( miscModels.get( logicCube ) ) return;

		if( bonusWasDeleted[ logicCube.tag ] ) return;

		var url, floor, bubbleOffset, offset = 0, rotation = 0, scale = 1, bonus = false, light;

		// decide what model do we need to load

		if ( logicCube.type == 'cube-interactive' ) {

			floor = true;

			if ( /npc-(boat|respawn)/.test( logicCube.tag ) ) {

				url = 'assets/models/alpinist.glb'; scale = SCALE_ALPINIST;

				bubbleOffset = 0.6;
			}

			else if ( /npc(?!-dev)/.test( logicCube.tag ) ) {

				url = 'assets/models/lady.glb'; scale = SCALE_LADY;

				bubbleOffset = 0.45;
			}
		}

		else if ( logicCube.type == 'cube-trigger' ) {

			if ( /bonus-stamina/.test( logicCube.tag ) ) {

				url = 'assets/models/edelweiss.glb'; scale = SCALE_EDELWEISS;

				offset = OFFSET_EDELWEISS.y; bonus = true;
			}

			else if ( /bonus(?!-hidden)/.test( logicCube.tag ) ) {

				url = 'bonus';

				bonus = true;
			}

			else if ( /^cave-/.test( logicCube.tag ) && ( currentGraph != 'mountain' ) ) {

				url = 'light';

				light = new THREE.PointLight(
					0xffffff,
					CAVE_EXIT_LIGHT_INTENS,
					CAVE_EXIT_LIGHT_LENGTH
				);
			}

			else if ( /^light-[^\-]+-[\.\d]+/.test( logicCube.tag ) ) {

				url = 'light';

				// set key light params via cube tag: light-#f7c-4.2
				const params = logicCube.tag.split( '-' );

				light = new THREE.PointLight(
					params[ 1 ], 1.0, parseFloat( params[ 2 ] )
				);
			}
		}

		else if ( logicCube.type == 'cube-inert' ) {

			const parsedTag = logicCube.tag.match( /^(.+glb)\??(.*)?$/i );

			if ( parsedTag ) {

				url = 'assets/models/' + parsedTag[1];

				// rotate the model if the tag has r=<degrees>
				const pattern = /r=(\d+)/;
				if ( pattern.test( parsedTag[2] ) ) {
					rotation = Math.PI * parseInt( parsedTag[2].match( pattern )[1] ) / 180;
				}
			}
		}

		// if we have the url - load it
		if( !url ) return;

		let key = light ? logicCube.tag : url;

		let promise = glbs[ key ];

		if( !promise ) switch( url ) {

			case 'bonus':
				promise = new Promise( makeBonus );
				break;

			case 'light':
				promise = new Promise( function( resolve ) {

					resolve( { scene: light, animations: [] } );

				} );
				break;

			default:
				promise = new Promise( function( resolve ) {

					gltfLoader.load( url, resolve );

				} );
				break;
		}

		glbs[ key ] = promise;

		promise.then( function( glb ) {

			const model = THREE.SkeletonUtils.clone( glb.scene );
			miscModels.set( logicCube, model );
			setLambert( model, bonus );

			if( glb.animations.length > 0 ) {
				// play all clips
				const mixer = new THREE.AnimationMixer( model );
				miscMixers.set( logicCube, mixer );

				for( let clip of glb.animations ) {
					mixer.clipAction( clip ).play();
				}
			}

			if( !floor ) {
				// decide if the model should fall on the ground or hang in the air by its origin Y
				const box = new THREE.Box3();
				box.setFromObject( model );

				floor = ( ( 0 - box.min.y ) / ( box.max.y - box.min.y ) < 0.05 );
			}

			// former setAssetAt:
			model.position.copy( logicCube.position );
			if( floor ) {
				model.position.y = Math.floor( model.position.y );

				if( bubbleOffset !== undefined ) {
					// patch the cube position itself to get the
					// exclamation mark sign positioned properly
					logicCube.position.y = Math.floor( logicCube.position.y ) + bubbleOffset;
				}
			};

			// assuming updateGraph() was already called at this point
			model.userData.graph = currentGraph ;
			setGroupVisibility( model );
			scene.add( model );

			// tweak the model transformation
			model.position.y += offset;
			model.rotation.y = rotation;
			model.scale.setScalar( scale );

			// special processing of bonuses
			if( bonus ) {
				model.userData.initPos = model.position.clone();
				addParticles( model );

				// add the light source when in caves
				if( currentGraph != 'mountain' ) {
					const light = new THREE.PointLight( 0xffffff, 1, 1.5 );
					light.position.y = 0.5;
					model.add( light );
				}

				bonusCubes[ logicCube.tag ] = logicCube;
			}

		});

	};

	///////////////
	//// GENERAL
	///////////////

	// Create a new lambert material for the passed model, with the original map
	function setLambert( model, lightEmissive ) {

		model.traverse( (obj)=> {

			if(( obj.type == 'Mesh' ||
				 obj.type == 'SkinnedMesh' ) && ( obj.material !== particleMaterial )) {

				obj.material = new THREE.MeshLambertMaterial({
					map: obj.material.map,
					side: obj.material.side,
					skinning: obj.material.skinning,
					emissive: lightEmissive ? 0x191919 : 0x000000
				});

				// fix self-shadows on double-sided materials

				obj.material.onBeforeCompile = function(stuff) {
					var chunk = THREE.ShaderChunk.shadowmap_pars_fragment
						.split ('z += shadowBias')
						.join ('z += shadowBias - 0.001');
					stuff.fragmentShader = stuff.fragmentShader
						.split ('#include <shadowmap_pars_fragment>')
						.join (chunk);
				};

				obj.castShadow = !lightEmissive ;
				obj.receiveShadow = !lightEmissive ;

			};

		});

	};

	// Called by gameState to hide/show assets depending on sceneGraph
	function updateGraph( destination ) {

		if ( destination ) {
			currentGraph = destination
		};

		miscModels.forEach( setGroupVisibility );

	};

	//

	function setGroupVisibility( assetGroup ) {

		assetGroup.visible = ( assetGroup.userData.graph == currentGraph );

	};

	//

	function deleteBonus( bonusName ) {

		if ( bonusCubes[ bonusName ] ) {

			deleteObject( bonusCubes[ bonusName ] );

			bonusWasDeleted[ bonusName ] = true;

		};

	};

	//

	function getObject( logicCube ) {

		return miscModels.get( logicCube );

	};

	//

	function deleteObject( logicCube ) {

		let model = miscModels.get( logicCube );

		scene.remove( model );

		miscModels.delete( logicCube );
		miscMixers.delete( logicCube );

		delete bonusCubes[ logicCube.tag ];

		return model !== undefined;
	};

	//

	function update( delta ) {

		for ( let mixer of charMixers ) {

			mixer.update( delta );

		};

		for ( let mixer of miscMixers.values() ) {

			mixer.update( delta );

		};

		for ( let group of miscModels.values() ) {

			updateBonus( group );

		};

	};

	//

	function updateBonus( group ) {

		if ( group.userData.initPos ) {

			group.rotation.y += 0.01 ;

			group.position.copy( group.userData.initPos );
			group.position.y += ( Math.sin( Date.now() / 700 ) * 0.08 );

			for ( let child of group.children ) {

				if ( child.userData.rotationSpeed ) {

					child.rotation.y += child.userData.rotationSpeed ;

				};

			};

		};

	};

	//

	return {
		createCharacter,
		releaseCharacter,
		toggleCharacterShadows,
		createNewObject,
		updateGraph,
		update,
		deleteBonus,
		getObject,
		deleteObject
	};

};

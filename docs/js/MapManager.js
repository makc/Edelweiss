
function MapManager() {

	const LAST_CHUNK_ID = 13 ;

	// LIGHTS

	const LIGHT_BASE_INTENS = 0.58;
	const LIGHT_CAVE_INTENS = 0.30;

	const LIGHT_BASE_SHADE = 0xaa9977;
	const LIGHT_CAVE_SHADE = 0xffffff;

	// FOG

	const FOG = new THREE.FogExp2( 0xd7cbb1, 0.06 );

	scene.fog = FOG;

	// CUBEMAP

    var path = 'assets/skybox/';
    var format = '.jpg';
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    var reflectionCube = new THREE.CubeTextureLoader().load( urls );
    reflectionCube.format = THREE.RGBFormat;

    var caveBackground = new THREE.Color( 0x251e16 );
    var caveBackgroundGrey = new THREE.Color( 0x171614 );

    scene.background = reflectionCube;

    //

	// Object that will contain a positive boolean on the index
	// corresponding to the ID of the loaded mountain map chunks,
	// and the name of the loaded caves (cave-A...)
	var record = {};

	// Can be "mountain", or "cave-A" (B,C,D,E,F,G)
	var params = {
		currentMap: "mountain"
	};

	/*
	Creation of groups that will contain the different maps.
	All these groups will be added to the scene, and
	hided/showed later on.
	*/

	var maps = {};
	addMapGroup( 'cave-A' );
	addMapGroup( 'cave-B' );
	addMapGroup( 'cave-C' );
	addMapGroup( 'cave-D' );
	addMapGroup( 'cave-E' );
	addMapGroup( 'cave-F' );
	addMapGroup( 'cave-G' );
	addMapGroup( 'dev-home' );
	addMapGroup( 'mountain' );
	maps.mountain.visible = true ;

	function addMapGroup( groupName ) {

		maps[ groupName ] = new THREE.Group();
		maps[ groupName ].name = 'map ' + groupName;
		maps[ groupName ].visible = false;
		scene.add( maps[ groupName ] );

	};

	var queue = Promise.resolve();

	var materials = {}, c32 = document.createElement( 'canvas' ); c32.height = 32;

	function requestChunk( url, mapName ) {

		return new Promise( function( resolve ) {

			if( record[ url ] ) {

				// already loaded this glb before

				resolve();

			} else {

				gltfLoader.load( url, function( glb ) {

					var meshes = {};

					glb.scene.traverse( function( child ) {

						if ( child.material ) {

							// most of Felix maps use the same 32px textures
							var key;
							if( child.material.map.image.width === 32 ) {
								c32.width = 32;
								c32.getContext( '2d' ).drawImage( child.material.map.image, 0, 0 );
								key = c32.toDataURL();
							}

							child.material = materials[key] || new THREE.MeshPhongMaterial({
								shininess: 0, specular: 0, dithering: true,
								map: child.material.map,
								side: THREE.FrontSide
							});

							if( key ) {
								materials[key] = child.material;
							}

							key = child.material.uuid;
							meshes[key] = meshes[key] || []; meshes[key].push( child );

						};

					});

					glb.scene.updateMatrixWorld( true );

					var group = new THREE.Group();
					
					for( var key in meshes ) {
						var geometries = [];
						for( var i = 0, n = meshes[key].length; i < n; i++ ) {
							geometries.push( meshes[key][i].geometry.applyMatrix( meshes[key][i].matrixWorld ) );
						}

						var mesh = new THREE.Mesh(
							THREE.BufferGeometryUtils.mergeBufferGeometries( geometries ),
							meshes[key][0].material
						);

						mesh.castShadow = true;
						mesh.receiveShadow = true;

						group.add( mesh );
					}

					if( group.children.length === 1 ) {
						group = group.children[0];
					}

					group.name = url.replace( /^.*\//, 'file ' );
					
					maps[ mapName ].add( group );

					record[ url ] = true;

					resolve();

				}, null, function() {

					console.error( 'Could not load ' + url );

					resolve();

				});

			};

		});

	};

	//

	function loadMap( mapName, resolve ) {

		if( mapName == 'mountain' ) {

			queue = queue.then( () => requestChunk( 'assets/map/boat.glb', mapName ) );

			for( let i = 0; i <= 3; i++ ) {
				queue = queue.then( () => requestChunk( 'assets/map/' + i + '.glb', mapName ) );
			}

			queue = queue.then( resolve );

			for( let i = 4; i <= LAST_CHUNK_ID; i++ ) {
				queue = queue.then( () => requestChunk( 'assets/map/' + i + '.glb', mapName ) );
			}

		} else {

			queue = queue.then( () => requestChunk( 'assets/map/' + mapName + '.glb', mapName ) );

			queue = queue.then( resolve );

		}

	};

	// Make current map disappear, and show a new map
	function switchMap( newMapName ) {

		if ( newMapName === "mountain" ) {

			scene.fog = FOG;
			scene.background = reflectionCube;
			ambientLight.intensity = LIGHT_BASE_INTENS;
			ambientLight.groundColor.setHex( LIGHT_BASE_SHADE );

		} else {

			scene.fog = undefined;
			scene.background = caveBackground;
			ambientLight.intensity = LIGHT_CAVE_INTENS;
			ambientLight.groundColor.setHex( LIGHT_CAVE_SHADE );

		};

		if ( newMapName === "cave-F" ) scene.background = caveBackgroundGrey;
		if ( newMapName === "dev-home" ) ambientLight.intensity = LIGHT_BASE_INTENS;

		return new Promise( (resolve, reject)=> {

			if ( !maps[ newMapName ] ) addMapGroup( newMapName );

			maps[ params.currentMap ].visible = false ;
			maps[ newMapName ].visible = true ;
			params.currentMap = newMapName ;

			// change lighting according to future map
			if ( newMapName == 'mountain' ) {

				cameraControl.showLight();

			} else {

				cameraControl.hideLight();

			};

			loadMap( newMapName, resolve );

		});

	};

	//

	return {
		switchMap,
		params
	};

};

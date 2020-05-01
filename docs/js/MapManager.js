
function MapManager() {

	const LAST_CHUNK_ID = 13 ;

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
		maps[ groupName ].visible = false;
		scene.add( maps[ groupName ] );

	};

	var queue = Promise.resolve();

	function requestChunk( url, mapName ) {

		return new Promise( function( resolve ) {

			if( record[ url ] ) {

				// already loaded this glb before

				resolve();

			} else {

				gltfLoader.load( url, function( glb ) {

					glb.scene.traverse( function( child ) {

						if ( child.material ) {

							child.material = new THREE.MeshLambertMaterial({
								map: child.material.map,
								side: THREE.FrontSide
							});

							child.castShadow = true ;
							child.receiveShadow = true ;

						};

					});
					
					maps[ mapName ].add( glb.scene );

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

		return new Promise( (resolve, reject)=> {

			if ( !maps[ newMapName ] ) addMapGroup( newMapName );

			maps[ params.currentMap ].visible = false ;
			maps[ newMapName ].visible = true ;
			params.currentMap = newMapName ;

			// change lighting according to future map
			if ( newMapName == 'mountain' ) {

				cameraControl.showLight();
				removeCaveLights();

			} else {

				cameraControl.hideLight();
				createCaveLights( newMapName );

			};

			loadMap( newMapName, resolve );

		});

	};

	//

	var caveLights = [];

	function createCaveLights( graphName ) {

		var graph = gameState.sceneGraphs[ graphName ].cubesGraph;

		for (let i = 0 ; i < graph.length ; i++ ) {

			if ( !graph[ i ] ) continue ;

			graph[ i ].forEach( ( cube )=> {

				if ( cube.tag && cube.tag.match( /cave-/ ) ) {

					var pos = cube.position ;

					var light = new THREE.PointLight( 0xffffff, 1, 10 );
					light.position.set( pos.x, pos.y, pos.z );
					scene.add( light );
					caveLights.push( light );

				};

			});

		};

	};

	//

	function removeCaveLights() {

		caveLights.forEach( ( light )=> {

			scene.remove( light );

		});

		caveLights = [];

	};

	//

	return {
		switchMap,
		params
	};

};

var userTiles = {
    updateTimeout : 0,
    tiles : new WeakMap(),
    mesh : new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshNormalMaterial()
    )
};


userTiles.init = function() {
    gltfLoader.load( 'assets/models/tiles.glb', function( glb ) {
        userTiles.template = glb.scene;

        userTiles.mesh.castShadow = true;
        userTiles.mesh.receiveShadow = true;

        userTiles.mesh.material = new THREE.MeshLambertMaterial( {
            map: glb.scene.getObjectByName( 'wall' ).material.map
        } );

        userTiles.mesh.material.onBeforeCompile = function( hack ) {
            hack.fragmentShader = hack.fragmentShader.replace(
                '<dithering_fragment>\n',
                '<dithering_fragment>\nif( mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) > 0.0 ) discard;'
            );
        };
    } );

    scene.add( userTiles.mesh );
};


userTiles.addTiles = function( array ) {
    if( array ) {
        array.forEach( function( tile ) {
            userTiles.tiles.set( tile, tile.type + (
                tile.isWall ? ( tile.isXAligned ? tile.points[ 0 ].z : tile.points[ 0 ].x ) : tile.points[ 0 ].y 
            ) );
        } );
    }

    clearTimeout( userTiles.updateTimeout );
    userTiles.updateTimeout = setTimeout( userTiles.update, 2345 );
};


userTiles.update = function() {
    userTiles.mesh.geometry.dispose();
    userTiles.mesh.geometry = new THREE.BufferGeometry();

    const ps = [], uvs = [];
    const add = function( tile, ia, pa, uva ) {

        const mpx = 0.5 * ( tile.points[ 0 ].x + tile.points[ 1 ].x );
        const mpy = 0.5 * ( tile.points[ 0 ].y + tile.points[ 1 ].y );
        const mpz = 0.5 * ( tile.points[ 0 ].z + tile.points[ 1 ].z );

        // side 1
        for( let k = 0, n = ia.length; k < n; k++ ) {
            let i = ia[ k ] * 3;
            let j = ia[ k ] * 2;

            uvs.push( uva[ j ], uva[ j + 1 ] );

            if( tile.isWall ) {
                if( tile.isXAligned ) {
                    ps.push( mpx + pa[ i ], mpy + pa[ i + 1 ], mpz + pa[ i + 2 ] );
                } else {
                    // rotate 90 degrees around Y
                    ps.push( mpx - pa[ i + 2 ], mpy + pa[ i + 1 ], mpz + pa[ i ] );
                }
            } else {
                ps.push( mpx + pa[ i ], mpy + pa[ i + 1 ], mpz + pa[ i + 2 ] );
            }
        }

        // side 2
        for( let k = 0, n = ia.length; k < n; k++ ) {
            let i = ia[ k ] * 3;
            let j = ia[ k ] * 2;

            uvs.push( uva[ j ], uva[ j + 1 ] );

            if( tile.isWall ) {
                if( tile.isXAligned ) {
                    // rotate 180 degrees around Y
                    ps.push( mpx - pa[ i ], mpy + pa[ i + 1 ], mpz - pa[ i + 2 ] );
                } else {
                    // rotate -90 degrees around Y
                    ps.push( mpx + pa[ i + 2 ], mpy + pa[ i + 1 ], mpz - pa[ i ] );
                }
            } else {
                // rotate 180 degrees around X
                ps.push( mpx + pa[ i ], mpy - pa[ i + 1 ], mpz - pa[ i + 2 ] );
            }
        }
    };

    const sceneGraph = atlas.getSceneGraph();
    sceneGraph.tilesGraph.forEach( function( stage ) {
        if( stage ) stage.forEach( function( tile ) {
            const origial = userTiles.tiles.get( tile );
            if( !origial || ( origial !== tile.type + (
                tile.isWall ? ( tile.isXAligned ? tile.points[ 0 ].z : tile.points[ 0 ].x ) : tile.points[ 0 ].y 
            ) ) ) {

                // this looks like new or modified tile - add it to the mesh

                const base = userTiles.template.getObjectByName( tile.isWall ? 'wall' : 'ground' );
                add( tile,
                    base.geometry.index.array,
                    base.geometry.attributes.position.array,
                    base.geometry.attributes.uv.array
                );

                let decoration;
                switch( tile.type ) {
                    case 'wall-easy':
                        decoration = userTiles.template.getObjectByName( 'leafs' ); break;
                    case 'wall-medium':
                        decoration = userTiles.template.getObjectByName( 'rocks' ); break;
                    case 'wall-hard':
                        decoration = userTiles.template.getObjectByName( 'ice' ); break;
                    case 'wall-fall':
                        decoration = userTiles.template.getObjectByName( 'spikes' ); break;
                }

                if( decoration ) {
                    add( tile,
                        decoration.geometry.index.array,
                        decoration.geometry.attributes.position.array,
                        decoration.geometry.attributes.uv.array
                    );
                }
            }
        } );
    } );

    userTiles.mesh.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( ps, 3 ) );
    userTiles.mesh.geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );
    userTiles.mesh.geometry.computeVertexNormals();
};
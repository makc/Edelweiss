
function Utils() {

    // This function takes any number,
    // and returns a angle value in the range -PI to PI.
    function toPiRange( rad ) {

        rad = rad % (Math.PI * 2) ;

        if ( rad > Math.PI || rad < -Math.PI ) {

            return ( ( - Math.PI ) - ( Math.PI - Math.abs(rad) ) ) * Math.sign( rad ) ;
        
        } else {

            return rad ;

        };

    };

    // This is a linear interpolation able to interpolate two Euler angles,
    // which values loop from -PI to PI.
    function lerpAngles( vStart, vEnd, t ) {

        // Check if there is a problem of lerp going above PI or bellow -PI
        if ( Math.abs( vStart - vEnd ) > Math.PI / 2 ) {
            
            // The smallest value is added 2 * PI to do the lerp,
            // then reduced to PI range.
            if ( vStart < vEnd ) {

                return toPiRange( lerp( vStart + (Math.PI * 2), vEnd, t ) );

            } else {

                return toPiRange( lerp( vStart, vEnd + (Math.PI * 2), t ) );

            };
        
        };

        return lerp( vStart, vEnd, t );

    };

    // Linear interpolation function
    // It return the value between vStart and vEnd pointed by
    // the floating point t.
    // t = 0 ==> return vStart
    // t = 1 ==> return vEnd
    function lerp( vStart, vEnd, t ) {

        return ( ( vEnd - vStart ) * t ) + vStart ;

    };

    // Returns the value between 0 and 1 representing
    // the interpolant point between vStart and vEnd on v.
    function interp( vStart, v, vEnd ) {
        return ( v - vStart ) / ( vEnd - vStart );
    };

    // Get the minimal difference (delta) between two radians
    // ex : -2.5 <--> 2.5 ? => 1.28
    function minDiffRadians( rad1, rad2 ) {
        return Math.atan2( Math.sin( rad1 - rad2), Math.cos( rad1 - rad2) );
    };

    // returns squared distance between two vectors
    function distanceVecsSquared( vec1, vec2 ) {

        const dx = vec1.x - vec2.x;
        const dy = vec1.y - vec2.y;
        const dz = vec1.z - vec2.z;

        return dx * dx + dy * dy + dz * dz;

    };

    function vecEquals( vec1, vec2 ) {

        return (

            vec1.x == vec2.x &&
            vec1.y == vec2.y &&
            vec1.z == vec2.z

        ) || (

            distanceVecsSquared( vec1, vec2 ) < 1e-7

        );

    };

    /* MAKC */

    // This function returns placeholder display name from https://www.youtube.com/watch?v=gzBZFArR4mc list.

    const names = [
        'DragonKiller75', 'DragonDeesNuts', 'Sug_Madic',
        'Phil_Mcrackin', 'Ice_Wallow_Come', 'Come_Stayin', 'Pen15'
    ];

    var nameIndex = Math.floor( names.length * Math.random() );

    function randomDisplayName() {

        return names[ nameIndex++ % names.length ];

    };

    // This function returns short random string.

    const bytes = new Uint8Array( 15 );

    function randomString() {

        crypto.getRandomValues( bytes );

        return Array.prototype.map.call( bytes, function (x) {

            return x.toString( 36 )

        } ).join( '' ).substr( 0, 15 );

    };

    // This function returns certain numeric hash of the string (we want the
    // result % 4 to be evenly distributed when passed randomString output).

    function stringHash( s ) {

        return s.charCodeAt( 0 ) + s.charCodeAt( 1 );

    };


    // Orbiting particles shared by the dash charge and the bonuses.

    var particleGeometry = new THREE.SphereBufferGeometry( 0.03, 4, 3 );

    function makeParticles( parent, options ) {

        var container = options.container;

        if(!container ) {

            container = new THREE.Group();
            container.visible = !!options.visible;
            parent.add( container );

        };

        var particles = [];

        for ( var i = 0, n = options.count ?? 20; i < n; i++ ) {

            var mesh = new THREE.Mesh( particleGeometry, options.material );
            var pivot = new THREE.Group();
            var rotationSpeed = ( Math.random() * 0.1 ) + 0.02;
            pivot.rotation.y = Math.random() * ( Math.PI * 2 );
            pivot.scale.setScalar( 1 / parent.scale.x );
            container.add( pivot );
            pivot.add( mesh );

            particles.push( {
                mesh, pivot, rotationSpeed
            } );

            options.init?.( mesh );

        };

        function update() {

            if ( container.visible ) {

                for ( var i = 0; i < particles.length; i++ ) {

                    particles[ i ].pivot.rotation.y += particles[ i ].rotationSpeed;

                    options.update?.( particles[ i ].mesh );

                };

            };

        };

        return {
            group: container,
            update: update
        };

    };

    function makeFire( group ) {
        const color = '#f90'
        const light = new THREE.PointLight( color, 1, 1 );
        light.position.y = 0.3;
        group.add( light );

        const prop = group.getObjectByName( 'Prop' );
        prop.material.vertexColors = true;
        prop.castShadow = false;


        const particleMaterial = new THREE.MeshBasicMaterial({
            color, blending: THREE.AdditiveBlending, transparent: true
        });

		const place = function ( particle, p ) {
			particle.position.y = p;
			particle.position.x = particle.userData.q * 0.2 - 0.1 + 0.05 * Math.sin( 7 * p + particle.userData.r );
			particle.position.z = particle.userData.r * 0.2 - 0.1;
			particle.scale.setScalar(
                Math.min( 0.2, 0.5 * ( 1 - p ) )
            );
		};

        const particles = makeParticles( group, {
			container: group, count: 7,
			material: particleMaterial,
			init: function ( particle ) {
				particle.userData.q = Math.random();
				particle.userData.r = Math.random();
				place( particle, Math.random() );
			},
			update: function ( particle ) {
                particle.parent.rotation.y = 0;

				particle.position.y += 0.003;
				if( particle.position.y > 1 ) {
				    particle.position.y = 0;
				};

				place( particle, particle.position.y );
			}
		});

        const centers = [
            [ 0, 0, 0 ], [ 0.2, 0, 0 ], [ -0.2, 0, 0 ]
        ];

        const fire = group.getObjectByName( 'Fire' );
        fire.geometry.scale( 1, 1, 0.5 );
        fire.castShadow = false;
		fire.receiveShadow = false;
        fire.material = new THREE.ShaderMaterial( {
            uniforms: {
                uCenter0: { get value() {
                    particles.update();

                    // get the times
                    const now = Date.now();
                    light.intensity = 0.5 * ( 1 + ( now % 100 ) / 100 );

                    for ( let i = 0; i < 3; i++ ) {
                        const t = ( (now - 100 * i ) % 300 ) / 300;
                        centers[ i ][ 1 ] = 0.8 * t - 0.2;
                    }

                    return centers[ 0 ]
                } },
                uRadius0: { value: 0.13 },

                uCenter1: { value: centers[ 1 ] },
                uRadius1: { value: 0.23 },

                uCenter2: { value: centers[ 2 ] },
                uRadius2: { value: 0.23  }
            },
            vertexShader: `
                uniform vec3 uCenter0;
                uniform float uRadius0;
                uniform vec3 uCenter1;
                uniform float uRadius1;
                uniform vec3 uCenter2;
                uniform float uRadius2;

                varying vec3 vNormal;

                vec3 push( vec3 pos, vec3 center, float radius ) {
                    vec3 d = pos - center;
                    float l = length( d );

                    vec3 dir = l > 1e-6 ? d / l : vec3( 0.0, 1.0, 0.0 );

                    float len = max( l, radius ) + 0.1 * radius * (
                        1.0 - smoothstep( radius, 1.2 * radius, l )
                    );

                    return center + dir * len;
                }

                void main() {
                    vec3 pos = position;

                    pos = push( pos, uCenter0, uRadius0 );
                    pos = push( pos, uCenter1, uRadius1 );
                    pos = push( pos, uCenter2, uRadius2 );

                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( pos, 1.0 );
                    vNormal = normalize( normalMatrix * normal );
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;

                void main() {
                    gl_FragColor = vec4(
                        mix(
                            vec3( 0.3, 0.2, 0.0 ),
                            vec3( 0.6, 0.5, 0.0 ),
                            max( 0.0, ( vNormal.z - 0.7 ) / 0.3 )
                        ),
                        1.0
                    );
                }
            `,
            blending: THREE.AdditiveBlending, transparent: true
        });

    };




    return {
        makeFire,
        makeParticles,
        randomDisplayName,
        randomString,
        stringHash,
        toPiRange,
        lerpAngles,
        minDiffRadians,
        distanceVecsSquared,
        interp,
        lerp,
        vecEquals
    };

};
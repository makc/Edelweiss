
function SocketIO() {

	// original Edelweiss uses its own socket.io server, so adding multiplayer support
	// there would be trivial, but only Felix Mariotto can do it. so instead this fork
	// will use free-as-in-beer google service (firebase) but only in multiplayer mode

	var database, playerInfo, playerInfoHandler, playerLeftHandler, serverTime = 0;

	function joinGame( id, pass, name ) {

		database = firebase.initializeApp( {

			apiKey: 'AIzaSyCxmohXOeTvJv39WBFjyRyPbFpz-R1zOF8',
			databaseURL: 'https://edelweiss-game.firebaseio.com'

		} ).database();

		const query = database.ref( '/updates-2024' ).orderByChild( 'pass' ).equalTo( pass );

		const handler = function( snapshot ) {

			const data = snapshot.val(); serverTime = data.time;

			if( playerInfoHandler && ( snapshot.key !== id ) ) {

				data.id = snapshot.key;

				// comment the id check above to debug with 'ghost' player
				if( data.id === id ) {
					data.id = '0123456789ghost'; data.x --;
				}

				playerInfoHandler( data );

			}

		};

		query.on( 'child_added', handler );
		query.on( 'child_changed', handler );

		query.on( 'child_removed', function( snapshot ) {

			if( playerLeftHandler && ( snapshot.key !== id ) ) {

				playerLeftHandler( snapshot.key );

			}

		} );

		// hunt zombie players down

		setInterval( function() {

			const numberOfPlayers = 1 + Object.keys( characterAnimations ).length;

			// every player runs the same loop, but we need only one of them to run this query
			// if noone does it - that's fine, too - this will just run again in 10 seconds

			if( Math.random() < 1.0 / numberOfPlayers ) {

				const ref = database.ref( '/updates-2024' );

				ref.orderByChild( 'time' ).endAt( serverTime - 5555 ).once( 'value' ).then( function( snapshot ) {

					const data = snapshot.val();

					if ( data ) {

						for( let id in data ) data[ id ] = null;

						ref.update( data ).catch( function() {

							// whatever

						} );

					}

				} );

			}

		}, 9999 );


		// the lines below is what this function could look like with socket.io server

		playerInfo = {

			id, pass, name

		};

		setInterval( function() {

			charaAnim.getPlayerState( playerInfo );

			socket.emit( 'playerInfo', playerInfo );

		}, 300 );

	};

	var last_idle = 0

	var socket = {

		emit: function( event, data ) {

			// normally socket.io provides this method, but
			// with firebase we need to re-implement it...

			if( event === 'playerInfo' ) {

				// the only event that we care about for now

				if( (data.a !== 'idleGround') || (Date.now() - last_idle > 2024) )

				database.ref( '/updates-2024/' + data.id ).set( {

					x: data.x, y: data.y, z: data.z, r: data.r,
					a: data.a, f: data.f, m: data.m, s: data.s,
					name: data.name,
					pass: data.pass,

					time: {
						'.sv': 'timestamp'
					}

				} ).catch( function() {

					// whatever

				} );

				last_idle = data.a === 'idleGround' ? Date.now() : 0;

			}

		},

		on: function ( event, callback ) {

			if( event === 'playerInfo' ) {

				// assume single handler for now

				playerInfoHandler = callback;

			}

			if( event === 'playerLeft' ) {

				playerLeftHandler = callback;

			}

		}

	};

	function onPlayerUpdates( handler ) {
		socket.on( 'playerInfo', handler );
	};

	function onPlayerDisconnects( handler ) {
		socket.on( 'playerLeft', handler );
	};

	return {
		joinGame,
		onPlayerUpdates,
		onPlayerDisconnects
	};

};





function SocketIO() {

	var time = new Date();
	time = time.toTimeString();

	var uaResult = uaParser.getResult();


	// original Edelweiss uses its own socket.io server, so adding multiplayer support
	// there would be trivial, but only Felix Mariotto can do it. so instead this fork
	// will use free-as-in-beer google service (firebase) but only in multiplayer mode

	var database, playerInfo;

	function joinGame( id, pass, name ) {

		database = firebase.initializeApp( {

			apiKey: 'AIzaSyCv-Wd_A9sdyLfNeA5kpkq4_3-MKpza-0k',
			databaseURL: 'https://edelweiss-game.firebaseio.com'

		} ).database();

		playerInfo = {

			id, pass, name

		};

		setInterval( function() {

			charaAnim.getPlayerState( playerInfo );

			socket.emit( 'playerInfo', playerInfo );

		}, 1100 );

	}


	var socket = {

		emit: function( event, data ) {

			// normally socket.io provides this method, but
			// with firebase we need to re-implement it...

			if( event === 'playerInfo' ) {

				// the only event that we care about for now

				database.ref( '/updates/' + data.id ).set( {

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

			}

		}

	};

	//socket.on('connect', ()=> {

		socket.emit( 'init', {
			browser: uaResult.browser.name,
			browser_version: uaResult.browser.version,
			time
		});

	//});


	function sendDeath() {

		var data = JSON.stringify({
			t: Date.now(),
			p: {
				x: atlas.player.position.x.toFixed(1),
				y: atlas.player.position.y.toFixed(1),
				z: atlas.player.position.z.toFixed(1)
			}
		});

		socket.emit( 'death', data );

	};


	function sendOptiLevel() {

		var data = JSON.stringify({
			t: Date.now(),
			l: optimizer.params.level
		});

		socket.emit( 'opti', data );

	};


	function sendBonus( bonusName ) {

		var data = JSON.stringify({
			t: Date.now(),
			b: bonusName
		});

		socket.emit( 'bonus', data );

	};

	function sendDialogue( dialogueName ) {

		var data = JSON.stringify({
			t: Date.now(),
			d: dialogueName
		});

		socket.emit( 'dialogue', data );

	};

	function sendSave( id ) {

		var data = JSON.stringify({
			t: Date.now(),
			id: id
		});

		socket.emit( 'save', data );

	};


	function sendIsTouchScreen() {
		socket.emit( 'touchscreen' );
	};


	return {
		joinGame,
		sendDeath,
		sendOptiLevel,
		sendBonus,
		sendDialogue,
		sendSave,
		sendIsTouchScreen
	};

};
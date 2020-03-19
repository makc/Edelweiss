
const express = require('express');
const path = require('path');
const socketIO = require('socket.io');
const PORT = process.env.PORT || 5050;
var geoip = require('geoip-lite');

const { Pool } = require('pg');
const POOL = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});





/////////////////
///  APP
/////////////////


const app = express()

	.use(express.static('public'))

    .get('/', (req, res)=> {
        res.sendFile(path.join(__dirname + '/public/index.html'));
    })



    .get('/db', async (req, res) => {
	    try {
	      const client = await POOL.connect()
	      const result = await client.query('SELECT * FROM analytics');
	      const results = { 'results': (result) ? result.rows : null};
	      res.send( results );
	      client.release();
	    } catch (err) {
	      console.error(err);
	      res.send("Error " + err);
	    }
	  })



    .listen(PORT, ()=> {
        console.log('App listening on port ' + PORT);
    })








//////////////////
///  SOCKET.IO
//////////////////

const io = socketIO( app );

io.on( 'connection', async (client)=> {

	var lang = client.handshake.headers['accept-language'].split(",")[0];

	var ip = client.handshake.headers["x-forwarded-for"].split(",")[0] ;

	var geo = geoip.lookup( ip );

	console.log( `User ${ client.id } connected` );

	var clientID;

	var startTime = Date.now();

	var postgresClient = await POOL.connect();

	postgresClient.query( `INSERT INTO analytics (
							environment,
							game_version,
							timestamp,
							ip,
							country,
							language
						   ) VALUES (
						    '${ process.env.ENVIRONMENT }',
						    '${ process.env.VERSION || 'undefined' }',
						    NOW(),
						    '${ ip }',
						    '${ geo.country }',
						    '${ lang }'
						   ) RETURNING id` ).then( (value)=> {

							clientID = value.rows[ 0 ].id ; // clientID is a number

						   });

	postgresClient.release();

	//

	client.on( 'init', async (message)=> {

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics SET
								browser = '${ message.browser }',
								browser_version = '${ message.browser_version }',
								local_time = '${ message.time }'
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

	//

	client.on( 'bonus', async (message)=> {

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics
							   SET bonuses = array_append( bonuses, '${ message }' )
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

	//

	client.on( 'dialogue', async (message)=> {

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics
							   SET dialogues = array_append( dialogues, '${ message }' )
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

	//

	client.on( 'save', async (message)=> {

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics
							   SET saves = array_append( saves, '${ message }' )
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

	//

	client.on( 'death', async (message)=> {

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics
							   SET deaths = array_append( deaths, '${ message }' )
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

	//

	client.on( 'touchscreen', async ()=> {

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics
							   SET touchscreen = true
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

	//

	client.on( 'opti', async (message)=> {

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics
							   SET opti_levels = array_append( opti_levels, '${ message }' )
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

	//

	client.on('playerInfo', (message)=> {

		console.log( message );

	});

	//

	client.on( 'disconnect', async ()=> {

		// console.log( `User ${ client.id } disconnected` );

		var postgresClient = await POOL.connect();

		postgresClient.query( `UPDATE analytics SET
								duration = '${ Date.now() - startTime }'
							   WHERE id = ${ clientID }` );

		postgresClient.release();

	});

})


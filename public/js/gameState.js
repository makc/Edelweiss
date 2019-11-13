




function GameState() {


	const domBlackScreen = document.getElementById('black-screen');

	var params = {
		isCrashing: false
	};

	var respownPos = new THREE.Vector3( 0, 1, -4.5 );



	// This function is called when the player fell from too high.
	// Show a black screen, wait one second, respown, remove black screen.
	function die( hasCrashed ) {

		if ( hasCrashed ) params.isCrashing = true ;

		domBlackScreen.classList.remove( 'hide-black-screen' );
		domBlackScreen.classList.add( 'show-black-screen' );

		setTimeout( ()=> {

			params.isCrashing = false ;

			charaAnim.respawn();

			atlas.player.position.copy( respownPos );

			domBlackScreen.classList.remove( 'show-black-screen' );
			domBlackScreen.classList.add( 'hide-black-screen' );

		}, 1000);

	};
	



	return {
		die,
		params
	};

};
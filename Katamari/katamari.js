var camera, scene, renderer;
var geometry, material, mesh;
var controls;

var objects = [];

var raycaster;


var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var player;
var exterior;
var raycastReference;
var curCamZoom = 70;
var distance = 10;
var objsAdded = 0;
var maxObjectsOnBall = 400;

var localXaxis = new THREE.Vector3(1, 0, 0);
var localZaxis = new THREE.Vector3(0, 0, 1);

var prevTime = performance.now();
var velocity = new THREE.Vector3();

var element = document.body;


var fullscreenchange = function ( event ) {
    if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {
        document.removeEventListener( 'fullscreenchange', fullscreenchange );
        document.removeEventListener( 'mozfullscreenchange', fullscreenchange );    
    }
};

document.addEventListener( 'fullscreenchange', fullscreenchange, false );
document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );
element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
element.requestFullscreen();


function init() {

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

    // Add player object
    //added sample texture to try to work on simulating the ball actually rolling
    var normap = new THREE.TextureLoader().load("BlackMarble.png");

    player = new THREE.Object3D();
	
	var extG = new THREE.SphereGeometry(10, 32, 32);
	var extMat = new THREE.MeshPhongMaterial({color :0x0066ff, shininess : 100, normalMap: normap });
	var exterior = new THREE.Mesh(extG, extMat);
	player.add(exterior);
	//This is the object that follows the ball and keeps its z/y rotation
	//It casts rays outwards to detect objects for the player
	raycastReference = new THREE.Object3D();
	raycastReference.position.y = 2;
	scene.add(raycastReference);
	
	//Attach the camera to lock behind the ball
	raycastReference.add(camera);
	//Current zoom of the camera behind the ball
	camera.position.z = curCamZoom;
	camera.position.y += 40;
	camera.rotation.x -= 0.2;
	
    player.velocity = new THREE.Vector3();
	
	player.position.y = 10;
	setupCollisions(raycastReference);
	
    scene.add(player);
	
    
    var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
    light.position.set( 0.5, 1, 0.75 );
    scene.add( light );


	//************************ KEY COMMANDS ***********************************
	//*************************************************************************
	
    var onKeyDown = function ( event ) {

        switch ( event.keyCode ) {
			
            case 38: // up
            case 87: // w
                //if currently moving backwards, sets velocity to 0 so that you immediately switch directions
                moveForward = true;

                // player.material.rotateZ(10);
                break;

            case 37: // left
            case 65: // a
                moveLeft = true; 
                // player.rotation.y += .05;
				break;

            case 40: // down
            case 83: // s
                moveBackward = true;
                //if currently moving forward, sets velocity to 0 so that you immediately switch directions
                
                break;

            case 39: // right
            case 68: // d
                moveRight = true;
                // player.rotation.y -= .05;
                break;

          

        }
    };

	//Setting the player.xSpeed resets player movement
    var onKeyUp = function ( event ) {

        switch( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = false;
                break;

            case 37: // left
            case 65: // a
                moveLeft = false;
                break;

            case 40: // down
            case 83: // s
                moveBackward = false;
                break;

            case 39: // right
            case 68: // d
                moveRight = false;
                break;

        }

    };
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

	    
	//Create the floor
    geometry = new THREE.PlaneGeometry( 2000, 2000, 100, 100 );
    geometry.rotateX( - Math.PI / 2 );

    for ( var i = 0, l = geometry.vertices.length; i < l; i ++ ) {

        var vertex = geometry.vertices[ i ];
        vertex.x += Math.random() * 20 - 10;
        vertex.y += Math.random() * 2;
        vertex.z += Math.random() * 20 - 10;

    }

    for ( var i = 0, l = geometry.faces.length; i < l; i ++ ) {

        var face = geometry.faces[ i ];
        face.vertexColors[ 0 ] = new THREE.Color().setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
        face.vertexColors[ 1 ] = new THREE.Color().setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
        face.vertexColors[ 2 ] = new THREE.Color().setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );

    }

    material = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } );

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

	//************************ OBJECTS ****************************************
	//*************************************************************************
	
    geometry = new THREE.BoxGeometry( 20, 20, 20 );

    for ( var i = 0, l = geometry.faces.length; i < l; i ++ ) {

        var face = geometry.faces[ i ];
        face.vertexColors[ 0 ] = new THREE.Color().setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
        face.vertexColors[ 1 ] = new THREE.Color().setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
        face.vertexColors[ 2 ] = new THREE.Color().setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );

    }

    for ( var i = 0; i < 1000; i ++ ) {

        material = new THREE.MeshPhongMaterial( { specular: 0xffffff, shading: THREE.FlatShading, vertexColors: THREE.VertexColors } );

        var mesh = new THREE.Mesh( geometry, material );
        mesh.position.x = Math.floor( Math.random() * 50 - 10 ) * 20;
        mesh.position.y = 10;
        mesh.position.z = Math.floor( Math.random() * 50 - 10 ) * 20;
        scene.add( mesh );

        material.color.setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );

        objects.push( mesh );

    }

    
	//Setup the renderer and attach it to the page
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xffffff );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    //Setup window resize

    window.addEventListener( 'resize', onWindowResize, false );

}

//Thanks to: http://webmaestro.fr/collisions-detection-three-js-raycasting/
function setupCollisions(item) {
	item.mesh = item;
	item.rays = [
		new THREE.Vector3(0, 0, 1),
		new THREE.Vector3(1, 0, 1),
		new THREE.Vector3(-1, 0, 1),
		new THREE.Vector3(1, 0, 0),
		new THREE.Vector3(-1, 0, 0),
		new THREE.Vector3(1, 0, -1),
		new THREE.Vector3(0, 0, -1),
		new THREE.Vector3(-1, 0, -1),
		new THREE.Vector3(0, -1, 0),
		new THREE.Vector3(-1, -1, 0),
		new THREE.Vector3(1, -1, 0),
		new THREE.Vector3(0, -1, 1),
		new THREE.Vector3(0, -1, -1),
		new THREE.Vector3(1, -1, 1),
		new THREE.Vector3(-1, -1, 1),
		new THREE.Vector3(1, -1, -1),
		new THREE.Vector3(-1, -1, -1)
		
	];
	
	item.caster = new THREE.Raycaster();
	
	item.collision = function () {
		var collisions, i;
		for (i = 0; i < this.rays.length; i++) {
			this.caster.set(this.position, this.rays[i]);
			collisions = this.caster.intersectObjects(objects);
			
			if (collisions.length > 0 && collisions[0].distance <= distance) {
				
				//updates matrix of ball
				exterior.updateMatrix();
				
				//removes the object from the list of objects in scene not on ball
				removeFromObjects(collisions[0].object);
					
				//Creates two vectors and calculates a single one
				//The position vector of the collided object in world space
				var obV = new THREE.Vector3();
				obV.setFromMatrixPosition(collisions[0].object.matrixWorld);
				//The position vector from the player in world space
				var plV = new THREE.Vector3();
				plV.setFromMatrixPosition(exterior.matrixWorld);
				
				//Changes both to the ball's local coords
				exterior.worldToLocal(plV);
				exterior.worldToLocal(obV);

				//subtracts the player vector from object, 
				//giving a vector from the player to the object
				obV.sub(plV);
				
				//Attempts to set the rotation of the collided object to the ball
				var obRot = new THREE.Matrix4();
				obRot.makeRotationFromQuaternion(exterior.quaternion);
				collisions[0].object.quaternion.setFromRotationMatrix(obRot);

				//Adds object to the ball
                exterior.add(collisions[0].object);
				//Sets object position to where the object was relative to ball
				collisions[0].object.position.copy(obV);
				//increment amount of objs added
				objsAdded += 1;
				
				//Limits max objects on ball to maxObjectsOnBall
				if (objsAdded > maxObjectsOnBall) {
					exterior.remove(exterior.children[1]);
				}
				//Asymptotic attempt of increase of collision detect distance
				var log = (Math.log(objsAdded+1)*4);
				distance += 1/log;
				
				//changes the cam zoom
				curCamZoom += 0.12;
				camera.position.z = curCamZoom;
				
				//Changes the cam height
				camera.position.y += 0.08;
				//Makes cam look downwards as it lifts up
				camera.rotation.x -= 0.0001;
				//pushes back ball as objects added
				player.position.z += 0.01*log;
				
				console.log(camera.position.y);
			}
		}
	};
	
	
	
};

//Removes the desired object from the list of objects in scene not on ball
function removeFromObjects(obj) {
	for (var i = 0; i < objects.length; i++) {
		
		if (objects[i] === obj) {
			objects.splice(i, 1);
		}
	}
}

//Window resize
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
	//Was having issues returning exterior as undefined, this is a bad fix.
	exterior = player.children[0];

    requestAnimationFrame( animate );
	
	//Detect collisions
	raycastReference.collision();
	
	//Basing velocity on time
	var time = performance.now();
	var delta = ( time - prevTime ) / 1000;
	
	//Player velocity decay
	player.velocity.z -= player.velocity.z * delta;
	player.velocity.x -= player.velocity.x * delta;
		
	//this is what updates the velocity
	if (moveForward) {
			if(player.velocity.z > 0 && moveBackward){
				player.velocity.z = 0;
			}
			player.velocity.z -= 10;
	}
	if (moveBackward) {
		if(player.velocity.z < 0 && moveForward){
				player.velocity.z = 0;
			}
			player.velocity.z += 10;
	}
	if ( moveLeft ) {
		if(player.velocity.x < 0 && moveRight){
			player.velocity.x = 0;
		}
		player.velocity.x += 3;
		
		player.rotation.y += .03;
		//rotates the raycast reference object, and also the attached camera
		raycastReference.rotation.y += .03;
	}
	if ( moveRight ) {
		if(player.velocity.x > 0 && moveLeft){
			player.velocity.x = 0;
		}
		player.velocity.x -= 3;
		
		player.rotation.y -= .03;
		//rotates the raycast reference object, and also the attached camera
		raycastReference.rotation.y -= .03;
	}
	
	//Rotates the ball around an arbitrary axis, as expected by movement
	rotateAroundWorldAxis(exterior, localXaxis, (player.velocity.z)/(Math.PI * 2 * 500));
	rotateAroundWorldAxis(exterior, localZaxis, (player.velocity.x)/(Math.PI * 2 * 500));
	
	//Moves the player
	player.translateX(-player.velocity.x * delta);
	player.translateZ(player.velocity.z * delta);
	
	//Updates the raycast reference so that it follows the position of the player
	raycastReference.position.set(player.position.x, 0, player.position.z);
	
	prevTime = time;

    renderer.render( scene, camera );

}

var rotObjectMatrix;
function rotateAroundObjectAxis(object, axis, radians) {
    rotObjectMatrix = new THREE.Matrix4();
    rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);


    object.matrix.multiply(rotObjectMatrix);

    object.rotation.setFromRotationMatrix(object.matrix);
}

var rotWorldMatrix;
// Rotate an object around an arbitrary axis in world space       
function rotateAroundWorldAxis(object, axis, radians) {
    rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);


    rotWorldMatrix.multiply(object.matrix);                // pre-multiply

    object.matrix = rotWorldMatrix;

    object.rotation.setFromRotationMatrix(object.matrix);
}


init();
animate();
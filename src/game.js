(function ( window, document, CubicVR, Paladin ) {

function Game() {

    var paladin = new Paladin( {debug: true} );
    var universe = new paladin.physics.Universe();

    var scene = new paladin.Scene();
    paladin.graphics.pushScene( scene );

    var events = {};
    
    var shipBody;

    var inputMap = new paladin.InputMap( paladin.messenger );
    var rollLeftEvent = "RollLeftEvent",
        rollRightEvent = "RollRightEvent";

    var shipEntity = this.entity = new paladin.Entity({
      parent: scene,
      children: [
        new paladin.Entity({
          parent: shipEntity,
          components: [
            new paladin.component.Camera({
              targeted: false,
              position: [0, 10, -40],
              rotation: [0, 180, 0]
            }), //camera
            new paladin.component.Model( {
              mesh: new paladin.graphics.Mesh( { 
                loadFrom: "ship-main.xml",
                finalize: true
              }),
              rotation: [0, 180, 0]
            }) // XXX mesh.clean()
          ], //components
          init: function ( entity ) {
            var cameraComponent = entity.getComponents('graphics', 'camera');
            scene.setActiveCamera( cameraComponent );

            var shipModel = entity.getComponents('graphics', 'model');

            var cameraRoll = 0;
            paladin.tasker.add( {
              callback: function ( task ) {
                if ( events[rollLeftEvent] ) {
                  shipEntity.spatial.rotation[1] += 1 * task.dt/20;
                  cameraRoll = Math.min(10, cameraRoll+1);
                }
                else if ( events[rollRightEvent] ) {
                  shipEntity.spatial.rotation[1] -= 1 * task.dt/20;
                  cameraRoll = Math.max(-10, cameraRoll-1);
                }
                else {
                  cameraRoll -= cameraRoll*.1 * task.dt/20;
                }
                entity.spatial.rotation[2] = -cameraRoll;
                shipModel.object.rotation[2] = -cameraRoll*5;
                

              }
            } );

            shipBody = new paladin.physics.Body({
              aabb: shipModel.object.getAABB()
            });

            universe.addBody( shipBody );

          }
        }),
      ],
      
      init: function ( entity ) {
        var accel = 0.01;
        var shipFlyingTask = paladin.tasker.add( {
            callback: function ( task ) {
                var rotY = entity.spatial.rotation[1];
                
                var dirVec = [
                    Math.sin(rotY*Math.PI/180),
                    0,
                    Math.cos(rotY*Math.PI/180)
                ];

                dirVec = CubicVR.vec3.normalize(dirVec);

                //entity.spatial.position[0] += dirVec[0] * accel * task.dt;
                //entity.spatial.position[2] += dirVec[2] * accel * task.dt;

                shipBody.setVelocity(dirVec);

                var dims = shipBody.getSphere().getDims();
                entity.spatial.position[0] = dims[0];
                entity.spatial.position[1] = dims[1];
                entity.spatial.position[2] = dims[2];

            }
        } );
        inputMap.add( paladin.messenger.Event( rollLeftEvent, true ),
                      paladin.keyboardInput.Event( ['a'], true ) )
        inputMap.add( paladin.messenger.Event( rollRightEvent, true ),
                      paladin.keyboardInput.Event( ['d'], true ) )
        inputMap.add( paladin.messenger.Event( rollLeftEvent, false ),
                      paladin.keyboardInput.Event( ['a'], false ) )
        inputMap.add( paladin.messenger.Event( rollRightEvent, false ),
                      paladin.keyboardInput.Event( ['d'], false ) )
        entity.listen( {
            event: paladin.messenger.Event( rollLeftEvent, false ), 
            callback: function( p ) {
                events[rollLeftEvent] = false;
            }
        } );
        entity.listen( {
            event: paladin.messenger.Event( rollLeftEvent, true ), 
            callback: function( p ) {
                events[rollLeftEvent] = true;
            }
        } );
        entity.listen( {
            event: paladin.messenger.Event( rollRightEvent, false ), 
            callback: function( p ) {
                events[rollRightEvent] = false;
            }
        } );
        entity.listen( {
            event: paladin.messenger.Event( rollRightEvent, true ), 
            callback: function( p ) {
                events[rollRightEvent] = true;
            }
        } );
        entity.listen( {
            event: paladin.touchInput.Event( [], true ),
            callback: function( p ) { 
                var position = p[0].position;
                var width = paladin.graphics.getWidth();
                if( position.x < width/2 )
                    paladin.messenger.send( {
                        event: paladin.messenger.Event( rollLeftEvent, true )
                    } );
                else if( position.x > width/2 )
                    paladin.messenger.send( {
                        event: paladin.messenger.Event( rollRightEvent, true )
                    } );
            }
        } );
        entity.listen( {
            event: paladin.touchInput.Event( [], false ),
            callback: function( p ) { 
                var position = p[0].position;
                var width = paladin.graphics.getWidth();
                if( position.x < width/2 )
                    paladin.messenger.send( {
                        event: paladin.messenger.Event( rollLeftEvent, false )
                    } );
                else if( position.x > width/2 )
                    paladin.messenger.send( {
                        event: paladin.messenger.Event( rollRightEvent, false )
                    } );
            }
        } );
      }
    });
    

    var boxes = [];
    for (var i=0; i<10; ++i) {
      (function () {
        var mesh = new paladin.graphics.Mesh( {
            primitives: [ {
                type: 'box',
                size: 5 + Math.random(),
                material: {
                  color: [Math.random(), Math.random(), Math.random()]
                }
            } ],
            finalize: true
        } );

        var box = new paladin.Entity();
        var model = new paladin.component.Model( {
            mesh: mesh
        } );
        box.addComponent( model );
        box.spatial.position = [-50 + 100 * Math.random(), 
                                -5 + 10 * Math.random(),
                                -50 + 100 * Math.random()];

        box.spatial.rotation = [Math.random() * 360,
                                Math.random() * 360,
                                Math.random() * 360];
        box.setParent( scene );
        
        scene.graphics.prepareTransforms();

        boxes.push(box);
      
        box.body = new paladin.physics.Body({
          aabb: model.object.getAABB()
        });

        box.body.externalObject = box;

        universe.addBody( box.body );

      })();
    } //for

    var rotationTask = paladin.tasker.add( {
        callback: function( task ) {
          for ( var i=0, l=boxes.length; i<l; ++i) {
            boxes[i].spatial.rotation[0] += .1;
            boxes[i].spatial.rotation[1] += .2;
            boxes[i].spatial.rotation[2] += .3;
          }
        }
    } );
    
    // This shouldn't be CubicVR code...
    var explosionMesh = CubicVR.primitives.box({
      size: 5+Math.random(),
      transform: (new CubicVR.Transform()).rotate([
                    Math.random()*360, 
                    Math.random()*360, 
                    Math.random()*360]).translate([
                    -.5+Math.random()*.5, 
                    -.5+Math.random()*.5, 
                    -.5+Math.random()*.5]),
      material: new CubicVR.Material({
        specular: [1, 1, 1],
        shininess: 1.0,
        env_amount: 0.5,
        color: [Math.random()*.2+.8, Math.random()*.1, 0],
        opacity: 0.1,
        textures: {
          envsphere: new CubicVR.Texture('fract_reflections.jpg'),
          alpha: new CubicVR.Texture('fract_reflections.jpg')
        }
      }),
      uvmapper: {
        projectionMode: CubicVR.enums.uv.projection.CUBIC,
        scale:[5, 5, 5]
      }
    });
    CubicVR.primitives.box({
      mesh: explosionMesh,
      size: 5+Math.random(),
      transform: (new CubicVR.Transform()).rotate([
                    Math.random()*360, 
                    Math.random()*360, 
                    Math.random()*360]).translate([
                    -.5+Math.random()*.5, 
                    -.5+Math.random()*.5, 
                    -.5+Math.random()*.5]),
      material: new CubicVR.Material({
        env_amount: 1.0,
        color: [Math.random()*.2+.8, Math.random()*.2+.6, 0],
        env_amount: .5,
        opacity: 0.1,
        textures: {
          envsphere: new CubicVR.Texture('fract_reflections.jpg'),
          alpha: new CubicVR.Texture('fract_reflections.jpg')
        }
      }),
      uvmapper: {
        projectionMode: CubicVR.enums.uv.projection.CUBIC,
        scale:[5, 5, 5]
      }
    });
    CubicVR.primitives.sphere({
      mesh: explosionMesh,
      lon: 24,
      lat: 24,
      radius: 6+Math.random(),
      transform: (new CubicVR.Transform()).rotate([Math.random()*360, Math.random()*360, Math.random()*360]),
      material: new CubicVR.Material({
        opacity: .999,
        color: [Math.random()*.2+.8, Math.random()*.2+.3, 0],
        textures: {
          alpha: new CubicVR.Texture('fract_reflections.jpg')
        }
      }),
      uvmapper: {
        projectionMode: CubicVR.enums.uv.projection.CUBIC,
        scale:[5, 5, 5]
      }
    });
    explosionMesh.prepare();

    this.run = function () {
      paladin.tasker.add({
        callback: function ( task ) {
          var collisions = universe.advance( task.dt/100 );
          if ( shipBody.collisions.length > 0 ) {
            for ( var i=0, l=shipBody.collisions.length; i<l; ++i ) {
              var entity = shipBody.collisions[i].externalObject;
              entity.spatial.position[1] = 200;
              universe.removeBody( shipBody.collisions[i] );
              paladin.tasker.add((function () {
                var explosionObject = new CubicVR.SceneObject( explosionMesh );
                explosionObject.position = shipEntity.spatial.position.slice();
                scene.graphics.bindSceneObject(explosionObject);
                explosionObject.rotation = [
                  Math.random()*360,
                  Math.random()*360,
                  Math.random()*360
                ];
                explosionObject.scale = [.1, .1, .1];
                return { callback: function ( task ) {
                  var s = 40 - 40/(Math.pow(Math.E, task.elapsed/1000));
                  explosionObject.scale = [s, s, s];
                  if ( task.elapsed > 2000 ) {
                    scene.graphics.removeSceneObject( explosionObject );
                    return task.DONE;
                  }
                  return task.CONT;
                }}
              })());
            }
          }
        }
      });
      paladin.run();
    };

    scene.graphics.bindLight( new CubicVR.Light({
      type: CubicVR.enums.light.type.AREA,
      intensity:0.9,
      mapRes:1024,
      areaCeiling:40,
      areaFloor:-40,
      areaAxis:[25,5]
    }));

};

document.addEventListener('DOMContentLoaded', function (e) {
    var game = new Game();
    game.run();
}, false);

})(window, document, CubicVR, Paladin);

var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var jgb2;
(function (jgb2) {
    var World = (function () {
        function World(game, gravity, scale) {
            this.game = game;
            this.gravity = gravity ? gravity : {
                x: 0,
                y: 10
            };
            this.scale = scale ? scale : 30;
            this.velocityIteration = 10;
            this.positionIteration = 10;
            this.world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(this.gravity.x, this.gravity.y), true);
            this.entities = [];
            this.radian = 180 / Math.PI;
            this.attachOption = new AttachOption();
        }
        World.prototype.enableDebug = function (context) {
            if(this.debug) {
                return;
            }
            var debugDraw = new Box2D.Dynamics.b2DebugDraw();
            debugDraw.SetSprite(context);
            debugDraw.SetDrawScale(this.scale);
            debugDraw.SetFillAlpha(0.3);
            debugDraw.SetLineThickness(1.0);
            debugDraw.SetFlags(Box2D.Dynamics.b2DebugDraw.e_shapeBit | Box2D.Dynamics.b2DebugDraw.e_jointBit);
            this.world.SetDebugDraw(debugDraw);
            this.debug = true;
            if(!this.game.render) {
                this.game.render = new Trigger();
            }
            this.game.render.handle(this, this.render);
        };
        World.prototype.disableDebug = function () {
            this.game.render.remove(this, this.render);
            delete this.debug;
        };
        World.prototype.render = function () {
            this.world.DrawDebugData();
            this.world.ClearForces();
        };
        World.prototype.getGravity = function () {
            var ret = this.world.GetGravity();
            return {
                x: ret.x,
                y: ret.y
            };
        };
        World.prototype.setGravity = function (g) {
            this.world.SetGravity(new Box2D.Common.Math.b2Vec2(g.x, g.y));
            this.awakeAll();
        };
        World.prototype.enableContactEvent = function () {
            if(this.beginContact) {
                return;
            }
            var listener = new ContactListener(this);
            this.world.SetContactListener(listener);
        };
        World.prototype.disableContactEvent = function () {
            throw "Can not disable contact event";
        };
        World.prototype.start = function (first) {
            if(this.started) {
                return;
            }
            this.started = true;
            if(first) {
                this.game.update.handleInsert(0, this, this.update);
            } else {
                this.game.update.handle(this, this.update);
            }
        };
        World.prototype.stop = function () {
            if(!this.started) {
                return;
            }
            this.game.update.remove(this, this.update);
            delete this.started;
        };
        World.prototype.update = function (t) {
            this.updateBox2dObjects();
            this.world.Step(t / 1000, this.velocityIteration, this.positionIteration);
            this.updateJGObjects();
        };
        World.prototype.updateBox2dObjects = function () {
            for(var i = 0; i < this.entities.length; i++) {
                var e = this.entities[i];
                if(this.checkDestroy(e, i)) {
                    i--;
                    continue;
                }
                if(e.attachOption.syncPoint) {
                    var orgPos = e.getPosition();
                    var pos = this.getBoxPosition(e.entity);
                    if(pos.x != orgPos.x || pos.y != orgPos.y) {
                        this.entities[i].setPosition(pos);
                    }
                }
                if(e.attachOption.syncRotate) {
                    var rotate = e.entity.getDrawOption("rotate") / this.radian;
                    if(Math.round(e.getAngle()) != Math.round(rotate)) {
                        e.setAngle(rotate);
                    }
                }
            }
        };
        World.prototype.updateJGObjects = function () {
            for(var i = 0; i < this.entities.length; i++) {
                var e = this.entities[i];
                if(this.checkDestroy(e, i)) {
                    i--;
                    continue;
                }
                if(e.attachOption.syncPoint) {
                    var pos = this.getJGPosition(e);
                    if(pos.x != e.entity.x || pos.y != e.entity.y) {
                        e.entity.moveTo(pos.x, pos.y);
                    }
                }
                if(e.attachOption.syncRotate) {
                    e.entity.setDrawOption("rotate", e.getAngle() * this.radian);
                }
            }
        };
        World.prototype.checkDestroy = function (e, index) {
            if(!e.entity.parent) {
                if(index == undefined) {
                    for(var i = 0; i < this.entities.length; i++) {
                        if(e == this.entities[i]) {
                            index = i;
                            break;
                        }
                    }
                    if(index == undefined) {
                        throw "can not find entity";
                    }
                }
                e.destroy();
                this.entities.splice(index, 1);
                return true;
            }
            return false;
        };
        World.prototype.attach = function (entity, noAutoShape) {
            var option = this.attachOption.clone();
            if(!noAutoShape && entity instanceof Shape) {
                if((entity).type == ShapeType.arc) {
                    option.shapeType = ShapeType.arc;
                } else {
                    option.shapeType = ShapeType.rect;
                }
            }
            var boxEntity = this._attach(entity, Box2D.Dynamics.b2Body.b2_dynamicBody, option);
            this.entities.push(boxEntity);
            return boxEntity;
        };
        World.prototype.attachStatic = function (entity, noAutoShape) {
            var option = this.attachOption.clone();
            if(!noAutoShape && entity instanceof Shape) {
                if((entity).type == ShapeType.arc) {
                    option.shapeType = ShapeType.arc;
                } else {
                    option.shapeType = ShapeType.rect;
                }
            }
            var boxEntity = this._attach(entity, Box2D.Dynamics.b2Body.b2_staticBody, option);
            this.entities.push(boxEntity);
            return boxEntity;
        };
        World.prototype.detach = function (entity) {
            for(var i = 0; i < this.entities.length; i++) {
                var e = this.entities[i];
                if(e.entity == entity) {
                    this.world.DestroyBody(e.body);
                    e.destroy();
                    this.entities.splice(i, 1);
                    return true;
                }
            }
            return false;
        };
        World.prototype._attach = function (entity, sd, option) {
            var boxEntity = new jgb2.Entity(entity);
            var pos = this.getBoxPosition(entity);
            var size = this.getBoxSize(entity);
            var fixDef = option.createFixtureDef(size);
            var bodyDef = option.createBodyDef(sd, pos, boxEntity);
            boxEntity.body = this.world.CreateBody(bodyDef);
            boxEntity.fixture = boxEntity.body.CreateFixture(fixDef);
            boxEntity.attachOption = option;
            return boxEntity;
        };
        World.prototype.get = function (e) {
            for(var i = 0; i < this.entities.length; i++) {
                if(e == this.entities[i].entity) {
                    return this.entities[i];
                }
            }
            return null;
        };
        World.prototype.getBoxPosition = function (p) {
            var area = p;
            if(area.width && area.height) {
                return {
                    x: (area.x + area.width / 2) / this.scale,
                    y: (area.y + area.height / 2) / this.scale
                };
            } else {
                return {
                    x: p.x / this.scale,
                    y: p.y / this.scale
                };
            }
        };
        World.prototype.getBoxSize = function (size) {
            return {
                width: size.width / this.scale / 2,
                height: size.height / this.scale / 2
            };
        };
        World.prototype.getBoxArea = function (area) {
            return {
                x: (area.x + area.width / 2) / this.scale,
                y: (area.y + area.height / 2) / this.scale,
                width: area.width / this.scale / 2,
                height: area.height / this.scale / 2
            };
        };
        World.prototype.getJGPosition = function (entity) {
            var pos = entity.getPosition();
            return {
                x: pos.x * this.scale - entity.entity.width / 2,
                y: pos.y * this.scale - entity.entity.height / 2
            };
        };
        World.prototype.awakeAll = function () {
            for(var i = 0; i < this.entities.length; i++) {
                this.entities[i].setAwake(true);
            }
        };
        World.prototype.joint = function (e1, e2, anchor1, anchor2) {
            var def = new Box2D.Dynamics.Joints.b2DistanceJointDef();
            def.Initialize(e1.body, e2.body, new Box2D.Common.Math.b2Vec2(anchor1.x, anchor1.y), new Box2D.Common.Math.b2Vec2(anchor2.x, anchor2.y));
            return this.world.CreateJoint(def);
        };
        World.prototype.getContacts = function (entity) {
            var target = null;
            if(entity instanceof E) {
                target = this.get(entity);
                if(target == null) {
                    throw "invalid target";
                }
            } else if(entity instanceof jgb2.Entity) {
                target = entity;
            } else {
                throw "invalid argument";
            }
            var contacts = target.body.GetContactList();
            var ret = [];
            for(var contact = contacts; contact; contact = contact.next) {
                var fixtureA = contact.contact.GetFixtureA();
                var fixtureB = contact.contact.GetFixtureB();
                if(fixtureA) {
                    var e = fixtureA.GetBody().GetUserData();
                    if(e != entity) {
                        ret.push(e);
                    }
                }
                if(fixtureB) {
                    var e = fixtureB.GetBody().GetUserData();
                    if(e != entity) {
                        ret.push(e);
                    }
                }
            }
            return ret;
        };
        World.prototype.hasContact = function (entityA, entityB) {
            var targetA = null;
            if(entityA instanceof E) {
                targetA = this.get(entityA);
                if(targetA == null) {
                    throw "invalid target";
                }
            } else if(entityA instanceof jgb2.Entity) {
                targetA = entityA;
            } else {
                throw "invalid argument";
            }
            var targetB = null;
            if(entityB instanceof E) {
                targetB = this.get(entityB);
                if(targetB == null) {
                    throw "invalid target";
                }
            } else if(entityB instanceof jgb2.Entity) {
                targetB = entityB;
            } else {
                throw "invalid argument";
            }
            var contacts = this.getContacts(targetA);
            for(var i = 0; i < contacts.length; i++) {
                if(contacts[i] == targetB) {
                    return true;
                }
            }
            return false;
        };
        return World;
    })();
    jgb2.World = World;    
    var ContactListener = (function (_super) {
        __extends(ContactListener, _super);
        function ContactListener(world) {
                _super.call(this);
            this.world = world;
        }
        ContactListener.prototype.BeginContact = function (contact) {
            if(this.world.beginContact) {
                this.world.beginContact.fastFire({
                    world: this.world,
                    contact: contact
                });
            }
        };
        ContactListener.prototype.EndContact = function (contact) {
            if(this.world.endContact) {
                this.world.endContact.fastFire({
                    world: this.world,
                    contact: contact
                });
            }
        };
        ContactListener.prototype.PostSolve = function (contact, impulse) {
            if(this.world.postSolve) {
                this.world.postSolve.fastFire({
                    world: this.world,
                    contact: contact,
                    impulse: impulse
                });
            }
        };
        ContactListener.prototype.PreSolve = function (contact, oldManifold) {
            if(this.world.preSolve) {
                this.world.preSolve.fastFire({
                    world: this.world,
                    contact: contact,
                    oldManifold: oldManifold
                });
            }
        };
        return ContactListener;
    })(Box2D.Dynamics.b2ContactListener);
    jgb2.ContactListener = ContactListener;    
    var AttachOption = (function () {
        function AttachOption() {
            this.density = 1.0;
            this.friction = 0.5;
            this.restitution = 0.2;
            this.shapeType = ShapeType.rect;
            this.syncRotate = true;
            this.syncPoint = true;
        }
        AttachOption.prototype.createBodyDef = function (type, pos, userData) {
            var bodyDef = new Box2D.Dynamics.b2BodyDef();
            bodyDef.type = type;
            if(pos) {
                bodyDef.position.x = pos.x;
                bodyDef.position.y = pos.y;
            } else {
                bodyDef.position.x = 0;
                bodyDef.position.y = 0;
            }
            if(userData) {
                bodyDef.userData = userData;
            }
            return bodyDef;
        };
        AttachOption.prototype.createFixtureDef = function (size) {
            var fixDef = new Box2D.Dynamics.b2FixtureDef();
            fixDef.density = this.density;
            fixDef.friction = this.friction;
            fixDef.restitution = this.restitution;
            if(this.points) {
                fixDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
                var vertices = [];
                for(var i = 0; i < this.points.length; i++) {
                    vertices.push(new Box2D.Common.Math.b2Vec2(this.points[i].x, this.points[i].y));
                }
                (fixDef.shape).SetAsArray(vertices, vertices.length);
            } else {
                if(this.shapeType == ShapeType.arc) {
                    fixDef.shape = new Box2D.Collision.Shapes.b2CircleShape(size.width);
                } else {
                    fixDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
                    (fixDef.shape).SetAsBox(size.width, size.height);
                }
            }
            return fixDef;
        };
        AttachOption.prototype.clone = function () {
            var ret = new AttachOption();
            for(var i in this) {
                ret[i] = this[i];
            }
            return ret;
        };
        return AttachOption;
    })();
    jgb2.AttachOption = AttachOption;    
    var Entity = (function () {
        function Entity(entity) {
            this.entity = entity;
        }
        Entity.prototype.destroy = function () {
            this.body.GetWorld().DestroyBody(this.body);
            this.fixture.Destroy();
        };
        Entity.prototype.getMass = function () {
            return this.body.GetMass();
        };
        Entity.prototype.getCenter = function () {
            var pos = this.body.GetLocalCenter();
            return {
                x: pos.x,
                y: pos.y
            };
        };
        Entity.prototype.setCenter = function (pos) {
            var mass = this.body.GetMass();
            var newMassData = new Box2D.Collision.Shapes.b2MassData();
            newMassData.mass = mass;
            newMassData.center = new Box2D.Common.Math.b2Vec2(pos.x, pos.y);
            this.body.SetMassData(newMassData);
        };
        Entity.prototype.resetMassData = function () {
            return this.body.ResetMassData();
        };
        Entity.prototype.getPosition = function () {
            var pos = this.body.GetPosition();
            return {
                x: pos.x,
                y: pos.y
            };
        };
        Entity.prototype.setPosition = function (pos) {
            this.body.SetPosition(new Box2D.Common.Math.b2Vec2(pos.x, pos.y));
        };
        Entity.prototype.addPosition = function (pos) {
            var orgPos = this.body.GetPosition();
            this.body.SetPosition(new Box2D.Common.Math.b2Vec2(orgPos.x + pos.x, orgPos.y + pos.y));
        };
        Entity.prototype.getAngle = function () {
            return this.body.GetAngle();
        };
        Entity.prototype.setAngle = function (angle) {
            this.body.SetAngle(angle);
        };
        Entity.prototype.isBullet = function () {
            return this.body.IsBullet();
        };
        Entity.prototype.setBullet = function (flag) {
            this.body.SetBullet(flag);
        };
        Entity.prototype.isAwake = function () {
            return this.body.IsAwake();
        };
        Entity.prototype.setAwake = function (awake) {
            this.body.SetAwake(awake);
        };
        Entity.prototype.getVelocity = function () {
            return this.body.GetLinearVelocity();
        };
        Entity.prototype.setVelocity = function (p) {
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(p.x, p.y));
            this.setAwake(true);
        };
        Entity.prototype.addVelocity = function (p) {
            var p2 = this.getVelocity();
            p2.x += p.x;
            p2.y += p.y;
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(p2.x, p2.y));
            this.setAwake(true);
        };
        Entity.prototype.getRolling = function () {
            return this.body.GetAngularVelocity();
        };
        Entity.prototype.setRolling = function (rolling) {
            this.body.SetAngularVelocity(rolling);
        };
        Entity.prototype.addRolling = function (rolling) {
            this.body.SetAngularVelocity(this.body.GetAngularVelocity() + rolling);
        };
        Entity.prototype.torque = function (torque) {
            this.body.ApplyTorque(torque);
        };
        Entity.prototype.impulse = function (impuls, base) {
            this.body.ApplyImpulse(new Box2D.Common.Math.b2Vec2(impuls.x, impuls.y), base ? new Box2D.Common.Math.b2Vec2(base.x, base.y) : this.body.GetPosition());
        };
        Entity.prototype.force = function (force, base) {
            this.body.ApplyForce(new Box2D.Common.Math.b2Vec2(force.x, force.y), base ? new Box2D.Common.Math.b2Vec2(base.x, base.y) : this.body.GetPosition());
        };
        Entity.prototype.isFixedRotation = function () {
            return this.body.IsFixedRotation();
        };
        Entity.prototype.setFixedRotation = function (isFix) {
            this.body.SetFixedRotation(isFix);
        };
        return Entity;
    })();
    jgb2.Entity = Entity;    
})(jgb2 || (jgb2 = {}));

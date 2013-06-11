module jgb2 {
	export interface ContactEvent {
		world: jgb2.World;
		contact: Box2D.Dynamics.Contacts.b2Contact;
	}
	export interface ContactPostSolveEvent extends ContactEvent {
		impulse: Box2D.Dynamics.b2ContactImpulse;
	}
	export interface ContactPreSolveEvent extends ContactEvent {
		oldManifold: Box2D.Collision.b2Manifold;
	}
	export class World {
		world:Box2D.Dynamics.b2World;
		game:jg.Game;
		gravity: jg.CommonOffset;
		velocityIteration:number;
		positionIteration:number;
		started: bool;
		entities:jgb2.Entity[];
		debug:bool;
		scale: number;
		radian: number;
		attachOption: AttachOption;

		beginContact:jg.Trigger; //ContactEvent
		endContact:jg.Trigger;   //ContactEvent
		postSolve:jg.Trigger;    //ContactPostSolveEvent
		preSolve:jg.Trigger;     //ContactPreSolveEvent


		constructor(game:jg.Game, gravity?:jg.CommonOffset, scale?:number) {
			this.game = game;
			this.gravity = gravity ? gravity : {x: 0, y:10};
			this.scale = scale ? scale : 30;
			this.velocityIteration = 10;
			this.positionIteration = 10;

			this.world = new Box2D.Dynamics.b2World(
				new Box2D.Common.Math.b2Vec2(this.gravity.x, this.gravity.y),
				true
			);

			this.entities = [];//なぜかnew jgb2.Entity[]だとjavascriptがバグる
			this.radian = 180 / Math.PI;

			this.attachOption = new AttachOption();
		}

		//デバッグ関連
		enableDebug(context:CanvasRenderingContext2D) {
			if (this.debug)
				return;
			var debugDraw = new Box2D.Dynamics.b2DebugDraw();
			debugDraw.SetSprite(context);
			debugDraw.SetDrawScale(this.scale);
			debugDraw.SetFillAlpha(0.3);
			debugDraw.SetLineThickness(1.0);
			debugDraw.SetFlags(
				Box2D.Dynamics.b2DebugDraw.e_shapeBit | Box2D.Dynamics.b2DebugDraw.e_jointBit
			);
			this.world.SetDebugDraw(debugDraw);
			this.debug = true;
			if (! this.game.render)
				this.game.render = new jg.Trigger();
			this.game.render.handle(this, this.render);
		}
		disableDebug() {
			if (!this.debug)
				return;
			this.game.render.remove(this, this.render);
			delete this.debug;
		}
		render() {
			this.world.DrawDebugData();
			this.world.ClearForces();
		}

		//重力関連
		getGravity():jg.CommonOffset {
			var ret = this.world.GetGravity();
			return {
				x: ret.x,
				y: ret.y
			}
		}
		setGravity(g:jg.CommonOffset) {
			this.world.SetGravity(
				new Box2D.Common.Math.b2Vec2(g.x, g.y)
			);
			this.awakeAll();
		}

		//接触時のイベント系。これを一回呼んでから、さらに各種Triggerをnewすると、newしたTriggerが使えるようになる
		//でもトリガーは全部内蔵見えてる系のパラメータ処理する必要あり
		enableContactEvent() {
			if (this.beginContact)
				return;
			//すっげー重いので明示的にnewする形に変更
			//this.beginContact = new Trigger();
			//this.endContact = new Trigger();
			//this.postSolve = new Trigger();
			//this.preSolve = new Trigger();
			var listener = new ContactListener(this);
			this.world.SetContactListener(listener);
		}
		disableContactEvent() {
			//RemoveContactListenerが無い気がする
			throw "Can not disable contact event";
		}

		//開始と終了
		start(first?:bool) {
			if (this.started)
				return;
			this.started = true;
			if (first) {
				this.game.update.handleInsert(0, this, this.update);
			} else {
				this.game.update.handle(this, this.update);
			}
		}
		stop() {
			if (! this.started)
				return;

			this.game.update.remove(this, this.update);
			delete this.started;
		}
		update(t:number) {
			//jgame.js側の変更をbox2dに反映
			this.updateBox2dObjects();

			//物理世界の時間を進める
			this.world.Step(
				t / 1000,
				this.velocityIteration,
				this.positionIteration
			);

			//box2d側の変更をjgame.js側に反映
			this.updateJGObjects();
		}

		//jgame.js側との同期関連
		//jgame.js -> box2d
		updateBox2dObjects() {
			for (var i=0; i<this.entities.length; i++) {
				var e = this.entities[i];
				if (this.checkDestroy(e, i)) {
					i--;
					continue;
				}

				if (e.attachOption.syncPoint) {
					var orgPos = e.getPosition();
					var pos = this.getBoxPosition(e.entity);
					if (pos.x != orgPos.x || pos.y != orgPos.y) {
						this.entities[i].setPosition(pos);
					}
				}
				if (e.attachOption.syncRotate) {
					var rotate = e.entity.getDrawOption("rotate") / this.radian;
					if (Math.round(e.getAngle()) != Math.round(rotate)) {
						e.setAngle(rotate);
					}
				}
				//width, height, scaleなどの情報は反映しない。。。いいのかそれで？
			}
		}
		//box2d -> jgame.js
		updateJGObjects() {
			for (var i=0; i<this.entities.length; i++) {
				var e = this.entities[i];
				if (this.checkDestroy(e, i)) {
					i--;
					continue;
				}

				if (e.attachOption.syncPoint) {
					var pos = this.getJGPosition(e);
					if (pos.x != e.entity.x || pos.y != e.entity.y) {
						e.entity.moveTo(
							pos.x,
							pos.y
						);
					}
				}
				if (e.attachOption.syncRotate) {
					e.entity.setDrawOption("rotate", e.getAngle() * this.radian);
				}
			}
		}
		//jgame.jsでオブジェクトが破棄されていたら、box2d側も削除
		checkDestroy(e:jgb2.Entity, index?:number) {
			if (! e.entity.parent) {
				if (index == undefined) {
					for (var i=0; i<this.entities.length; i++) {
						if (e == this.entities[i]) {
							index = i;
							break;
						}
					}
					if (index == undefined)
						throw "can not find entity";
				}
				e.destroy();
				this.entities.splice(index, 1);
				return true;
			}
			return false;
		}

		//物理世界へお招きするためのメソッド群
		//基本。物理法則を受けるオブジェクトにする
		attach(entity:jg.E, option?:jgb2.AttachOption) {
			option = option ? option : this.attachOption.clone();
			var boxEntity = this._attach(
				entity,
				Box2D.Dynamics.b2Body.b2_dynamicBody,
				option
			);
			this.entities.push(boxEntity);

			return boxEntity;
		}
		//物理法則は受けるけどなぜか全く動かないオブジェクトにする
		//ちなみにこれ以外にb2_kinematicBodyあるけど、これはjgame.jsの普通のオブジェクトで代用可
		attachStatic(entity:jg.E, option?:jgb2.AttachOption) {
			option = option ? option : this.attachOption.clone();
			var boxEntity = this._attach(
				entity,
				Box2D.Dynamics.b2Body.b2_staticBody,
				option
			);
			this.entities.push(boxEntity);

			return boxEntity;
		}
		//物理世界から解放
		detach(entity:jg.E) {
			for (var i=0; i<this.entities.length; i++) {
				var e = this.entities[i];
				if (e.entity == entity) {
					this.world.DestroyBody(e.body);
					e.destroy();
					this.entities.splice(i, 1);
					return true;
				}
			}
			return false;
		}
		//便利関数
		_attach(entity:jg.E, sd:number, option:AttachOption): jgb2.Entity {
			var boxEntity = new jgb2.Entity(entity);

			var pos = this.getBoxPosition(entity);
			var size = this.getBoxSize(entity);
			var fixDef = option.createFixtureDef(size);
			var bodyDef = option.createBodyDef(sd, pos, boxEntity);

			boxEntity.body = this.world.CreateBody(bodyDef);
			boxEntity.fixture = boxEntity.body.CreateFixture(fixDef);
			boxEntity.attachOption = option;

			return boxEntity;
		}

		//EからEntity取得
		get(e:jg.E) {
			for (var i=0; i<this.entities.length; i++) {
				if (e == this.entities[i].entity)
					return this.entities[i];
			}
			return null;
		}

		//jgame.js側の座標系からbox2d系の座標系を得る
		getBoxPosition(p:jg.CommonOffset):jg.CommonOffset {
			var area:jg.CommonArea = <jg.CommonArea>p;
			if (area.width && area.height) {
				return {
					x: (area.x + area.width / 2) / this.scale,
					y: (area.y + area.height / 2) / this.scale
				}
			} else {
				return {
					x: p.x / this.scale,
					y: p.y / this.scale
				}
			}
		}
		getBoxSize(size:jg.CommonSize):jg.CommonSize {
			return {
				width: size.width / this.scale / 2,
				height: size.height / this.scale / 2
			}
		}
		getBoxArea(area:jg.CommonArea):jg.CommonArea {
			return {
				x: (area.x + area.width / 2) / this.scale,
				y: (area.y + area.height / 2) / this.scale,
				width: area.width / this.scale / 2,
				height: area.height / this.scale / 2
			}
		}

		//box2d系の座標系からjgame.js側の座標系を得る
		getJGPosition(entity:jgb2.Entity):jg.CommonOffset {
			var pos = entity.getPosition();
			return {
				x: pos.x * this.scale - entity.entity.width / 2,
				y: pos.y * this.scale - entity.entity.height / 2
			}
		}

		//とりあえず全部起こす。世界全体の変更をしたら必ずたたく事
		awakeAll() {
			for (var i=0; i<this.entities.length; i++) {
				this.entities[i].setAwake(true);
			}
		}

		//joint系サポートしたいけどようわからん
		//とりあえず一番基本的っぽいb2DistanceJointDefだけサポートしてみる
		joint(e1:jgb2.Entity, e2:jgb2.Entity, anchor1:jg.CommonOffset, anchor2:jg.CommonOffset) {
			var def = new Box2D.Dynamics.Joints.b2DistanceJointDef();
			def.Initialize(
				e1.body,
				e2.body,
				new Box2D.Common.Math.b2Vec2(anchor1.x, anchor1.y),
				new Box2D.Common.Math.b2Vec2(anchor2.x, anchor2.y)
			);
			//TODO: jointをサポートするならちゃんとjointの管理も必要かな？自動で消えるかな？
			return this.world.CreateJoint(def);
		}

		//接触しているオブジェクトを取得
		//検証した限り、接触してなさそうなのもとれちゃう。
		//多分「接触してる」の判定基準が感覚的なものと少し違うのだと思われる
		//entityはEまたはjgb2.Entityのいずれかで指定可
		getContacts(entity:any) {
			var target:Entity = null;
			if (entity instanceof jg.E) {
				target = this.get(entity);
				if (target == null)
					throw "invalid target";
			} else if (entity instanceof jgb2.Entity) {
				target = entity;
			} else {
				throw "invalid argument";
			}

			var contacts = target.body.GetContactList();
			var ret = [];
			for (var contact = contacts; contact; contact = contact.next) {
				var fixtureA = contact.contact.GetFixtureA();
				var fixtureB = contact.contact.GetFixtureB();
				if (fixtureA) {
					var e = fixtureA.GetBody().GetUserData();
					if (e != entity)
						ret.push(e);
				}
				if (fixtureB) {
					var e = fixtureB.GetBody().GetUserData();
					if (e != entity)
						ret.push(e);
				}
			}
			return ret;
		}
		//entityAに接触している物体に、entityBが含まれているかどうか
		//entityAとBは両方ともEまたはjgb2.Entityのいずれかで指定可
		hasContact(entityA:any, entityB:any) {
			var targetA = null;
			if (entityA instanceof jg.E) {
				targetA = this.get(entityA);
				if (targetA == null)
					throw "invalid target";
			} else if (entityA instanceof jgb2.Entity) {
				targetA = entityA;
			} else {
				throw "invalid argument";
			}

			var targetB = null;
			if (entityB instanceof jg.E) {
				targetB = this.get(entityB);
				if (targetB == null)
					throw "invalid target";
			} else if (entityB instanceof jgb2.Entity) {
				targetB = entityB;
			} else {
				throw "invalid argument";
			}

			var contacts = this.getContacts(targetA);
			for (var i=0; i<contacts.length; i++) {
				if (contacts[i] == targetB) {
					return true;
				}
			}
			return false;
		}
	}

	//コンタクトリスナのラッパ
	//親のメソッドは全部function(){}なので、super.XXXXは一切呼ばないでいいみたい
	//イベント呼び出し回数が多すぎるため、fireではなく全てfastFireで対応
	export class ContactListener extends Box2D.Dynamics.b2ContactListener {
		world:jgb2.World;
		constructor(world:jgb2.World) {
			super();
			this.world = world;
		}

		public BeginContact(contact: Box2D.Dynamics.Contacts.b2Contact): void {
			if (this.world.beginContact)
				this.world.beginContact.fastFire({
					world: this.world,
					contact: contact
				});
		}

		public EndContact(contact: Box2D.Dynamics.Contacts.b2Contact): void {
			if (this.world.endContact)
				this.world.endContact.fastFire({
					world: this.world,
					contact: contact
				});
		}

		public PostSolve(contact: Box2D.Dynamics.Contacts.b2Contact, impulse: Box2D.Dynamics.b2ContactImpulse): void {
			if (this.world.postSolve)
				this.world.postSolve.fastFire({
					world: this.world,
					contact: contact,
					impulse: impulse
				});
		}

		public PreSolve(contact: Box2D.Dynamics.Contacts.b2Contact, oldManifold: Box2D.Collision.b2Manifold): void {
			if (this.world.preSolve)
				this.world.preSolve.fastFire({
					world: this.world,
					contact: contact,
					oldManifold: oldManifold
				});
		}
	}

	export class AttachOption {
		density:number;	//密度
		friction:number;	//摩擦
		restitution:number;	//反発
		shapeType:jg.ShapeType;
		syncRotate:bool;
		syncPoint:bool;
		points:jg.CommonOffset[];

		constructor() {
			this.density = 1.0;
			this.friction = 0.5;
			this.restitution = 0.2;
			this.shapeType = jg.ShapeType.Rect;
			this.syncRotate = true;
			this.syncPoint = true;
		}

		createBodyDef(type:number, pos?:jg.CommonOffset, userData?:any):Box2D.Dynamics.b2BodyDef {
			var bodyDef = new Box2D.Dynamics.b2BodyDef();
			bodyDef.type = type;
			if (pos) {
				bodyDef.position.x = pos.x;
				bodyDef.position.y = pos.y;
			} else {
				bodyDef.position.x = 0;
				bodyDef.position.y = 0;
			}
			if (userData) {
				bodyDef.userData = userData;
			}
			return bodyDef;
		}

		createFixtureDef(size:jg.CommonSize):Box2D.Dynamics.b2FixtureDef {
			var fixDef = new Box2D.Dynamics.b2FixtureDef();
			fixDef.density = this.density;
			fixDef.friction = this.friction;
			fixDef.restitution = this.restitution;

			if (this.points) {
				fixDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
				var vertices:Box2D.Common.Math.b2Vec2[] = [];
				for (var i=0; i<this.points.length; i++) {
					vertices.push(new Box2D.Common.Math.b2Vec2(
						this.points[i].x, this.points[i].y
					));
				}
				(<Box2D.Collision.Shapes.b2PolygonShape>fixDef.shape).SetAsArray(
					vertices,
					vertices.length
				);
			} else {
				if (this.shapeType == jg.ShapeType.Arc) {
					fixDef.shape = new Box2D.Collision.Shapes.b2CircleShape(
						size.width
					);
				} else {
					fixDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
					(<Box2D.Collision.Shapes.b2PolygonShape>fixDef.shape).SetAsBox(
						size.width,
						size.height
					);
				}
			}
			return fixDef;
		}

		clone() {
			var ret = new AttachOption();
			for (var i in this)
				ret[i] = this[i];

			return ret;
		}
	}

	export class Entity {
		entity:jg.E;
		body:Box2D.Dynamics.b2Body;
		fixture:Box2D.Dynamics.b2Fixture;
		attachOption:AttachOption;

		constructor(entity:jg.E) {
			this.entity = entity;
		}

		destroy() {
			this.body.GetWorld().DestroyBody(this.body);
			this.fixture.Destroy();
		}

		//Mass
		getMass():number {
			return this.body.GetMass();
		}

		//中心点関係
		getCenter():jg.CommonOffset {
			var pos = this.body.GetLocalCenter();
			return {
				x: pos.x,
				y: pos.y
			}
		}
		setCenter(pos:jg.CommonOffset) {
			var mass = this.body.GetMass();
			var newMassData = new Box2D.Collision.Shapes.b2MassData();
			newMassData.mass = mass;
			newMassData.center = new Box2D.Common.Math.b2Vec2(pos.x, pos.y);
			this.body.SetMassData(newMassData);
		}

		//困った時のreset
		resetMassData() {
			return this.body.ResetMassData();
		}

		//場所。起点がjgame.jsとは違う
		getPosition():jg.CommonOffset {
			var pos = this.body.GetPosition();
			return {
				x: pos.x,
				y: pos.y
			}
		}
		setPosition(pos:jg.CommonOffset) {
			this.body.SetPosition(
				new Box2D.Common.Math.b2Vec2(pos.x, pos.y)
			);
		}
		addPosition(pos:jg.CommonOffset) {
			var orgPos = this.body.GetPosition();
			this.body.SetPosition(
				new Box2D.Common.Math.b2Vec2(orgPos.x+pos.x, orgPos.y+pos.y)
			);
		}

		//角度
		getAngle():number {
			return this.body.GetAngle();
		}
		setAngle(angle:number) {
			this.body.SetAngle(angle);
		}

		//弾丸かどうかを取得
		isBullet():bool {
			return this.body.IsBullet();
		}
		//trueだと弾丸にする？？やってみたけどよくわからん
		setBullet(flag:bool) {
			this.body.SetBullet(flag);
		}

		//停止してるかどうか取得
		isAwake():bool {
			return this.body.IsAwake();
		}
		//trueで計算再開、falseで計算停止
		setAwake(awake:bool) {
			this.body.SetAwake(awake);
		}

		//移動力関連
		getVelocity():jg.CommonOffset {
			return this.body.GetLinearVelocity();
		}
		setVelocity(p:jg.CommonOffset) {
			this.body.SetLinearVelocity(
				new Box2D.Common.Math.b2Vec2(p.x, p.y)
			);
			this.setAwake(true);
		}
		addVelocity(p:jg.CommonOffset) {
			var p2 = this.getVelocity();
			p2.x += p.x;
			p2.y += p.y;
			this.body.SetLinearVelocity(
				new Box2D.Common.Math.b2Vec2(p2.x, p2.y)
			);
			this.setAwake(true);
		}

		//回転力を与える系
		getRolling():number {
			return this.body.GetAngularVelocity();
		}
		setRolling(rolling:number) {
			this.body.SetAngularVelocity(rolling);
		}
		addRolling(rolling:number) {
			this.body.SetAngularVelocity(
				this.body.GetAngularVelocity() + rolling
			);
		}

		//継続的な回転力、っていうけどなんか普通に止まる回転力しか与えられないぞ？？
		torque(torque:number) {
			this.body.ApplyTorque(torque);
		}

		//瞬間的な力を加える。らしい。
		//baseが設定されていると、多分その方向からの力として認識される
		impulse(impuls:jg.CommonOffset, base?:jg.CommonOffset) {
			this.body.ApplyImpulse(
				new Box2D.Common.Math.b2Vec2(impuls.x, impuls.y),
				base ? new Box2D.Common.Math.b2Vec2(base.x, base.y) : this.body.GetPosition()
			);
		}

		//継続的な力を与える。継続的な力という割にすぐになくなるけど。
		//感覚的に、impuls > velocity > forceの順に力が強くなる印象
		//baseが設定されていると、多分その方向からの力として認識される
		force(force:jg.CommonOffset, base?:jg.CommonOffset) {
			this.body.ApplyForce(
				new Box2D.Common.Math.b2Vec2(force.x, force.y),
				base ? new Box2D.Common.Math.b2Vec2(base.x, base.y) : this.body.GetPosition()
			);
		}

		//固定回転関係。指定すると永続的に回り続ける
		//これだけじゃ回らないので、どのくらい回っているかをrolling系で指定する事
		isFixedRotation():bool {
			return this.body.IsFixedRotation();
		}
		setFixedRotation(isFix:bool) {
			this.body.SetFixedRotation(isFix);
		}
	}
}
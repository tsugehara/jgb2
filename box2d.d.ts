module jgb2 {
    interface ContactEvent {
        world: World;
        contact: Box2D.Dynamics.Contacts.b2Contact;
    }
    interface ContactPostSolveEvent extends ContactEvent {
        impulse: Box2D.Dynamics.b2ContactImpulse;
    }
    interface ContactPreSolveEvent extends ContactEvent {
        oldManifold: Box2D.Collision.b2Manifold;
    }
    class World {
        public world: Box2D.Dynamics.b2World;
        public game: Game;
        public gravity: CommonOffset;
        public velocityIteration: number;
        public positionIteration: number;
        public started: bool;
        public entities: Entity[];
        public debug: bool;
        public scale: number;
        public radian: number;
        public attachOption: AttachOption;
        public beginContact: Trigger;
        public endContact: Trigger;
        public postSolve: Trigger;
        public preSolve: Trigger;
        constructor (game: Game, gravity?: CommonOffset, scale?: number);
        public enableDebug(context: CanvasRenderingContext2D): void;
        public disableDebug(): void;
        public render(): void;
        public getGravity(): CommonOffset;
        public setGravity(g: CommonOffset): void;
        public enableContactEvent(): void;
        public disableContactEvent(): void;
        public start(first?: bool): void;
        public stop(): void;
        public update(t: number): void;
        public updateBox2dObjects(): void;
        public updateJGObjects(): void;
        public checkDestroy(e: Entity, index?: number): bool;
        public attach(entity: E, noAutoShape?: bool): Entity;
        public attachStatic(entity: E, noAutoShape?: bool): Entity;
        public detach(entity: E): bool;
        public _attach(entity: E, sd: number, option: AttachOption): Entity;
        public get(e: E): Entity;
        public getBoxPosition(p: CommonOffset): CommonOffset;
        public getBoxSize(size: CommonSize): CommonSize;
        public getBoxArea(area: CommonArea): CommonArea;
        public getJGPosition(entity: Entity): CommonOffset;
        public awakeAll(): void;
        public joint(e1: Entity, e2: Entity, anchor1: CommonOffset, anchor2: CommonOffset): Box2D.Dynamics.Joints.b2Joint;
        public getContacts(entity: any): any[];
        public hasContact(entityA: any, entityB: any): bool;
    }
    class ContactListener extends Box2D.Dynamics.b2ContactListener {
        public world: World;
        constructor (world: World);
        public BeginContact(contact: Box2D.Dynamics.Contacts.b2Contact): void;
        public EndContact(contact: Box2D.Dynamics.Contacts.b2Contact): void;
        public PostSolve(contact: Box2D.Dynamics.Contacts.b2Contact, impulse: Box2D.Dynamics.b2ContactImpulse): void;
        public PreSolve(contact: Box2D.Dynamics.Contacts.b2Contact, oldManifold: Box2D.Collision.b2Manifold): void;
    }
    class AttachOption {
        public density: number;
        public friction: number;
        public restitution: number;
        public shapeType: ShapeType;
        public syncRotate: bool;
        public syncPoint: bool;
        public points: CommonOffset[];
        constructor ();
        public createBodyDef(type: number, pos?: CommonOffset, userData?: any): Box2D.Dynamics.b2BodyDef;
        public createFixtureDef(size: CommonSize): Box2D.Dynamics.b2FixtureDef;
        public clone(): AttachOption;
    }
    class Entity {
        public entity: E;
        public body: Box2D.Dynamics.b2Body;
        public fixture: Box2D.Dynamics.b2Fixture;
        public attachOption: AttachOption;
        constructor (entity: E);
        public destroy(): void;
        public getMass(): number;
        public getCenter(): CommonOffset;
        public setCenter(pos: CommonOffset): void;
        public resetMassData(): void;
        public getPosition(): CommonOffset;
        public setPosition(pos: CommonOffset): void;
        public addPosition(pos: CommonOffset): void;
        public getAngle(): number;
        public setAngle(angle: number): void;
        public isBullet(): bool;
        public setBullet(flag: bool): void;
        public isAwake(): bool;
        public setAwake(awake: bool): void;
        public getVelocity(): CommonOffset;
        public setVelocity(p: CommonOffset): void;
        public addVelocity(p: CommonOffset): void;
        public getRolling(): number;
        public setRolling(rolling: number): void;
        public addRolling(rolling: number): void;
        public torque(torque: number): void;
        public impulse(impuls: CommonOffset, base?: CommonOffset): void;
        public force(force: CommonOffset, base?: CommonOffset): void;
        public isFixedRotation(): bool;
        public setFixedRotation(isFix: bool): void;
    }
}

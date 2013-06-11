declare module jgb2 {
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
        public game: jg.Game;
        public gravity: jg.CommonOffset;
        public velocityIteration: number;
        public positionIteration: number;
        public started: boolean;
        public entities: Entity[];
        public debug: boolean;
        public scale: number;
        public radian: number;
        public attachOption: AttachOption;
        public beginContact: jg.Trigger;
        public endContact: jg.Trigger;
        public postSolve: jg.Trigger;
        public preSolve: jg.Trigger;
        constructor(game: jg.Game, gravity?: jg.CommonOffset, scale?: number);
        public enableDebug(context: CanvasRenderingContext2D): void;
        public disableDebug(): void;
        public render(): void;
        public getGravity(): jg.CommonOffset;
        public setGravity(g: jg.CommonOffset): void;
        public enableContactEvent(): void;
        public disableContactEvent(): void;
        public start(first?: boolean): void;
        public stop(): void;
        public update(t: number): void;
        public updateBox2dObjects(): void;
        public updateJGObjects(): void;
        public checkDestroy(e: Entity, index?: number): boolean;
        public attach(entity: jg.E, option?: AttachOption): Entity;
        public attachStatic(entity: jg.E, option?: AttachOption): Entity;
        public detach(entity: jg.E): boolean;
        public _attach(entity: jg.E, sd: number, option: AttachOption): Entity;
        public get(e: jg.E): Entity;
        public getBoxPosition(p: jg.CommonOffset): jg.CommonOffset;
        public getBoxSize(size: jg.CommonSize): jg.CommonSize;
        public getBoxArea(area: jg.CommonArea): jg.CommonArea;
        public getJGPosition(entity: Entity): jg.CommonOffset;
        public awakeAll(): void;
        public joint(e1: Entity, e2: Entity, anchor1: jg.CommonOffset, anchor2: jg.CommonOffset): Box2D.Dynamics.Joints.b2Joint;
        public getContacts(entity: any): any[];
        public hasContact(entityA: any, entityB: any): boolean;
    }
    class ContactListener extends Box2D.Dynamics.b2ContactListener {
        public world: World;
        constructor(world: World);
        public BeginContact(contact: Box2D.Dynamics.Contacts.b2Contact): void;
        public EndContact(contact: Box2D.Dynamics.Contacts.b2Contact): void;
        public PostSolve(contact: Box2D.Dynamics.Contacts.b2Contact, impulse: Box2D.Dynamics.b2ContactImpulse): void;
        public PreSolve(contact: Box2D.Dynamics.Contacts.b2Contact, oldManifold: Box2D.Collision.b2Manifold): void;
    }
    class AttachOption {
        public density: number;
        public friction: number;
        public restitution: number;
        public shapeType: jg.ShapeType;
        public syncRotate: boolean;
        public syncPoint: boolean;
        public points: jg.CommonOffset[];
        constructor();
        public createBodyDef(type: number, pos?: jg.CommonOffset, userData?: any): Box2D.Dynamics.b2BodyDef;
        public createFixtureDef(size: jg.CommonSize): Box2D.Dynamics.b2FixtureDef;
        public clone(): AttachOption;
    }
    class Entity {
        public entity: jg.E;
        public body: Box2D.Dynamics.b2Body;
        public fixture: Box2D.Dynamics.b2Fixture;
        public attachOption: AttachOption;
        constructor(entity: jg.E);
        public destroy(): void;
        public getMass(): number;
        public getCenter(): jg.CommonOffset;
        public setCenter(pos: jg.CommonOffset): void;
        public resetMassData(): void;
        public getPosition(): jg.CommonOffset;
        public setPosition(pos: jg.CommonOffset): void;
        public addPosition(pos: jg.CommonOffset): void;
        public getAngle(): number;
        public setAngle(angle: number): void;
        public isBullet(): boolean;
        public setBullet(flag: boolean): void;
        public isAwake(): boolean;
        public setAwake(awake: boolean): void;
        public getVelocity(): jg.CommonOffset;
        public setVelocity(p: jg.CommonOffset): void;
        public addVelocity(p: jg.CommonOffset): void;
        public getRolling(): number;
        public setRolling(rolling: number): void;
        public addRolling(rolling: number): void;
        public torque(torque: number): void;
        public impulse(impuls: jg.CommonOffset, base?: jg.CommonOffset): void;
        public force(force: jg.CommonOffset, base?: jg.CommonOffset): void;
        public isFixedRotation(): boolean;
        public setFixedRotation(isFix: boolean): void;
    }
}

import Dep from './dep';
import Pulse from './pulse';
import { copy } from './utils';
import { deepmerge } from './helpers/deepmerge';

export class State<ValueType = any> {
  public masterValue: ValueType = null;
  public set value(val: ValueType) {
    this.masterValue = val;
  }
  public get value(): ValueType {
    if (this.instance().runtime.trackState) this.instance().runtime.foundState.add(this);
    return this.masterValue;
  }
  public output?: any;
  public watchers: { [key: string]: any } = {};
  public previousState: ValueType = null;
  public dep: Dep = null;
  public nextState: ValueType = null;
  public isSet: boolean = false; // has been changed from inital value
  public exists: boolean = false; // is value truthey or falsey
  public persistState: boolean = false;
  public name?: string;
  public valueType?: string;
  // sideEffects can be set by extended classes, such as Groups to build their output.
  public sideEffects?: Function;
  // mutation is the method to return a new value. it is undefined in State but can be used by extended classes such as Computed, which creates it's own value
  public mutation?: () => any;

  public set bind(value: ValueType) {
    this.set(value);
  }
  public get bind(): ValueType {
    return this.masterValue;
  }
  constructor(public instance: () => Pulse, public initalState, deps: Array<Dep> = []) {
    this.dep = new Dep(deps);
    this.privateWrite(initalState);
    this.nextState = copy(initalState);
  }
  /**
   * Directly set state to a new value, if nothing is passed in State.nextState will be used as the next value
   * @param {Object} newState - The new value for this state
   */
  public set(newState?: ValueType): this {
    // ingest update using most basic mutation method
    this.instance().runtime.ingest(this, newState);

    this.isSet = true;

    return this;
  }
  public getPublicValue() {
    if (this.output !== undefined) return this.output;
    return this.masterValue;
  }
  public patch(targetWithChange): this {
    if (!(typeof this.masterValue === 'object')) return this;
    const newVal = deepmerge(this.value, targetWithChange);
    this.set(newVal);
    return this;
  }
  public interval(setFunc: (currentValue: any) => any, ms?: number): this {
    setInterval(() => {
      this.set(setFunc(this.value));
    }, ms || 1000);
    return this;
  }
  public persist(key: string): this {
    this.persistState = true;
    this.name = key;
    const storage = this.instance().storage;
    storage.persistedState.add(this);
    if (storage.isPromise) {
      storage.get(this.name).then((val: ValueType) => {
        if (val === null) storage.set(this.name, this.value);
        this.instance().runtime.ingest(this, val);
      });
    } else {
      let value = storage.get(this.name);
      if (value === null) storage.set(this.name, this.value);
      else this.instance().runtime.ingest(this, value);
    }
    return this;
  }
  public key(key: string): this {
    // this.name = key;
    return this;
  }
  public type(type: any): this {
    const supportedConstructors = ['String', 'Boolean', 'Array', 'Object', 'Number'];
    if (typeof type === 'function' && supportedConstructors.includes(type.name)) {
      this.valueType = type.name.toLowerCase();
    }
    return this;
  }
  public watch(key: number | string, callback: (value: any) => void): this {
    if (typeof key !== 'string' || typeof key !== 'number' || typeof callback !== 'function') {
      // console.error('Pulse watch, missing key or function');
    }

    this.watchers[key] = callback;
    return this;
  }
  public removeWatcher(key: number | string): this {
    delete this.watchers[key];
    return this;
  }
  public toggle(): this {
    return this;
  }
  public reset(): this {
    // this should go through runtime, but eh
    this.isSet = false;
    this.previousState = null;
    this.privateWrite(this.initalState);
    if (this.persistState) this.instance().storage.remove(this.name);
    return this;
  }

  // returns a fresh copy of the current value
  public copy(): any {
    return copy(this.masterValue);
  }

  public is(x: any) {
    return this.value === x;
  }

  public isNot(x: any) {
    return this.value !== x;
  }

  public privateWrite(value: any): void {
    this.exists = !!value;
    this.masterValue = value;

    for (let watcher in this.watchers) {
      if (typeof this.watchers[watcher] === 'function') this.watchers[watcher](value);
    }

    if (this.persistState) this.instance().storage.set(this.name, value);

    // console.log(`STATE "${this.name}" changed`, this.masterValue);
  }
  public relate(state: State | Array<State>) {
    if (!Array.isArray(state)) state = [state];

    // add this to foriegn dep
    state.forEach(state => state && state.dep.depend(this));

    // refrence foriegn dep locally for cleanup
    this.dep.dynamic.add(this);
  }
}

export type StateGroupDefault = {
  [key: string]: State | any;
};
export const StateGroup = (instance: () => Pulse, stateGroup: Object): any => {
  let group: any = {};
  for (let name in stateGroup) {
    group[name] = new State(instance, stateGroup[name]);
    group[name].name = name;
  }
  return group;
};
export default State;
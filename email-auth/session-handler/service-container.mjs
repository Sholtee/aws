/****************************************************
 * File: service-container.mjs
 * Project: email-auth
 *
 * Author: Denes Solti
 *****************************************************/
export default class ServiceContainer {
  #instances = {};  // lazily instantiated services

  configure(name, factory){
    Object.defineProperty(this, name, {
      get: () => {
        const instances = this.#instances;  // destructuring won't work for private members

        if(!instances.hasOwnProperty(name))
          instances[name] = factory(this);

        return instances[name];
      }
    });

    return this;
  }
};
// prettier-ignore
import Store from '../pulse'

const channels = {
  state: {
    channelOpened: true
  }
};

const store = new Store({
  collections: {
    channels
  },
  state: {
    name: "Jamie",
    test: "Pulse is cool",
    theme: "dark"
  },
  mutations: {
    changeName({ self }, val) {
      state.name = val;
    },
    changeTheme({ self }, value) {
      self.set("theme", value);
    }
  },
  getters: {
    getTheme(state) {
      return state;
    }
  },
  actions: {
    switchTheme() {
      if (store.get("theme") === "light") {
        store.commit("changeTheme", "dark");
      } else {
        store.set("theme", "light");
      }
    }
  }
});

export default store;

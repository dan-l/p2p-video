export default {
  namespaced: true,

  state: {
    users: [],
  },

  actions: {
    usersList({ rootState, commit }, users) {
      users = users.filter((user) => user !== rootState.signaling.identity);
      commit('setUsers', users);
    },
  },

  mutations: {
    setUsers (state, payload) {
      state.users = payload;
    },
  },
}

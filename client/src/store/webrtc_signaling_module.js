let socket;

function handleSocketEvents ({ dispatch }, socket) {
  socket.on('connect', (e) => dispatch('socketConnect'));

  socket.on('disconnect', () => dispatch('socketDisconnect'));

  socket.on('usersList', (users) => dispatch('users/usersList', users, { root: true }));

  socket.on('message', (message) => dispatch('onMessage', message));
}

export default {
  namespaced: true,

  state: {
    identity: null,
    sentMessages: [],
    receivedMessages: [],
  },

  actions: {
    connect (context) {
      socket = io('http://localhost:3000');
      handleSocketEvents(context, socket);
    },

    sendMessage ({ state, commit }, message) {
      message['contact'] = state.identity;
      message['sentTimeStamp'] = Date.now();
      socket.emit('message', message);
      commit('sentNewMessage', message);
    },

    onMessage ({ state, commit, dispatch }, message) {
      message['receivedTimeStamp'] = Date.now();
      commit('receivedNewMessage', message);

      switch (message.type) {
        case 'request':
          dispatch('video/processRequest', message, { root: true });
          break;
        case 'accept':
          dispatch('video/processAccept', message, { root: true });
          break;
        case 'offer': {
          dispatch('video/processOffer', message, { root: true });
          break;
        }
        case 'answer': {
          dispatch('video/processAnswer', message, { root: true });
          break;
        }
        case 'ice-candidate':
          dispatch('video/processIceCandidate', message, { root: true });
          break;
        case 'hangup':
          dispatch('media/stopVideoStream', message, { root: true });
          dispatch('video/stopVideo', message, { root: true });
          break;
        case 'decline':
          break;
        default:
          break;
      }
    },

    socketConnect ({ commit }) {
      commit('setIdentity', socket.id);
    },

    socketDisconnect ({ commit }) {
      commit('setIdentity', null);
    },
  },

  mutations: {
    setIdentity (state, payload) {
      state.identity = payload;
    },

    sentNewMessage (state, payload) {
      state.sentMessages.push(payload);
    },

    receivedNewMessage (state, payload) {
      state.receivedMessages.push(payload);
    }
  }
};

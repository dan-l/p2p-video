import Vue from 'vue'
import Vuex from 'vuex'
import video from './webrtc_video_module';
import media from './webrtc_media_module';
import signaling from './webrtc_signaling_module';
import users from './users';

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    video,
    media,
    signaling,
    users,
  },
});

// /\bActions|Mutations\b/ webrtc
store.subscribeAction((action) => {
  console.log('%cActions', 'color:red;', action.type, action.payload);
});
store.subscribe((mutation, state) => {
  console.log('%cMutations', 'color:blue;', mutation.type, mutation.payload);
});

export default store;

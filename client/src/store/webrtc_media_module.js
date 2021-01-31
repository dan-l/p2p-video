export default {
  namespaced: true,

  state: {
    localStream: null,
    remoteStream: null,
  },

  actions: {
    getMedia ({ state }, constraints) {
      return navigator.mediaDevices.getUserMedia(constraints);
    },

    async getVideoStream ({ commit, dispatch }) {
      const constraints = { video: true, audio: true };
      try {
        const media = await dispatch('getMedia', constraints);
        commit('setLocalStream', media);
        return media;
      } catch (ex) {
        alert(`Unable to start video due to ${ex}`);
      }
    },

    stopVideoStream ({ state, commit }) {
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop());
        commit('setLocalStream', null);
      }

      if (state.remoteStream) {
        state.remoteStream.getTracks().forEach((track) => track.stop());
        commit('setRemoteStream', null);
      }
    },

    updateVideoStream ({ state, commit }, newStream) {
      const oldStream = state.localStream;

      // grab the audio track from old stream and add to new stream that has new video track
      const audioTrack = oldStream.getAudioTracks()[0];
      audioTrack && newStream.addTrack(audioTrack);

      commit('setLocalStream', newStream);
    },
  },

  mutations: {
    setLocalStream (state, payload) {
      state.localStream = payload;
    },

    setRemoteStream (state, payload) {
      state.remoteStream = payload;
    },
  },
}

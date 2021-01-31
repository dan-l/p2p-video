import Vue from 'vue';

let pc;
let iceCandidateProcessQueue = [];

function handleEvents ({ dispatch }) {
  pc.onicecandidate = e => dispatch('onIceCandidate', e);
  pc.onsignalingstatechange = () => dispatch('onSignalingStateChange');
  pc.oniceconnectionstatechange = () => dispatch('onIceConnectionStateChange');
  pc.onconnectionstatechange = () => dispatch('onConnectionStateChange');
}

function createPc(context, stream) {
  pc = new RTCPeerConnection({});
  // todo debugging only
  window._pc = pc;
  handleEvents(context);

  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
}

const getDefaultState = () => {
  return {
    contact: null,
    awaitAccept: null,
    localOffer: {},
    remoteOffer: {},
    localAnswer: {},
    remoteAnswer: {},
    connectionState: null,
    iceConnectionState: null,
    signalingState: null,
    iceCandidates: [],
  }
}

export default {
  namespaced: true,

  state: getDefaultState(),

  actions: {
    /**
     * Start video by creating pc, add media to pc, and create offer to send
     */
    async startVideo (context, { contact }) {
      const { state, dispatch, commit } = context;
      commit ('setContact', contact);

      const stream = await dispatch('media/getVideoStream', {}, { root: true });
      createPc(context, stream);
      await dispatch('createOffer');

      const message = {
        type: 'offer',
        offer: state.localOffer,
        id: contact,
      };
      dispatch('signaling/sendMessage', message, { root: true });
    },

    /**
     * Accept the video by resolving the promise in process offer to
     * set the offer as remote description then create answer to it
     */
    async acceptVideo (context) {
      if (pc) pc.close();

      const { dispatch } = context;
      const stream = await dispatch('media/getVideoStream', {}, { root: true });
      createPc(context, stream);

      const { state, commit } = context;
      state.awaitAccept && state.awaitAccept.resolve();
      commit('setAwaitAccept', null);
    },

    /**
     * Declines the video by sending hangup to remote peer
     */
    declineVideo ({ state, commit, dispatch }) {
      state.awaitAccept && state.awaitAccept.reject();
      commit('setAwaitAccept', null);

      dispatch('hangUp');
    },

    /**
     * Invite remote peer for video
     */
    async createOffer ({ dispatch, commit }) {
      let localOffer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      commit('setLocalOffer', localOffer);
      await pc.setLocalDescription(localOffer);
    },

    /**
     * Respond to remote peer's offer with an answer
     */
    async createAnswer ({ dispatch, commit }) {
       let localAnswer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      commit('setLocalAnswer', localAnswer);
      await pc.setLocalDescription(localAnswer);
    },

    /**
     * Callee receives offer, show notification, then set remote description if accept,
     * and send answer
     */
    async processOffer ({ state, commit, dispatch }, { offer, contact }) {
      if (state.remoteOffer.sdp === offer.sdp) {
        return;
      }

      commit ('setContact', contact);

      try {
         await new Promise((resolve, reject) =>
           commit('setAwaitAccept', { resolve, reject })
         );

        commit('setRemoteOffer', offer);
        await pc.setRemoteDescription(offer);

        await dispatch('createAnswer');

        const message = {
          type: 'answer',
          answer: state.localAnswer,
          id: contact,
        };
        dispatch('signaling/sendMessage', message, { root: true });
      } catch {
        commit ('setContact', null);
      }
    },

    /**
     * Callee receives an answer after sending out an offer
     */
    async processAnswer ({ state, commit }, { answer }) {
      if (state.remoteAnswer.sdp === answer.sdp || pc.signalingState === 'closed') {
        return;
      }

      commit('setRemoteAnswer', answer);
      await pc.setRemoteDescription(answer);
    },

    /**
     * Send ICE candidate to remote peer as we discover them
     */
    onIceCandidate ({ state, commit, dispatch }, { candidate }) {
      if (!candidate || pc.signalingState === 'closed') return;

      commit('addNewIceCandidate', candidate);

      const message = {
        type: 'ice-candidate',
        candidate,
        id: state.contact,
      };
      dispatch('signaling/sendMessage', message, { root: true });
    },

    /**
     * Process ICE candidate from remote peer to add to our pc
     */
    processIceCandidate (context, { candidate }) {
      if (!pc) return;

      switch (pc.signalingState) {
        case 'closed':
          break;
        default:
          candidate && iceCandidateProcessQueue.push(candidate);
          break;
      }
    },

    onSignalingStateChange ({ dispatch, commit }) {
      if (!pc) return;

      commit('setSignalingState', pc.signalingState);

      switch (pc.signalingState) {
        case 'stable':
          dispatch('drainIceCandidateQueue');
          commit('media/setRemoteStream', pc.getRemoteStreams()[0], { root: true });
          break;
        default:
          break;
      }
    },

    hangUp ({ dispatch, state }) {
      const message = {
        type: 'hangup',
        id: state.contact,
      };
      dispatch('signaling/sendMessage', message, { root: true });
      dispatch('media/stopVideoStream', {}, { root: true });
      dispatch('stopVideo');
    },

    async stopVideo ({ state, commit }) {
      if (!pc) return;

      commit('setContact', null);
      iceCandidateProcessQueue = [];
      pc.onnegotiationneeded = null;
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onsignalingstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
      pc = null;
       // todo debugging only
      window._pc = null;

      commit('resetState');
    },

    drainIceCandidateQueue () {
      iceCandidateProcessQueue.forEach((candidate) => {
        pc.addIceCandidate(candidate);
      });
      iceCandidateProcessQueue = [];
    },

    onIceConnectionStateChange ({ commit }) {
      pc && commit('setIceConnectionState', pc.iceConnectionState);
    },

    onConnectionStateChange ({ commit }) {
      pc && commit('setConnectionState', pc.connectionState);
    },

    async toggleVideo ({ dispatch }) {
      if (!pc) return;

      const sender = pc.getSenders().find((sender) =>
        sender.track && sender.track && sender.track.kind === 'video');
      if (!sender) return;

      const track = sender.track;
      if (track.readyState === 'ended') {
        try {
          const media = await dispatch('media/getMedia', { video: true }, {root: true});
          const newTrack = media.getVideoTracks()[0];
          if (!newTrack) {
            console.log('No new track to replace');
            return;
          }

          // stream binded to UI and pc sender stream are decoupled
          // we should update them seperately
          // update pc track without needing to renegotiate
          sender.replaceTrack(newTrack);
          // tell media to update local stream with new video track
          dispatch('media/updateVideoStream', media, { root: true });
        } catch (ex) {
          console.log(`Replace track error: ${ex}`);
        }
      } else {
        track.stop();
      }
    },

    toggleAudio ({ state }) {
      if (!pc) return;

      // should stop track like video
      // but here is just to show another way to pause media streaming
      const sender = pc.getSenders().find((sender) =>
        sender.track && sender.track && sender.track.kind === 'audio');

      if (!sender) return;

      const track = sender.track;
      track.enabled = !track.enabled;
    },
  },

  mutations: {
    setContact (state, payload) {
      state.contact = payload;
    },

    setAwaitAccept (state, payload) {
      state.awaitAccept = payload;
    },

    setLocalOffer (state, payload) {
      state.localOffer = payload;
    },

    setRemoteOffer (state, payload) {
      state.remoteOffer = payload;
    },

    setLocalAnswer (state, payload) {
      state.localAnswer = payload;
    },

    setRemoteAnswer (state, payload) {
      state.remoteAnswer = payload;
    },

    addNewIceCandidate (state, payload) {
      state.iceCandidates.push(payload);
    },

    setIceConnectionState (state, payload) {
      state.iceConnectionState = payload;
    },

    setConnectionState (state, payload) {
      state.connectionState = payload;
    },

    setSignalingState (state, payload) {
      state.signalingState = payload;
    },

    resetState (state) {
      Object.assign(state, getDefaultState())
    },
  },
};

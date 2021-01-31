<template>
  <div>
    <header>
      Me: {{ user }}
      <div>
        Contact:
        <select
          id="users"
          v-model="selectedContact"
        >
          <option
            v-for="user in users"
            :value="user"
          >
            {{ user }}
          </option>
        </select>
      </div>
    </header>
    <div class="video-container">
      <video
        v-if="localVideoSrc"
        id="local-video"
        :srcObject.prop="localVideoSrc"
        autoplay
        muted
      />
      <video
        v-if="remoteVideoSrc"
        id="remote-video"
        :srcObject.prop="remoteVideoSrc"
        autoplay
      />
    </div>
    <footer
      class="video-footer"
    >
      <button
        v-if="selectedContact"
        @click="toggleCall"
      >
        {{ onCall ? 'End Call': 'Make Call' }}
      </button>
      <button
        v-if="onCall"
        @click="toggleVideo"
      >
        {{ videoOn ? 'Mute Video': 'Unmute Video' }}
      </button>
      <button
        v-if="onCall"
        @click="toggleAudio"
      >
        {{ audioOn ? 'Mute Audio': 'Unmute Audio' }}
       </button>
    </footer>
  </div>

</template>

<script>
  export default {
    name: 'Video',

    data () {
      return {
        selectedContact: null,
        videoInvitation: null,
        connectionStates: [],
        iceConnectionStates: [],
        signalingStates: [],
        videoOn: false,
        audioOn: false,
      };
    },

    computed: {
      user () {
        return this.$store.state.signaling.identity;
      },

      contact () {
        return this.$store.state.video.contact;
      },

      onCall () {
        return !!this.contact;
      },

      users () {
        return [null, ...this.$store.state.users.users];
      },

      localVideoSrc () {
        return this.$store.state.media.localStream;
      },

      remoteVideoSrc () {
        return this.$store.state.media.remoteStream;
      },

      hasIncomingVideo () {
        return this.$store.state.video.awaitAccept;
      },
    },

    methods: {
      toggleCall () {
        if (this.onCall) {
          this.$store.dispatch('video/hangUp');
        } else {
          this.$store.dispatch('video/startVideo', { contact: this.selectedContact });
        }
      },

      toggleVideo (toggle) {
        this.$store.dispatch('video/toggleVideo');
        this.videoOn = !this.videoOn;
      },

      toggleAudio (toggle) {
         this.$store.dispatch('video/toggleAudio');
         this.audioOn = !this.audioOn;
      },

      acceptVideo (toast) {
        this.$store.dispatch('video/acceptVideo');
      },

      declineVideo (toast) {
        this.$store.dispatch('video/declineVideo');
      },
    },

    watch: {
      contact (currentContact) {
        this.selectedContact = currentContact;
      },

      users (newUsers) {
        this.selectedContact = newUsers[0];
      },

      localVideoSrc (stream, oldStream) {
        this.videoOn = !!stream;
        this.audioOn = !!stream;
      },

      hasIncomingVideo (accept) {
        if (!accept) return;

        this.videoInvitation = window.confirm(`${this.contact} wants to video with you`);
      },

      videoInvitation (status) {
        if (status) {
          this.acceptVideo();
        } else {
          this.declineVideo();
        }
      },
    },
  }
</script>

<style scoped>
.video-container,
.video-footer {
  display: flex;
}

.video-container video {
  padding-right: 30px;
  margin: 30px 0;
  height: 480px;
  width: 670px;
}

.video-footer {
  justify-content: center;
}

.video-footer button {
  margin-right: 20px;
}
</style>

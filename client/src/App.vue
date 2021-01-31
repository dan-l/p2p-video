<template>
  <div id="app">
    <template
      v-if="userId"
    >
      <webrtc-video />
    </template>
    <template
      v-else
    >
      <button
         @click="startApp"
      >
        Start
      </button>
    </template>
  </div>
</template>

<script>
import WebrtcVideo from './components/WebrtcVideo.vue'

export default {
  name: 'App',

  components: {
    WebrtcVideo,
  },

  computed: {
    userId () {
      // use socket io id as identity
      return this.$store.state.signaling.identity;
    },
  },

  methods: {
    startApp () {
      this.$store.dispatch('signaling/connect');
    },
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: fit-content;
  margin: 60px auto;
}
</style>

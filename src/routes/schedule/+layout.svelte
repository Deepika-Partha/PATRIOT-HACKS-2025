<script>
  export let data;
</script>

<div class="schedule-wrapper">
  <main class="schedule-content">
    <slot />
  </main>
</div>

<style>
  .schedule-wrapper {
    height: calc(100vh - 48px); /* Account for navbar height */
    width: 100vw;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: fixed;
    top: 70px; /* Start below navbar */
    left: 0;
    background: #ffffff;
  }

  .schedule-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    height: 100%;
  }
</style>

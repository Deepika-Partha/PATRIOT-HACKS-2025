<script>
  export let data;
</script>

<div class="schedule-wrapper">
  <header class="schedule-header">
    <h1>Schedule Builder</h1>
  </header>

  <main class="schedule-content">
    <slot />
  </main>
</div>

<style>
  .schedule-wrapper {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: fixed;
    top: 0;
    left: 0;
  }

  .schedule-header {
    background: #0e5bd6;
    color: white;
    padding-top: 1.5em;     
    padding-bottom: 1.5em;   
    padding-left: 2em;
    padding-right: 2em;
    font-size: .5em;
    font-weight: 700;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    flex-shrink: 0;
  }

  .schedule-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
</style>

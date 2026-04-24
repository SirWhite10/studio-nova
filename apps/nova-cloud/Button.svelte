<script>
  let { children, onclick, type = 'button', disabled = false } = $props();
</script>

<button {type} {disabled} onclick={onclick}>
  {@render children()}
</button
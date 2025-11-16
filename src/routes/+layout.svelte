<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import NavBar from '$lib/components/NavBar.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
	
	// Don't show navbar on login/register pages or initial launch page
	const showNav = $derived(
		$page.url.pathname !== '/' && 
		!$page.url.pathname.startsWith('/login') && 
		!$page.url.pathname.startsWith('/register')
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

{#if showNav}
	<NavBar />
{/if}

{@render children()}

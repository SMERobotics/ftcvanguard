<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import teamImage from "#lib/assets/team.png";
	import vanguardLogo from "#lib/assets/vanguardLogo.png"
	import {ClipboardClock, Podium} from "@lucide/svelte";
	import {Avatar, Select} from "@ftcvanguard/design";

	let { children }: LayoutProps = $props();

	const events = [
		{value: "USMOKSKCWLT", label: "KC West League Tournament"},
		{value: "USMOKSKCMM4", label: "Piper Meet @ 1PM"},
	];

	let eventID = $state(events[0].value);
	let currentEvent = $derived(events.find((event) => event.value === eventID));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="flex h-dvh w-full flex-col select-none">
	<div class="flex w-full shrink-0 flex-row relative align-middle bg-chrome border-b-border border-b items-center p-1">
		<div class="flex-row items-center align-middle justify-start p-1 h-full gap-2 select-none hidden lg:flex">
			<img src={vanguardLogo} alt="vanguard logo" class="object-fit h-8 w-auto" />
			<h1 class="font-bold size-5xl">Vanguard</h1>
		</div>
		<Select class="w-[50%] items-center justify-center absolute left-1/2 -translate-x-1/2" items={events} bind:value={eventID}/>
	</div>
	<div class="flex min-h-0 w-full flex-1">
		<div class="flex w-14 shrink-0 flex-col justify-between border-r bg-chrome py-4">
			<div class="grid gap-1">
				<div class="relative grid h-10 place-items-center before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-r-full before:bg-alliance-blue">
					<ClipboardClock class="size-6 transition-transform duration-200 active:scale-95" />
				</div>
				<div class="grid h-10 place-items-center">
					<Podium class="size-6 transition-transform duration-200 active:scale-95" />
				</div>
			</div>
			<div class="grid h-10 place-items-center">
				<Avatar src={teamImage} alt="team image" />
			</div>
		</div>
		{@render children()}
	</div>
</div>
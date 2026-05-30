<script lang="ts">
    import AuthTextField from "./AuthTextField.svelte";

    type Props = {
        value?: string;
        disabled?: boolean;
        id?: string;
    };

    let {
        value = $bindable(""),
        disabled = false,
        id = "team-number",
    }: Props = $props();

    function checkDigits(event: InputEvent) {
        if (event.data && /\D/.test(event.data)) {
            event.preventDefault();
        }
    }

    function sanitizeDigits(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        input.value = input.value.replace(/\D/g, "");
        value = input.value;
    }
</script>

<AuthTextField
    {id}
    label="FTC team number"
    type="text"
    placeholder="26855"
    inputmode="numeric"
    pattern="[0-9]*"
    required
    {disabled}
    bind:value
    onbeforeinput={checkDigits}
    oninput={sanitizeDigits}
/>

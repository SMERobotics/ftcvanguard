export type ViewId = "schedule" | "rankings";

export type ViewDefinition = {
	id: ViewId;
	label: string;
};

export const VIEW_DEFINITIONS: ViewDefinition[] = [
	{ id: "schedule", label: "Schedule" },
	{ id: "rankings", label: "Rankings" },
];

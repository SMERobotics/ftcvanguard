export type ViewId = "schedule" | "rankings" | "about" | "admin" | "logout";

export type ViewDefinition = {
	id: ViewId;
	label: string;
};

export const VIEW_DEFINITIONS: ViewDefinition[] = [
	{ id: "schedule", label: "Schedule" },
	{ id: "rankings", label: "Rankings" },
	{ id: "about", label: "About" },
	{ id: "admin", label: "Admin" },
	{ id: "logout", label: "Logout" }
];

export type ViewId = "schedule" | "rankings" | "settings" | "about" | "admin" | "logout";

export type ViewDefinition = {
	id: ViewId;
	label: string;
};

export const VIEW_DEFINITIONS: ViewDefinition[] = [
	{ id: "schedule", label: "Schedule" },
	{ id: "rankings", label: "Rankings" },
	{ id: "settings", label: "Settings" },
	{ id: "about", label: "About" },
	{ id: "admin", label: "Admin" },
	{ id: "logout", label: "Logout" }
];

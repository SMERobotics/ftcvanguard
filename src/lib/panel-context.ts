export type PanelId = string;

export type PanelContext = {
    isActive: (panel: PanelId) => boolean;
    toggle: (panel: PanelId) => void;
};

export const panelContextKey = Symbol("panel");

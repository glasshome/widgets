export const capitalised = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

export const spaced = (raw: string) => capitalised(raw.replaceAll("_", " "));

export const sortImages = (imgs = []) => [...imgs].sort((a, b) => a.sort_order - b.sort_order);
export const sortSpecs = (s = []) => [...s].sort((a, b) => a.sort_order - b.sort_order);
export const sortVariants = (v = []) => [...v].sort((a, b) => a.sort_order - b.sort_order);
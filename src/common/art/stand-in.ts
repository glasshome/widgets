/** An empty picture whose src names a photo; a stylesheet paints that photo behind it, outside the module the realm compiles. */
export const standIn = (asset: string) =>
  `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20id='${asset}'/%3E`;

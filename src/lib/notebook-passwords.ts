// 4-digit codes for the 3D notebook password gate on the home page.
// This is a playful UI gate, not real access control — the code ships to the
// browser like any client-side check, so don't put anything actually private
// behind it. Change these to whatever you like.
export const NOTEBOOK_PASSWORDS: Record<string, string> = {
  cdp: "4121",
  dcd: "3142",
  dfd: "4104",
  dp: "3141",
};

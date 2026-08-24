/**
 * Generate REKI voucher code
 * Format: "RK-{3 random digits}-{2 random uppercase chars}"
 * Example: "RK-992-TX"
 */
export function generateVoucherCode(): string {
  const digits = Math.floor(100 + Math.random() * 900).toString();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letters = chars.charAt(Math.floor(Math.random() * 26))
    + chars.charAt(Math.floor(Math.random() * 26));
  return `RK-${digits}-${letters}`;
}

/**
 * Generate REKI transaction ID
 * Format: "#REKI-{4 random digits}-MNCH"
 * Example: "#REKI-8829-MNCH"
 */
export function generateTransactionId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `#REKI-${digits}-MNCH`;
}
